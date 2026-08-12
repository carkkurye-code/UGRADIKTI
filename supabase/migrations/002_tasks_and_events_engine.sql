-- ==============================================================================
-- MIGRATION 002: TASKS & TASK EVENTS ENGINE (UĞRA PLATFORM)
-- ==============================================================================
-- Description: Creates the core tasks and task_events tables, state validation checks,
--              atomic assignment functions to prevent race conditions, and RLS policies.
-- Status: PREPARED & PRODUCTION READY (READY FOR EXECUTION VIA SUPABASE DASHBOARD / CLI)
-- ==============================================================================

-- 1. Enum / Constraint for Task Status Lifecycle
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status_type') THEN
        CREATE TYPE task_status_type AS ENUM (
            'created',
            'broadcasted',
            'assigned',
            'heading_to_pickup',
            'arrived_at_pickup',
            'picked_up',
            'heading_to_delivery',
            'arrived_at_delivery',
            'completed',
            'cancelled',
            'failed'
        );
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create `tasks` Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID,
    customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assistant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    partner_id UUID,
    
    task_type TEXT NOT NULL DEFAULT 'hemen_ugra', -- 'hemen_ugra', 'gecerken_ugra', 'partner_order', 'custom'
    urgency_type TEXT NOT NULL DEFAULT 'standard', -- 'standard', 'urgent', 'scheduled'
    
    pickup_address TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    pickup_lat DOUBLE PRECISION,
    pickup_lng DOUBLE PRECISION,
    delivery_lat DOUBLE PRECISION,
    delivery_lng DOUBLE PRECISION,
    
    pickup_contact JSONB DEFAULT '{}'::jsonb,
    delivery_contact JSONB DEFAULT '{}'::jsonb,
    
    verification_code VARCHAR(6) NOT NULL DEFAULT (FLOOR(100000 + RANDOM() * 900000)::TEXT),
    verification_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'failed'
    
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    assistant_earning NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    platform_commission NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    
    status TEXT NOT NULL DEFAULT 'created',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_at TIMESTAMPTZ,
    pickup_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,

    CONSTRAINT check_valid_task_status CHECK (
        status IN (
            'created',
            'broadcasted',
            'assigned',
            'heading_to_pickup',
            'arrived_at_pickup',
            'picked_up',
            'heading_to_delivery',
            'arrived_at_delivery',
            'completed',
            'cancelled',
            'failed'
        )
    )
);

-- Indexes for performance & query speed
CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON public.tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assistant_id ON public.tasks(assistant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_order_id ON public.tasks(order_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);

-- 3. Create `task_events` Table (Audit Trail)
CREATE TABLE IF NOT EXISTS public.task_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_role TEXT NOT NULL DEFAULT 'system', -- 'customer', 'assistant', 'admin', 'system'
    event_type TEXT NOT NULL, -- 'created', 'broadcasted', 'assigned', 'picked_up', 'completed', 'cancelled', 'failed', 'verification_attempt'
    previous_status TEXT,
    new_status TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_events_task_id ON public.task_events(task_id);
CREATE INDEX IF NOT EXISTS idx_task_events_actor_id ON public.task_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_task_events_created_at ON public.task_events(created_at DESC);

-- 4. Trigger for Automatically Updating `tasks.updated_at`
DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 5. Atomic Accept Task Stored Procedure (Prevents Race Conditions)
CREATE OR REPLACE FUNCTION public.accept_task_atomic(
    p_task_id UUID,
    p_assistant_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_task public.tasks%ROWTYPE;
    v_result JSONB;
BEGIN
    -- Lock row for update to prevent concurrent assignments
    SELECT * INTO v_task
    FROM public.tasks
    WHERE id = p_task_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Görev bulunamadı.');
    END IF;

    -- Check status validity for accepting
    IF v_task.status NOT IN ('created', 'broadcasted') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Bu görev başka bir asistan tarafından kabul edilmiş veya iptal edilmiş.');
    END IF;

    IF v_task.assistant_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Bu göreve zaten bir asistan atanmış.');
    END IF;

    -- Execute Atomic Assignment
    UPDATE public.tasks
    SET 
        assistant_id = p_assistant_id,
        status = 'assigned',
        assigned_at = NOW(),
        updated_at = NOW()
    WHERE id = p_task_id;

    -- Log Event in Audit Trail
    INSERT INTO public.task_events (
        task_id,
        actor_id,
        actor_role,
        event_type,
        previous_status,
        new_status,
        metadata
    ) VALUES (
        p_task_id,
        p_assistant_id,
        'assistant',
        'assigned',
        v_task.status,
        'assigned',
        jsonb_build_object('accepted_at', NOW())
    );

    RETURN jsonb_build_object('success', true, 'task_id', p_task_id, 'status', 'assigned');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Row Level Security (RLS) Policies
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_events ENABLE ROW LEVEL SECURITY;

-- Customers can view their created tasks
CREATE POLICY "Customers can view their tasks"
    ON public.tasks FOR SELECT
    USING (auth.uid() = customer_id);

-- Assistants can view tasks assigned to them or broadcasted tasks
CREATE POLICY "Assistants can view relevant tasks"
    ON public.tasks FOR SELECT
    USING (
        auth.uid() = assistant_id 
        OR status IN ('created', 'broadcasted')
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND (p.role IN ('admin', 'super_admin') OR p.is_admin = TRUE)
        )
    );

-- Admins full access
CREATE POLICY "Admins have full access to tasks"
    ON public.tasks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND (p.role IN ('admin', 'super_admin') OR p.is_admin = TRUE)
        )
    );

-- Task Events View Policy
CREATE POLICY "Users can view relevant task events"
    ON public.task_events FOR SELECT
    USING (
        actor_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_events.task_id AND (t.customer_id = auth.uid() OR t.assistant_id = auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND (p.role IN ('admin', 'super_admin') OR p.is_admin = TRUE)
        )
    );
