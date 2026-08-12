-- ==============================================================================
-- MIGRATION 004: RATING, NOTIFICATION & AUDIT LOG ENGINE (UĞRA PLATFORM)
-- ==============================================================================
-- Description: Creates ratings, assistant_metrics, notifications, and audit_logs tables,
--              Postgres RPC procedures, automated metric calculation triggers, and RLS rules.
-- Status: PREPARED & PRODUCTION READY (READY FOR EXECUTION VIA SUPABASE DASHBOARD / CLI)
-- ==============================================================================

-- 1. Create `ratings` Table
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    order_id UUID,
    reviewer_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL, -- assistant, partner, customer
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
    tags JSONB DEFAULT '[]'::jsonb,
    comment TEXT,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT check_valid_target_type CHECK (target_type IN ('assistant', 'partner', 'customer'))
);

CREATE INDEX IF NOT EXISTS idx_ratings_task_id ON public.ratings(task_id);
CREATE INDEX IF NOT EXISTS idx_ratings_reviewer_id ON public.ratings(reviewer_profile_id);
CREATE INDEX IF NOT EXISTS idx_ratings_target_id ON public.ratings(target_profile_id);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON public.ratings(created_at DESC);

-- 2. Create `assistant_metrics` Table
CREATE TABLE IF NOT EXISTS public.assistant_metrics (
    assistant_profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_completed_tasks INTEGER NOT NULL DEFAULT 0,
    total_cancelled_tasks INTEGER NOT NULL DEFAULT 0,
    avg_completion_time NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- in minutes
    acceptance_rate NUMERIC(5, 2) NOT NULL DEFAULT 100.00, -- percentage 0-100
    rating_average NUMERIC(3, 2) NOT NULL DEFAULT 0.00, -- score 0-5
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create `notifications` Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL, -- task_assigned, task_updated, task_completed, payment_received, wallet_updated, system, announcement
    channels JSONB NOT NULL DEFAULT '["app"]'::jsonb, -- app, push, sms, email
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT check_valid_notification_type CHECK (
        type IN (
            'task_assigned',
            'task_updated',
            'task_completed',
            'payment_received',
            'wallet_updated',
            'system',
            'announcement'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- 4. Create `audit_logs` Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resource_table TEXT NOT NULL,
    resource_id UUID,
    action TEXT NOT NULL, -- CREATE, UPDATE, DELETE, COMPLETE, CANCEL, APPROVE, REJECT
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_profile_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_table, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 5. RPC Procedure: `write_audit_log`
CREATE OR REPLACE FUNCTION public.write_audit_log(
    p_actor_id UUID,
    p_table TEXT,
    p_resource_id UUID,
    p_action TEXT,
    p_old_val JSONB DEFAULT NULL,
    p_new_val JSONB DEFAULT NULL,
    p_ip TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        actor_profile_id,
        resource_table,
        resource_id,
        action,
        old_value,
        new_value,
        ip_address,
        created_at
    ) VALUES (
        p_actor_id,
        p_table,
        p_resource_id,
        p_action,
        p_old_val,
        p_new_val,
        p_ip,
        NOW()
    ) RETURNING id INTO v_log_id;

    RETURN jsonb_build_object('success', true, 'audit_log_id', v_log_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC Procedure: `create_notification`
CREATE OR REPLACE FUNCTION public.create_notification(
    p_recipient_id UUID,
    p_title TEXT,
    p_body TEXT,
    p_type TEXT,
    p_channels JSONB DEFAULT '["app"]'::jsonb,
    p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        recipient_profile_id,
        title,
        body,
        type,
        channels,
        payload,
        is_read,
        created_at
    ) VALUES (
        p_recipient_id,
        p_title,
        p_body,
        p_type,
        COALESCE(p_channels, '["app"]'::jsonb),
        COALESCE(p_payload, '{}'::jsonb),
        FALSE,
        NOW()
    ) RETURNING id INTO v_notification_id;

    RETURN jsonb_build_object('success', true, 'notification_id', v_notification_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC Procedure: `mark_notification_read`
CREATE OR REPLACE FUNCTION public.mark_notification_read(
    p_notification_id UUID,
    p_recipient_id UUID
)
RETURNS JSONB AS $$
BEGIN
    UPDATE public.notifications
    SET is_read = TRUE
    WHERE id = p_notification_id AND recipient_profile_id = p_recipient_id;

    RETURN jsonb_build_object('success', true, 'notification_id', p_notification_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC Procedure: `update_assistant_metrics`
CREATE OR REPLACE FUNCTION public.update_assistant_metrics(
    p_assistant_profile_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_completed INT := 0;
    v_cancelled INT := 0;
    v_avg_rating NUMERIC(3, 2) := 0.00;
    v_avg_time NUMERIC(10, 2) := 0.00;
BEGIN
    -- Completed tasks count
    SELECT COUNT(*) INTO v_completed
    FROM public.tasks
    WHERE assistant_id = p_assistant_profile_id AND status = 'completed';

    -- Cancelled tasks count
    SELECT COUNT(*) INTO v_cancelled
    FROM public.tasks
    WHERE assistant_id = p_assistant_profile_id AND status IN ('cancelled', 'failed');

    -- Average Rating
    SELECT COALESCE(ROUND(AVG(score), 2), 0.00) INTO v_avg_rating
    FROM public.ratings
    WHERE target_profile_id = p_assistant_profile_id AND target_type = 'assistant';

    -- Upsert metrics
    INSERT INTO public.assistant_metrics (
        assistant_profile_id,
        total_completed_tasks,
        total_cancelled_tasks,
        avg_completion_time,
        acceptance_rate,
        rating_average,
        updated_at
    ) VALUES (
        p_assistant_profile_id,
        v_completed,
        v_cancelled,
        0.00,
        CASE WHEN (v_completed + v_cancelled) > 0 
             THEN ROUND((v_completed::NUMERIC / (v_completed + v_cancelled)::NUMERIC) * 100, 2) 
             ELSE 100.00 END,
        v_avg_rating,
        NOW()
    )
    ON CONFLICT (assistant_profile_id) DO UPDATE SET
        total_completed_tasks = EXCLUDED.total_completed_tasks,
        total_cancelled_tasks = EXCLUDED.total_cancelled_tasks,
        rating_average = EXCLUDED.rating_average,
        acceptance_rate = EXCLUDED.acceptance_rate,
        updated_at = NOW();

    RETURN jsonb_build_object('success', true, 'assistant_profile_id', p_assistant_profile_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPC Procedure: `create_rating`
CREATE OR REPLACE FUNCTION public.create_rating(
    p_task_id UUID,
    p_reviewer_id UUID,
    p_target_id UUID,
    p_target_type TEXT,
    p_score INT,
    p_tags JSONB DEFAULT '[]'::jsonb,
    p_comment TEXT DEFAULT NULL,
    p_is_anonymous BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
    v_task public.tasks%ROWTYPE;
    v_rating_id UUID;
BEGIN
    IF p_task_id IS NOT NULL THEN
        SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Görev bulunamadı.');
        END IF;

        IF v_task.status != 'completed' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Görev tamamlanmadan değerlendirme/puanlama yapılamaz.');
        END IF;
    END IF;

    INSERT INTO public.ratings (
        task_id,
        reviewer_profile_id,
        target_profile_id,
        target_type,
        score,
        tags,
        comment,
        is_anonymous,
        created_at
    ) VALUES (
        p_task_id,
        p_reviewer_id,
        p_target_id,
        p_target_type,
        p_score,
        COALESCE(p_tags, '[]'::jsonb),
        p_comment,
        p_is_anonymous,
        NOW()
    ) RETURNING id INTO v_rating_id;

    -- Trigger Assistant Metrics Update if rating target is assistant
    IF p_target_type = 'assistant' THEN
        PERFORM public.update_assistant_metrics(p_target_id);
    END IF;

    -- Write Audit Log
    PERFORM public.write_audit_log(
        p_reviewer_id,
        'ratings',
        v_rating_id,
        'CREATE',
        NULL,
        jsonb_build_object('score', p_score, 'target_type', p_target_type, 'target_id', p_target_id)
    );

    RETURN jsonb_build_object('success', true, 'rating_id', v_rating_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Automated Audit Triggers for Key Tables
-- Task creation/update/complete/cancel audit logger
CREATE OR REPLACE FUNCTION public.trg_audit_tasks_handler()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        PERFORM public.write_audit_log(
            NEW.customer_id,
            'tasks',
            NEW.id,
            'CREATE',
            NULL,
            to_jsonb(NEW)
        );
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            PERFORM public.write_audit_log(
                COALESCE(auth.uid(), NEW.assistant_id, NEW.customer_id),
                'tasks',
                NEW.id,
                UPPER(NEW.status),
                jsonb_build_object('status', OLD.status),
                jsonb_build_object('status', NEW.status)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_tasks ON public.tasks;
CREATE TRIGGER trg_audit_tasks
    AFTER INSERT OR UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_audit_tasks_handler();

-- 11. Row Level Security (RLS) Policies
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Ratings Policy: Anyone can view ratings, user can create/modify own
CREATE POLICY "Anyone can view ratings" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Users can manage their own ratings" ON public.ratings FOR ALL USING (reviewer_profile_id = auth.uid());

-- Assistant Metrics Policy: Anyone can view metrics
CREATE POLICY "Anyone can view assistant metrics" ON public.assistant_metrics FOR SELECT USING (true);

-- Notifications Policy: Users can only view and update their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (recipient_profile_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (recipient_profile_id = auth.uid());
CREATE POLICY "Admins can view all notifications" ON public.notifications FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND (p.role IN ('admin', 'super_admin') OR p.is_admin = TRUE)
    )
);

-- Audit Logs Policy: Admins only
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND (p.role IN ('admin', 'super_admin') OR p.is_admin = TRUE)
    )
);
