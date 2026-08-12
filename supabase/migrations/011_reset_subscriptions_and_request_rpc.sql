-- ==============================================================================
-- MIGRATION 011: RESET EXISTING ASSISTANT SUBSCRIPTIONS AND ADD REQUEST RPC
-- ==============================================================================
-- Purpose:
-- 1. Reset status of existing assistant subscriptions to 'inactive' so no assistant
--    has an active subscription automatically.
-- 2. Create secure SECURITY DEFINER RPC function 'request_assistant_subscription'
--    allowing authenticated assistants to submit subscription requests for themselves.
-- ==============================================================================

-- 1. RESET ALL EXISTING ASSISTANT SUBSCRIPTIONS
UPDATE public.assistant_subscriptions
SET status = 'inactive',
    renewal_requested = false,
    renewal_decision = 'pending',
    updated_at = NOW();

-- 2. SECURE RPC FUNCTION FOR ASSISTANT SUBSCRIPTION REQUESTS
CREATE OR REPLACE FUNCTION public.request_assistant_subscription(
    p_assistant_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_user_role TEXT;
    v_target_assistant_id UUID;
    v_sub RECORD;
BEGIN
    -- Check authenticated session
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Yetkisiz erişim: Oturum açmış kullanıcı bulunamadı.';
    END IF;

    -- Check user role from profiles
    SELECT role INTO v_user_role
    FROM public.profiles
    WHERE id = v_uid;

    IF v_user_role IS NULL OR v_user_role != 'assistant' THEN
        RAISE EXCEPTION 'Yetkisiz erişim: Yalnızca asistanlar abonelik talebi gönderebilir.';
    END IF;

    -- Validate target assistant ID (must match auth.uid() or an assistant record owned by auth.uid())
    IF p_assistant_id IS NOT NULL AND p_assistant_id != v_uid THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.assistants
            WHERE (id = p_assistant_id AND user_id = v_uid)
               OR (user_id = p_assistant_id AND id = v_uid)
        ) THEN
            RAISE EXCEPTION 'Yetkisiz erişim: Başka bir asistan adına abonelik talebi gönderilemez.';
        END IF;
        v_target_assistant_id := p_assistant_id;
    ELSE
        v_target_assistant_id := v_uid;
    END IF;

    -- Find existing subscription record
    SELECT * INTO v_sub
    FROM public.assistant_subscriptions
    WHERE assistant_id = v_target_assistant_id
       OR assistant_id IN (
           SELECT id FROM public.assistants WHERE user_id = v_target_assistant_id
           UNION
           SELECT user_id FROM public.assistants WHERE id = v_target_assistant_id
       )
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_sub.id IS NOT NULL THEN
        UPDATE public.assistant_subscriptions
        SET renewal_requested = true,
            renewal_decision = 'pending',
            updated_at = NOW()
        WHERE id = v_sub.id
        RETURNING * INTO v_sub;
    ELSE
        INSERT INTO public.assistant_subscriptions (
            assistant_id,
            status,
            payment_status,
            renewal_requested,
            renewal_decision,
            created_at,
            updated_at
        ) VALUES (
            v_target_assistant_id,
            'inactive',
            'pending',
            true,
            'pending',
            NOW(),
            NOW()
        )
        RETURNING * INTO v_sub;
    END IF;

    RETURN to_jsonb(v_sub);
END;
$$;

-- Revoke permissions from PUBLIC/anon and grant EXECUTE to authenticated role
REVOKE ALL ON FUNCTION public.request_assistant_subscription(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_assistant_subscription(UUID) TO authenticated;

-- Notify PostgREST cache reload
NOTIFY pgrst, 'reload schema';
