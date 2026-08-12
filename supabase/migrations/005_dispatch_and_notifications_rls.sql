-- ==============================================================================
-- RLS POLICIES FOR NOTIFICATIONS, DISPATCH_OFFERS, DISPATCH_SESSIONS, ASSISTANTS
-- ==============================================================================

-- 1. Ensure Tables Exist
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_profile_id UUID,
    recipient_id UUID,
    user_id UUID,
    title TEXT,
    body TEXT,
    message TEXT,
    type TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dispatch_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID,
    task_id UUID,
    assistant_id UUID,
    status TEXT NOT NULL DEFAULT 'pending',
    offered_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dispatch_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID,
    task_id UUID,
    assistant_id UUID,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assistants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    full_name TEXT,
    phone TEXT,
    city TEXT,
    district TEXT,
    status TEXT DEFAULT 'active',
    is_online BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistants ENABLE ROW LEVEL SECURITY;

-- 3. Drop Existing Policies
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;
DROP POLICY IF EXISTS "Allow users to manage notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public/anon select notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public/anon insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public/anon update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public/anon delete notifications" ON public.notifications;

DROP POLICY IF EXISTS "dispatch_offers_select_policy" ON public.dispatch_offers;
DROP POLICY IF EXISTS "dispatch_offers_insert_policy" ON public.dispatch_offers;
DROP POLICY IF EXISTS "dispatch_offers_update_policy" ON public.dispatch_offers;
DROP POLICY IF EXISTS "dispatch_offers_delete_policy" ON public.dispatch_offers;
DROP POLICY IF EXISTS "Allow public/anon select dispatch_offers" ON public.dispatch_offers;
DROP POLICY IF EXISTS "Allow public/anon insert dispatch_offers" ON public.dispatch_offers;
DROP POLICY IF EXISTS "Allow public/anon update dispatch_offers" ON public.dispatch_offers;
DROP POLICY IF EXISTS "Allow public/anon delete dispatch_offers" ON public.dispatch_offers;

DROP POLICY IF EXISTS "dispatch_sessions_select_policy" ON public.dispatch_sessions;
DROP POLICY IF EXISTS "dispatch_sessions_insert_policy" ON public.dispatch_sessions;
DROP POLICY IF EXISTS "dispatch_sessions_update_policy" ON public.dispatch_sessions;
DROP POLICY IF EXISTS "dispatch_sessions_delete_policy" ON public.dispatch_sessions;

DROP POLICY IF EXISTS "assistants_select_policy" ON public.assistants;
DROP POLICY IF EXISTS "assistants_insert_policy" ON public.assistants;
DROP POLICY IF EXISTS "assistants_update_policy" ON public.assistants;
DROP POLICY IF EXISTS "assistants_delete_policy" ON public.assistants;
DROP POLICY IF EXISTS "Admin manage all assistants" ON public.assistants;

-- 4. Create RLS Policies for `notifications`
CREATE POLICY "notifications_select_policy" ON public.notifications FOR SELECT TO public, authenticated, anon USING (true);
CREATE POLICY "notifications_insert_policy" ON public.notifications FOR INSERT TO public, authenticated, anon WITH CHECK (true);
CREATE POLICY "notifications_update_policy" ON public.notifications FOR UPDATE TO public, authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "notifications_delete_policy" ON public.notifications FOR DELETE TO public, authenticated, anon USING (true);

-- 5. Create RLS Policies for `dispatch_offers`
CREATE POLICY "dispatch_offers_select_policy" ON public.dispatch_offers FOR SELECT TO public, authenticated, anon USING (true);
CREATE POLICY "dispatch_offers_insert_policy" ON public.dispatch_offers FOR INSERT TO public, authenticated, anon WITH CHECK (true);
CREATE POLICY "dispatch_offers_update_policy" ON public.dispatch_offers FOR UPDATE TO public, authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "dispatch_offers_delete_policy" ON public.dispatch_offers FOR DELETE TO public, authenticated, anon USING (true);

-- 6. Create RLS Policies for `dispatch_sessions`
CREATE POLICY "dispatch_sessions_select_policy" ON public.dispatch_sessions FOR SELECT TO public, authenticated, anon USING (true);
CREATE POLICY "dispatch_sessions_insert_policy" ON public.dispatch_sessions FOR INSERT TO public, authenticated, anon WITH CHECK (true);
CREATE POLICY "dispatch_sessions_update_policy" ON public.dispatch_sessions FOR UPDATE TO public, authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "dispatch_sessions_delete_policy" ON public.dispatch_sessions FOR DELETE TO public, authenticated, anon USING (true);

-- 7. Create RLS Policies for `assistants`
CREATE POLICY "assistants_select_policy" ON public.assistants FOR SELECT TO public, authenticated, anon USING (true);
CREATE POLICY "assistants_insert_policy" ON public.assistants FOR INSERT TO public, authenticated, anon WITH CHECK (true);
CREATE POLICY "assistants_update_policy" ON public.assistants FOR UPDATE TO public, authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "assistants_delete_policy" ON public.assistants FOR DELETE TO public, authenticated, anon USING (true);

-- 8. Create RLS Policies for `tasks`
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
