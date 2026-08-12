-- ====================================================
-- UĞRA - MULTI-TENANT SUPABASE COMPLETE DATABASE SETUP SCRIPT
-- Copy and paste this script into the Supabase SQL Editor
-- ====================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE TABLES

-- Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    description TEXT,
    order_index INTEGER DEFAULT 0 NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Partners Table
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    business_name TEXT NOT NULL,
    email TEXT,
    logo TEXT,
    description TEXT,
    phone TEXT,
    address TEXT,
    category TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    working_hours JSONB DEFAULT '{}'::jsonb NOT NULL,
    gallery JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS email TEXT;
DELETE FROM public.partners WHERE email = 'admin@ugra.app' OR business_name = 'Admin Mağazası' OR slug = 'admin-magazasi';

-- Profiles Table (Users & Admins linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' NOT NULL, -- 'admin', 'owner', 'assistant', 'user'
    is_admin BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Assistants Table
CREATE TABLE IF NOT EXISTS public.assistants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    city TEXT NOT NULL,
    vehicle_type TEXT DEFAULT 'motosiklet' NOT NULL, -- 'motosiklet', 'bisiklet', 'arac'
    vehicle_plate TEXT,
    experience TEXT,
    active BOOLEAN DEFAULT false NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('aktif', 'pasif', 'görevde', 'pending', 'suspended')),
    current_location JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL CHECK (price >= 0),
    image TEXT,
    stock INTEGER DEFAULT 0 NOT NULL CHECK (stock >= 0),
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assistant_id UUID REFERENCES public.assistants(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('kapida_nakit', 'kapida_kart', 'online')),
    status TEXT DEFAULT 'beklemede' NOT NULL CHECK (status IN ('beklemede', 'hazirlaniyor', 'yolda', 'tamamlandi', 'iptal')),
    total_price NUMERIC NOT NULL CHECK (total_price >= 0),
    items JSONB DEFAULT '[]'::jsonb NOT NULL,
    notes TEXT,
    archived BOOLEAN DEFAULT false NOT NULL,
    deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Addresses Table
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    district TEXT,
    is_default BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Favorites Table
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'genel' NOT NULL,
    read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Campaigns Table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    discount_rate INTEGER CHECK (discount_rate >= 0 AND discount_rate <= 100),
    banner_url TEXT,
    active BOOLEAN DEFAULT true NOT NULL,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Banners Table
