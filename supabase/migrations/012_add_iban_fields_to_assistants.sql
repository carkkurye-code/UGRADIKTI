-- 012_add_iban_fields_to_assistants.sql
-- Add IBAN details columns to assistants table

ALTER TABLE public.assistants
ADD COLUMN IF NOT EXISTS account_holder TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS iban TEXT;
