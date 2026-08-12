-- ==============================================================================
-- MIGRATION 010: ASSISTANT SUBSCRIPTIONS TABLE & ROW LEVEL SECURITY (RLS)
-- ==============================================================================
-- Purpose:
-- Fixes RLS permission error (401 / 42501) and RPC function error (PGRST202)
-- when Admins or Assistants create subscriptions.
-- 
-- Rules adhered to:
-- 1. RLS is NOT disabled (Row Level Security remains enabled on assistant_subscriptions).
-- 2. No public or anonymous INSERT permission granted.
-- 3. No service_role key placed in client-side code.
-- 4. Uses SECURITY DEFINER RPC function with explicit GRANT EXECUTE to authenticated role.
-- ==============================================================================

-- 1. Ensure table exists without dropping or deleting data
CREATE TABLE IF NOT EXISTS public.assistant_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assistant_id UUID NOT NULL,
    start_date TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    monthly_price NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'active',
    payment_status TEXT DEFAULT 'paid',
    renewal_requested BOOLEAN DEFAULT false,
    renewal_decision TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_assistant_subscriptions_assistant_id 
    ON public.assistant_subscriptions(assistant_id);

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.assistant_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. SECURITY DEFINER HELPER FUNCTION FOR ADMIN CHECK
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_is_admin BOOLEAN := FALSE;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT (role IN ('admin', 'super_admin') OR COALESCE(is_admin, false) = true)
    INTO v_is_admin
    FROM public.profiles
    WHERE id = auth.uid();

    RETURN COALESCE(v_is_admin, FALSE);
END;
$$;

-- Restrict execution of is_platform_admin to authenticated users only
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- 4. CLEAN UP PREVIOUS POLICIES FOR CONFLICT-FREE EXECUTION
DROP POLICY IF EXISTS "Admin manage all assistant_subscriptions" ON public.assistant_subscriptions;
DROP POLICY IF EXISTS "Admins can insert assistant_subscriptions" ON public.assistant_subscriptions;
DROP POLICY IF EXISTS "Admins can update assistant_subscriptions" ON public.assistant_subscriptions;
DROP POLICY IF EXISTS "Admins can select assistant_subscriptions" ON public.assistant_subscriptions;
DROP POLICY IF EXISTS "Admins can delete assistant_subscriptions" ON public.assistant_subscriptions;
DROP POLICY IF EXISTS "Assistants read own subscription" ON public.assistant_subscriptions;
DROP POLICY IF EXISTS "Assistants update own subscription renewal" ON public.assistant_subscriptions;

-- 5. CREATE STRICT RLS POLICIES

-- A. ADMIN POLICY: Full access (INSERT, UPDATE, SELECT, DELETE) ONLY for verified Admins
CREATE POLICY "Admin manage all assistant_subscriptions"
    ON public.assistant_subscriptions
    FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

-- B. ASSISTANT READ POLICY: Assistants can SELECT only their own subscription
CREATE POLICY "Assistants read own subscription"
    ON public.assistant_subscriptions
    FOR SELECT
    TO authenticated
    USING (
        assistant_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.assistants a
            WHERE (a.id = assistant_subscriptions.assistant_id AND a.user_id = auth.uid())
               OR (a.user_id = assistant_subscriptions.assistant_id AND a.id = auth.uid())
        )
    );

-- C. ASSISTANT UPDATE POLICY: Assistants can UPDATE only their own subscription (e.g., requesting renewal)
CREATE POLICY "Assistants update own subscription renewal"
    ON public.assistant_subscriptions
    FOR UPDATE
    TO authenticated
    USING (
        assistant_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.assistants a
            WHERE (a.id = assistant_subscriptions.assistant_id AND a.user_id = auth.uid())
               OR (a.user_id = assistant_subscriptions.assistant_id AND a.id = auth.uid())
        )
    )
    WITH CHECK (
        assistant_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.assistants a
            WHERE (a.id = assistant_subscriptions.assistant_id AND a.user_id = auth.uid())
               OR (a.user_id = assistant_subscriptions.assistant_id AND a.id = auth.uid())
        )
    );

-- 6. SECURE RPC FUNCTION FOR SUBSCRIPTION CREATION
CREATE OR REPLACE FUNCTION public.create_assistant_subscription(
    p_assistant_id UUID,
    p_start_date TIMESTAMPTZ,
    p_expires_at TIMESTAMPTZ,
    p_monthly_price NUMERIC,
    p_payment_status TEXT DEFAULT 'paid',
    p_status TEXT DEFAULT 'active'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_user_role TEXT;
    v_is_admin BOOLEAN := FALSE;
    v_is_valid_assistant BOOLEAN := FALSE;
    v_new_sub RECORD;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Yetkisiz erişim: Kullanıcı oturumu açık değil.';
    END IF;

    v_is_admin := public.is_platform_admin();

    IF NOT v_is_admin THEN
        -- Check if current authenticated user is an assistant creating for themselves
        SELECT role INTO v_user_role
        FROM public.profiles
        WHERE id = v_uid;

        IF v_user_role = 'assistant' THEN
            IF p_assistant_id = v_uid THEN
                v_is_valid_assistant := TRUE;
            ELSE
                SELECT EXISTS (
                    SELECT 1 FROM public.assistants
                    WHERE id = p_assistant_id AND user_id = v_uid
                ) INTO v_is_valid_assistant;
            END IF;
        END IF;

        IF NOT COALESCE(v_is_valid_assistant, FALSE) THEN
            RAISE EXCEPTION 'Yetkisiz erişim: Yalnızca platform yöneticileri veya asistan kendisi adına abonelik oluşturabilir.';
        END IF;
    END IF;

    -- Execute secure INSERT (bypassing table RLS inside SECURITY DEFINER)
    INSERT INTO public.assistant_subscriptions (
        assistant_id,
        start_date,
        expires_at,
        monthly_price,
        payment_status,
        status,
        renewal_requested,
        renewal_decision,
        created_at,
        updated_at
    ) VALUES (
        p_assistant_id,
        p_start_date,
        p_expires_at,
        COALESCE(p_monthly_price, 0),
        COALESCE(p_payment_status, 'paid'),
        COALESCE(p_status, 'active'),
        FALSE,
        'pending',
        NOW(),
        NOW()
    )
    RETURNING * INTO v_new_sub;

    RETURN to_jsonb(v_new_sub);
END;
$$;

-- Explicitly Grant EXECUTE to authenticated users and REVOKE from anon/PUBLIC
REVOKE ALL ON FUNCTION public.create_assistant_subscription(UUID, TIMESTAMPTZ, TIMESTAMPTZ, NUMERIC, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_assistant_subscription(UUID, TIMESTAMPTZ, TIMESTAMPTZ, NUMERIC, TEXT, TEXT) TO authenticated;

-- 7. NOTIFY POSTGREST TO RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
