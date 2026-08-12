-- ==============================================================================
-- MIGRATION 001: UNIFIED PROFILES & AUTHENTICATION (UĞRA PLATFORM)
-- ==============================================================================
-- Description: Sets up the centralized public.profiles table linked 1-to-1 with
--              auth.users, defines triggers for automatic user creation, configures
--              Row Level Security (RLS) policies, and creates linking FKs for role tables.
-- Status: PREPARED & PRODUCTION READY (READY FOR EXECUTION VIA SUPABASE DASHBOARD / CLI)
-- ==============================================================================

-- 1. Create Role Constraint & Types (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_type') THEN
        CREATE TYPE user_role_type AS ENUM ('customer', 'partner', 'assistant', 'admin', 'super_admin');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create Centralized `profiles` Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'customer',
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    partner_id UUID,
    assistant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT check_valid_role CHECK (role IN ('customer', 'partner', 'assistant', 'admin', 'super_admin'))
);

-- Indexing for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_partner_id ON public.profiles(partner_id);
CREATE INDEX IF NOT EXISTS idx_profiles_assistant_id ON public.profiles(assistant_id);

-- 3. Automatic Updated-At Timestamp Trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 4. Automatic Profile Creation Trigger on auth.users Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role_val TEXT;
    user_full_name TEXT;
    user_phone_val TEXT;
BEGIN
    -- Extract metadata if passed during supabase.auth.signUp
    user_role_val := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    user_phone_val := COALESCE(NEW.raw_user_meta_data->>'phone', NULL);

    -- Ensure role fallback safety
    IF user_role_val NOT IN ('customer', 'partner', 'assistant', 'admin', 'super_admin') THEN
        user_role_val := 'customer';
    END IF;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone,
        role,
        is_admin,
        is_active,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        user_full_name,
        user_phone_val,
        user_role_val,
        CASE WHEN user_role_val IN ('admin', 'super_admin') THEN TRUE ELSE FALSE END,
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 5. Row Level Security (RLS) Policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND (p.role IN ('admin', 'super_admin') OR p.is_admin = TRUE)
        )
    );

-- Policy: Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
    ON public.profiles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND (p.role IN ('admin', 'super_admin') OR p.is_admin = TRUE)
        )
    );

-- 6. Linking Foreign Keys for Role Tables (Soft / Optional constraints for non-breaking sync)
-- Enable `user_id` column in `partners` table if not existing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'partners' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.partners ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Enable `user_id` column in `assistants` table if not existing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assistants' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.assistants ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;
