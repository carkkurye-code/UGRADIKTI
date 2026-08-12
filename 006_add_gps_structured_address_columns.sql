-- 006_add_gps_structured_address_columns.sql
-- Run this script in Supabase SQL Editor to add high-accuracy GPS & structured address columns to the orders table

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS accuracy DOUBLE PRECISION;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS place_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_lat DOUBLE PRECISION;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_lng DOUBLE PRECISION;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION;

-- Comment on columns for clarity
COMMENT ON COLUMN public.orders.latitude IS 'Görünür / Alınacak noktanın GPS enlemi';
COMMENT ON COLUMN public.orders.longitude IS 'Görünür / Alınacak noktanın GPS boylamı';
COMMENT ON COLUMN public.orders.accuracy IS 'GPS hassasiyet derecesi (metre cinsinden)';
COMMENT ON COLUMN public.orders.place_id IS 'OpenStreetMap / Google Maps yer kimliği';
COMMENT ON COLUMN public.orders.street IS 'Sokak / Cadde adı';
COMMENT ON COLUMN public.orders.district IS 'Mahalle / İlçe';
COMMENT ON COLUMN public.orders.city IS 'Şehir / İl';
COMMENT ON COLUMN public.orders.province IS 'Vilayet / Bölge';
COMMENT ON COLUMN public.orders.postal_code IS 'Posta Kodu';
COMMENT ON COLUMN public.orders.pickup_lat IS 'Alım noktasının GPS enlemi';
COMMENT ON COLUMN public.orders.pickup_lng IS 'Alım noktasının GPS boylamı';
COMMENT ON COLUMN public.orders.delivery_lat IS 'Teslimat noktasının GPS enlemi';
COMMENT ON COLUMN public.orders.delivery_lng IS 'Teslimat noktasının GPS boylamı';
