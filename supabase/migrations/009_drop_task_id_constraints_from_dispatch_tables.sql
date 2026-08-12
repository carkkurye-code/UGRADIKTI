-- 009_drop_task_id_constraints_from_dispatch_tables.sql
-- Safely remove NOT NULL constraints and foreign key constraints on task_id for dispatch_sessions and dispatch_offers tables

-- 1. dispatch_sessions
ALTER TABLE public.dispatch_sessions ALTER COLUMN task_id DROP NOT NULL;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT kcu.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = 'dispatch_sessions'
          AND kcu.column_name = 'task_id'
    ) LOOP
        EXECUTE 'ALTER TABLE public.dispatch_sessions DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

-- 2. dispatch_offers
ALTER TABLE public.dispatch_offers ALTER COLUMN task_id DROP NOT NULL;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT kcu.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = 'dispatch_offers'
          AND kcu.column_name = 'task_id'
    ) LOOP
        EXECUTE 'ALTER TABLE public.dispatch_offers DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;
