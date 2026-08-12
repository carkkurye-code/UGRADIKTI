-- ==============================================================================
-- UĞRA PLATFORM - AUTH & PROFILES TRIGGER CONFIGURATION
-- ==============================================================================

-- Trigger function: Creates or updates public.profiles automatically when auth.users is populated
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role_val TEXT;
    user_full_name TEXT;
    user_phone_val TEXT;
BEGIN
    user_role_val := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    user_phone_val := COALESCE(NEW.raw_user_meta_data->>'phone', NULL);

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

-- Bind Trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
