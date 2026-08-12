-- Supabase Migration for Products Table (product_type, tags, custom_product_type)
-- Safely adds product_type, tags, custom_product_type, category and subcategory columns without losing existing product data.

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_type TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS custom_product_type BOOLEAN DEFAULT FALSE;

-- Backward compatibility update for existing rows
UPDATE public.products 
SET product_type = COALESCE(NULLIF(product_type, ''), NULLIF(subcategory, ''), NULLIF(category, ''), 'Genel')
WHERE product_type IS NULL OR product_type = '';
