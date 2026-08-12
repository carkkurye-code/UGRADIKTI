-- 013_create_store_order_rpc.sql
-- UĞRA Platform - Secure Store Order Creation RPC
-- Executes with SECURITY DEFINER to bypass direct client INSERT RLS constraints on public.tasks safely.

CREATE OR REPLACE FUNCTION public.create_store_order(
  p_partner_id UUID,
  p_items JSONB,
  p_assistant_fee NUMERIC,
  p_delivery_address TEXT,
  p_delivery_lat NUMERIC DEFAULT NULL,
  p_delivery_lng NUMERIC DEFAULT NULL,
  p_customer_name TEXT DEFAULT '',
  p_customer_phone TEXT DEFAULT '',
  p_customer_note TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_partner_name TEXT;
  v_partner_address TEXT;
  v_partner_active BOOLEAN;
  v_partner_status TEXT;
  v_item JSONB;
  v_product_id UUID;
  v_quantity INT;
  v_product_price NUMERIC;
  v_product_title TEXT;
  v_product_active BOOLEAN;
  v_product_total NUMERIC := 0;
  v_items_summary TEXT := '';
  v_total_price NUMERIC;
  v_base_price NUMERIC;
  v_customer_price NUMERIC;
  v_courier_net NUMERIC;
  v_verification_code TEXT;
  v_task_description TEXT;
  v_task_id UUID;
  v_customer_id UUID;
  v_pickup_address TEXT;
BEGIN
  -- 1. Validate Partner existence, active state and approval status
  IF p_partner_id IS NULL THEN
    RAISE EXCEPTION 'Geçersiz partner ID';
  END IF;

  SELECT business_name, address, active, status
  INTO v_partner_name, v_partner_address, v_partner_active, v_partner_status
  FROM public.partners
  WHERE id = p_partner_id;

  IF v_partner_name IS NULL THEN
    RAISE EXCEPTION 'Partner bulunamadı (ID: %)', p_partner_id;
  END IF;

  IF v_partner_active IS NOT TRUE OR v_partner_status <> 'approved' THEN
    RAISE EXCEPTION 'Seçilen mağaza şu anda aktif değil veya onaylanmamış (% )', v_partner_name;
  END IF;

  -- 2. Validate Items, Product Ownership, Active State & Calculate DB-Verified Product Total
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Sipariş sepeti boş olamaz';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      v_product_id := (v_item->>'product_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Geçersiz ürün ID formatı';
    END;

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'Ürün ID eksik';
    END IF;

    -- Strict quantity check: integer between 1 and 50
    BEGIN
      v_quantity := (v_item->>'quantity')::INT;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Miktar geçerli bir tam sayı olmalıdır';
    END;

    IF v_quantity IS NULL OR v_quantity < 1 OR v_quantity > 50 THEN
      RAISE EXCEPTION 'Geçersiz ürün miktarı (%): Miktar 1 ile 50 arasında olmalıdır', COALESCE(v_quantity, 0);
    END IF;

    -- Query DB price, title, and active state strictly from public.products
    -- Frontend title and price are completely ignored for financial and descriptive integrity
    SELECT title, price, active
    INTO v_product_title, v_product_price, v_product_active
    FROM public.products
    WHERE id = v_product_id AND partner_id = p_partner_id;

    IF v_product_price IS NULL THEN
      RAISE EXCEPTION 'Ürün bulunamadı veya belirtilen mağazaya ait değil (ID: %)', v_product_id;
    END IF;

    IF v_product_active IS NOT TRUE THEN
      RAISE EXCEPTION 'Seçilen ürün (%) şu anda satışta değil', COALESCE(v_product_title, 'Ürün');
    END IF;

    v_product_total := v_product_total + (v_product_price * v_quantity);

    IF v_items_summary <> '' THEN
      v_items_summary := v_items_summary || E'\n';
    END IF;
    v_items_summary := v_items_summary || '• ' || COALESCE(v_product_title, 'Ürün') || ' x' || v_quantity || ' (' || v_product_price || ' ₺)';
  END LOOP;

  -- 3. Validate Assistant Fee (Strict minimum 100 TL requirement)
  IF p_assistant_fee IS NULL OR p_assistant_fee < 100 THEN
    RAISE EXCEPTION 'Asistan hizmet bedeli minimum 100 ₺ olmalıdır';
  END IF;

  -- 4. Calculate Financial Fields safely on DB side
  v_base_price := v_product_total;
  v_courier_net := p_assistant_fee;
  v_customer_price := v_base_price + p_assistant_fee;
  v_total_price := v_customer_price;

  -- 5. Generate 4-digit verification code
  v_verification_code := LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');

  -- 6. Resolve Authenticated User ID (NULL if anonymous)
  v_customer_id := auth.uid();

  -- 7. Format Task Description cleanly
  v_task_description := '[Mağaza Siparişi - ' || COALESCE(v_partner_name, 'Mağaza') || ']' || E'\n\n';
  IF COALESCE(p_customer_name, '') <> '' OR COALESCE(p_customer_phone, '') <> '' THEN
    v_task_description := v_task_description || 'Müşteri: ' || COALESCE(p_customer_name, '') || ' (' || COALESCE(p_customer_phone, '') || ')' || E'\n';
  END IF;
  v_task_description := v_task_description || 'Sipariş İçeriği:' || E'\n' || v_items_summary || E'\n\n';
  v_task_description := v_task_description || 'Ürün Toplamı: ' || v_product_total || ' ₺' || E'\n';
  v_task_description := v_task_description || 'Asistan Hizmet Bedeli: ' || p_assistant_fee || ' ₺' || E'\n';
  v_task_description := v_task_description || 'Genel Toplam: ' || v_total_price || ' ₺';

  IF COALESCE(p_customer_note, '') <> '' THEN
    v_task_description := v_task_description || E'\n\nMüşteri Notu: ' || p_customer_note;
  END IF;

  v_pickup_address := COALESCE(v_partner_address, v_partner_name, 'Mağaza');

  -- 8. Insert into public.tasks using strictly verified production columns only
  INSERT INTO public.tasks (
    customer_id,
    partner_id,
    status,
    task_description,
    pickup_address,
    delivery_address,
    pickup_lat,
    pickup_lng,
    delivery_lat,
    delivery_lng,
    total_price,
    customer_price,
    courier_net,
    base_price,
    verification_code,
    service_type,
    created_at,
    updated_at
  ) VALUES (
    v_customer_id,
    p_partner_id,
    'bekliyor',
    v_task_description,
    v_pickup_address,
    p_delivery_address,
    0,
    0,
    COALESCE(p_delivery_lat, 0),
    COALESCE(p_delivery_lng, 0),
    v_total_price,
    v_customer_price,
    v_courier_net,
    v_base_price,
    v_verification_code,
    'asistan_siparis',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_task_id;

  RETURN jsonb_build_object(
    'success', true,
    'task_id', v_task_id,
    'status', 'bekliyor',
    'total_price', v_total_price,
    'customer_price', v_customer_price,
    'courier_net', v_courier_net,
    'base_price', v_base_price,
    'verification_code', v_verification_code,
    'service_type', 'asistan_siparis',
    'task_description', v_task_description
  );
END;
$$;

-- Revoke default public access and explicitly grant execution permissions
REVOKE ALL ON FUNCTION public.create_store_order(UUID, JSONB, NUMERIC, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_store_order(UUID, JSONB, NUMERIC, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT) TO anon, authenticated;