CREATE TABLE IF NOT EXISTS public.banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    link_url TEXT,
    position INTEGER DEFAULT 0 NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'acik' NOT NULL CHECK (status IN ('acik', 'cozuldu', 'iptal')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID,
    partner_name TEXT,
    user_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_partners_slug ON public.partners(slug);
CREATE INDEX IF NOT EXISTS idx_partners_category ON public.partners(category);
CREATE INDEX IF NOT EXISTS idx_products_partner_id ON public.products(partner_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_partner_id ON public.orders(partner_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_partner_id ON public.reviews(partner_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_partner_id ON public.campaigns(partner_id);
CREATE INDEX IF NOT EXISTS idx_banners_partner_id ON public.banners(partner_id);

-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- 4. CREATE TABLES & INDEXES
CREATE TABLE IF NOT EXISTS public.dispatch_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID,
    task_id UUID,
    assistant_id UUID,
    status TEXT NOT NULL DEFAULT 'pending',
    offered_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assistant Subscriptions Table
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

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. ROW LEVEL SECURITY POLICIES

-- Public Read Policies
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Allow public read access to active partners" ON public.partners;
DROP POLICY IF EXISTS "Allow public read access to partners" ON public.partners;
CREATE POLICY "Allow public read access to partners" ON public.partners FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access to active products" ON public.products;
CREATE POLICY "Allow public read access to active products" ON public.products FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Public read active campaigns" ON public.campaigns;
CREATE POLICY "Public read active campaigns" ON public.campaigns FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Public read active banners" ON public.banners;
CREATE POLICY "Public read active banners" ON public.banners FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Public read reviews" ON public.reviews;
CREATE POLICY "Public read reviews" ON public.reviews FOR SELECT USING (true);

-- User Self Management Policies
DROP POLICY IF EXISTS "Allow users to read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.profiles;
CREATE POLICY "Allow users to read profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow public/anon to insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public/anon to manage profiles" ON public.profiles;
CREATE POLICY "Allow public/anon to manage profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow users to manage addresses" ON public.addresses;
CREATE POLICY "Allow users to manage addresses" ON public.addresses FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to manage favorites" ON public.favorites;
CREATE POLICY "Allow users to manage favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to manage notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public/anon select notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public/anon insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public/anon update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public/anon delete notifications" ON public.notifications;

CREATE POLICY "Allow public/anon select notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Allow public/anon insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public/anon update notifications" ON public.notifications FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public/anon delete notifications" ON public.notifications FOR DELETE USING (true);

-- Orders RLS Policies
DROP POLICY IF EXISTS "Allow public/anon to create orders" ON public.orders;
DROP POLICY IF EXISTS "Allow users to view own orders" ON public.orders;
DROP POLICY IF EXISTS "Allow partners to update orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public/anon select orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public/anon insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public/anon update orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public/anon delete orders" ON public.orders;

CREATE POLICY "Allow public/anon select orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow public/anon insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public/anon update orders" ON public.orders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public/anon delete orders" ON public.orders FOR DELETE USING (true);

-- Dispatch Offers RLS Policies
DROP POLICY IF EXISTS "Allow public/anon select dispatch_offers" ON public.dispatch_offers;
DROP POLICY IF EXISTS "Allow public/anon insert dispatch_offers" ON public.dispatch_offers;
DROP POLICY IF EXISTS "Allow public/anon update dispatch_offers" ON public.dispatch_offers;
DROP POLICY IF EXISTS "Allow public/anon delete dispatch_offers" ON public.dispatch_offers;

CREATE POLICY "Allow public/anon select dispatch_offers" ON public.dispatch_offers FOR SELECT USING (true);
CREATE POLICY "Allow public/anon insert dispatch_offers" ON public.dispatch_offers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public/anon update dispatch_offers" ON public.dispatch_offers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public/anon delete dispatch_offers" ON public.dispatch_offers FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow partners to view business profile" ON public.partners;
CREATE POLICY "Allow partners to view business profile" ON public.partners FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow partners to update business profile" ON public.partners;
DROP POLICY IF EXISTS "Allow public/anon to insert partners" ON public.partners;
DROP POLICY IF EXISTS "Allow public/anon to manage partners" ON public.partners;
CREATE POLICY "Allow public/anon to manage partners" ON public.partners FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow partners to manage products" ON public.products;
DROP POLICY IF EXISTS "Allow public/anon to manage products" ON public.products;
CREATE POLICY "Allow public/anon to manage products" ON public.products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow partners to update orders" ON public.orders;
CREATE POLICY "Allow partners to update orders" ON public.orders FOR UPDATE USING (partner_id IN (SELECT partner_id FROM public.profiles WHERE id = auth.uid()) OR partner_id = auth.uid());

-- Admin Global Override Policies
DROP POLICY IF EXISTS "Admin manage all partners" ON public.partners;
CREATE POLICY "Admin manage all partners" ON public.partners FOR ALL USING ((SELECT COALESCE(is_admin, false) FROM public.profiles WHERE id = auth.uid()) = true);

DROP POLICY IF EXISTS "Admin manage all profiles" ON public.profiles;
CREATE POLICY "Admin manage all profiles" ON public.profiles FOR ALL USING ((SELECT COALESCE(is_admin, false) FROM public.profiles WHERE id = auth.uid()) = true);

DROP POLICY IF EXISTS "Admin manage all products" ON public.products;
CREATE POLICY "Admin manage all products" ON public.products FOR ALL USING ((SELECT COALESCE(is_admin, false) FROM public.profiles WHERE id = auth.uid()) = true);

DROP POLICY IF EXISTS "Admin manage all orders" ON public.orders;
CREATE POLICY "Admin manage all orders" ON public.orders FOR ALL USING ((SELECT COALESCE(is_admin, false) FROM public.profiles WHERE id = auth.uid()) = true);

DROP POLICY IF EXISTS "Admin manage all categories" ON public.categories;
CREATE POLICY "Admin manage all categories" ON public.categories FOR ALL USING ((SELECT COALESCE(is_admin, false) FROM public.profiles WHERE id = auth.uid()) = true);

DROP POLICY IF EXISTS "Admin manage all assistants" ON public.assistants;
CREATE POLICY "Admin manage all assistants" ON public.assistants FOR ALL USING ((SELECT COALESCE(is_admin, false) FROM public.profiles WHERE id = auth.uid()) = true);

DROP POLICY IF EXISTS "Admin manage all campaigns" ON public.campaigns;
CREATE POLICY "Admin manage all campaigns" ON public.campaigns FOR ALL USING ((SELECT COALESCE(is_admin, false) FROM public.profiles WHERE id = auth.uid()) = true);

DROP POLICY IF EXISTS "Admin manage all banners" ON public.banners;
CREATE POLICY "Admin manage all banners" ON public.banners FOR ALL USING ((SELECT COALESCE(is_admin, false) FROM public.profiles WHERE id = auth.uid()) = true);

-- Helper function for platform admin check (bypasses profiles RLS safely)
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

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

DROP POLICY IF EXISTS "Admin manage all assistant_subscriptions" ON public.assistant_subscriptions;
CREATE POLICY "Admin manage all assistant_subscriptions" ON public.assistant_subscriptions FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- RPC FUNCTION FOR CREATING SUBSCRIPTION
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

REVOKE ALL ON FUNCTION public.create_assistant_subscription(UUID, TIMESTAMPTZ, TIMESTAMPTZ, NUMERIC, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_assistant_subscription(UUID, TIMESTAMPTZ, TIMESTAMPTZ, NUMERIC, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- 6. STORAGE BUCKETS SETUP
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('products', 'products', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']),
  ('logos', 'logos', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']),
  ('banners', 'banners', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']),
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Public Storage Read" ON storage.objects;
CREATE POLICY "Public Storage Read" ON storage.objects FOR SELECT USING (bucket_id IN ('products', 'logos', 'banners', 'avatars'));

DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('products', 'logos', 'banners', 'avatars') AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE USING (bucket_id IN ('products', 'logos', 'banners', 'avatars') AND auth.role() = 'authenticated');

-- 7. AUTOMATIC SIGNUP TRIGGER FOR AUTH USERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_business_name TEXT;
    v_slug TEXT;
    v_is_admin BOOLEAN;
    v_status TEXT;
    v_active BOOLEAN;
BEGIN
    v_business_name := COALESCE(new.raw_user_meta_data->>'business_name', 'Yeni İşletme');
    v_slug := COALESCE(new.raw_user_meta_data->>'slug', 'isletme-' || substr(new.id::text, 1, 8));
    v_is_admin := COALESCE((new.raw_user_meta_data->>'is_admin')::boolean, false);
    
    IF v_is_admin OR new.email = 'admin@ugra.app' THEN
        v_is_admin := true;
        v_status := 'approved';
        v_active := true;
    ELSE
        v_status := 'pending';
        v_active := false;
    END IF;

    -- Insert into partners if partner metadata provided (and NOT admin)
    IF (new.raw_user_meta_data->>'business_name' IS NOT NULL) AND NOT v_is_admin THEN
      INSERT INTO public.partners (id, slug, business_name, email, active, status)
      VALUES (new.id, v_slug, v_business_name, new.email, v_active, v_status)
      ON CONFLICT (id) DO UPDATE SET
        business_name = EXCLUDED.business_name,
        email = EXCLUDED.email,
        slug = EXCLUDED.slug;
    END IF;

    -- Insert into profiles
    INSERT INTO public.profiles (id, partner_id, full_name, phone, role, is_admin)
    VALUES (
      new.id, 
      CASE WHEN (new.raw_user_meta_data->>'business_name' IS NOT NULL AND NOT v_is_admin) THEN new.id ELSE NULL END, 
      COALESCE(new.raw_user_meta_data->>'full_name', 'Kullanıcı'),
      new.raw_user_meta_data->>'phone',
      CASE WHEN v_is_admin THEN 'admin' WHEN new.raw_user_meta_data->>'business_name' IS NOT NULL THEN 'owner' ELSE 'user' END, 
      v_is_admin
    )
    ON CONFLICT (id) DO UPDATE SET is_admin = EXCLUDED.is_admin;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Realtime
ALTER TABLE public.orders REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Enable RLS Policies for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;
DROP POLICY IF EXISTS "Allow public/anon insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow public/anon select tasks" ON public.tasks;

CREATE POLICY "tasks_select_policy" ON public.tasks FOR SELECT TO public, authenticated, anon USING (true);
CREATE POLICY "tasks_insert_policy" ON public.tasks FOR INSERT TO public, authenticated, anon WITH CHECK (true);
CREATE POLICY "tasks_update_policy" ON public.tasks FOR UPDATE TO public, authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "tasks_delete_policy" ON public.tasks FOR DELETE TO public, authenticated, anon USING (true);
