-- 008_add_order_id_to_dispatch_tables.sql
-- Safely ensure order_id column, index, and foreign key exist on dispatch_sessions and dispatch_offers tables

-- 1. dispatch_sessions
ALTER TABLE public.dispatch_sessions ADD COLUMN IF NOT EXISTS order_id UUID;

CREATE INDEX IF NOT EXISTS idx_dispatch_sessions_order_id ON public.dispatch_sessions(order_id);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_dispatch_sessions_order' AND table_name = 'dispatch_sessions'
        ) THEN
            ALTER TABLE public.dispatch_sessions 
            ADD CONSTRAINT fk_dispatch_sessions_order 
            FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- 2. dispatch_offers
ALTER TABLE public.dispatch_offers ADD COLUMN IF NOT EXISTS order_id UUID;

CREATE INDEX IF NOT EXISTS idx_dispatch_offers_order_id ON public.dispatch_offers(order_id);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_dispatch_offers_order' AND table_name = 'dispatch_offers'
        ) THEN
            ALTER TABLE public.dispatch_offers 
            ADD CONSTRAINT fk_dispatch_offers_order 
            FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;
