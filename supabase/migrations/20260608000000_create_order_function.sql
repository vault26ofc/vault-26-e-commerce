-- Server-side order creation: validates prices from DB, prevents client-side price manipulation
CREATE OR REPLACE FUNCTION public.create_order(
  p_user_id   UUID,
  p_email     TEXT,
  p_shipping_address JSONB,
  p_items     JSONB,   -- [{variant_id: uuid, quantity: int}]
  p_coupon_code TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'RAZORPAY'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id            UUID;
  v_subtotal            NUMERIC(10,2) := 0;
  v_discount            NUMERIC(10,2) := 0;
  v_shipping            NUMERIC(10,2) := 79;
  v_free_threshold      NUMERIC(10,2) := 999;
  v_cod_threshold       NUMERIC(10,2) := 2000;
  v_cod_advance_pct     NUMERIC(10,2) := 20;
  v_total               NUMERIC(10,2);
  v_cod_advance         NUMERIC(10,2) := 0;
  v_coupon              RECORD;
  v_elem                JSONB;
  v_variant_id          UUID;
  v_qty                 INT;
  v_price               NUMERIC(10,2);
  v_stock               INT;
  v_product_name        TEXT;
  v_product_image       TEXT;
  v_variant_label       TEXT;
  v_result              RECORD;
BEGIN
  -- Prevent creating orders on behalf of another user
  IF p_user_id IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: user_id mismatch';
  END IF;

  -- Load configurable settings (fall back to defaults if missing)
  SELECT COALESCE((SELECT (value#>>'{}')::NUMERIC FROM settings WHERE key = 'free_shipping_threshold'), 999)
    INTO v_free_threshold;
  SELECT COALESCE((SELECT (value#>>'{}')::NUMERIC FROM settings WHERE key = 'shipping_fee'), 79)
    INTO v_shipping;
  SELECT COALESCE((SELECT (value#>>'{}')::NUMERIC FROM settings WHERE key = 'cod_threshold'), 2000)
    INTO v_cod_threshold;
  SELECT COALESCE((SELECT (value#>>'{}')::NUMERIC FROM settings WHERE key = 'cod_advance_percent'), 20)
    INTO v_cod_advance_pct;

  -- Validate items and sum subtotal using ACTUAL variant prices from DB
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_variant_id := (v_elem->>'variant_id')::UUID;
    v_qty        := (v_elem->>'quantity')::INT;

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity for variant %', v_variant_id;
    END IF;

    SELECT
      pv.price,
      pv.stock,
      p.name,
      p.images[1],
      NULLIF(TRIM(COALESCE(pv.size,'') || CASE WHEN pv.size IS NOT NULL AND pv.color IS NOT NULL THEN ' · ' ELSE '' END || COALESCE(pv.color,'')), '')
    INTO v_price, v_stock, v_product_name, v_product_image, v_variant_label
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE pv.id = v_variant_id
      AND p.is_active = TRUE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variant % not found or product is inactive', v_variant_id;
    END IF;

    IF v_stock < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for % (available: %, requested: %)', v_product_name, v_stock, v_qty;
    END IF;

    v_subtotal := v_subtotal + (v_price * v_qty);
  END LOOP;

  IF v_subtotal <= 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  -- Free shipping when subtotal meets threshold
  IF v_subtotal >= v_free_threshold THEN
    v_shipping := 0;
  END IF;

  -- Validate and apply coupon server-side
  IF p_coupon_code IS NOT NULL AND LENGTH(TRIM(p_coupon_code)) > 0 THEN
    SELECT * INTO v_coupon
    FROM coupons
    WHERE code = UPPER(TRIM(p_coupon_code))
      AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (max_uses IS NULL OR used_count < max_uses);

    IF FOUND AND v_subtotal >= v_coupon.min_order THEN
      IF v_coupon.type = 'PERCENT' THEN
        v_discount := LEAST(ROUND(v_subtotal * v_coupon.value / 100, 2), v_subtotal);
      ELSE
        v_discount := LEAST(v_coupon.value, v_subtotal);
      END IF;
      -- Increment coupon usage count
      UPDATE coupons SET used_count = used_count + 1 WHERE id = v_coupon.id;
    END IF;
  END IF;

  v_total := GREATEST(v_subtotal - v_discount, 0) + v_shipping;

  -- COD advance for high-value orders
  IF p_payment_method = 'COD' AND v_total > v_cod_threshold THEN
    v_cod_advance := ROUND(v_total * v_cod_advance_pct / 100, 2);
  END IF;

  -- Insert order with server-validated totals
  INSERT INTO orders (
    user_id, email, shipping_address,
    subtotal, discount, shipping, total,
    payment_method, payment_status,
    cod_advance_amount, coupon_code
  ) VALUES (
    p_user_id, p_email, p_shipping_address,
    v_subtotal, v_discount, v_shipping, v_total,
    p_payment_method::payment_method, 'PENDING',
    v_cod_advance, NULLIF(TRIM(COALESCE(p_coupon_code,'')), '')
  )
  RETURNING id INTO v_order_id;

  -- Insert order_items with ACTUAL prices (not client-provided)
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_variant_id := (v_elem->>'variant_id')::UUID;
    v_qty        := (v_elem->>'quantity')::INT;

    SELECT
      pv.price,
      p.name,
      p.images[1],
      NULLIF(TRIM(COALESCE(pv.size,'') || CASE WHEN pv.size IS NOT NULL AND pv.color IS NOT NULL THEN ' · ' ELSE '' END || COALESCE(pv.color,'')), '')
    INTO v_price, v_product_name, v_product_image, v_variant_label
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE pv.id = v_variant_id;

    INSERT INTO order_items (order_id, variant_id, product_name, variant_label, image, quantity, price_at_purchase)
    VALUES (v_order_id, v_variant_id, v_product_name, v_variant_label, v_product_image, v_qty, v_price);
  END LOOP;

  -- Return the validated order data
  SELECT * INTO v_result FROM orders WHERE id = v_order_id;

  RETURN jsonb_build_object(
    'id',               v_result.id,
    'order_number',     v_result.order_number,
    'subtotal',         v_result.subtotal,
    'discount',         v_result.discount,
    'shipping',         v_result.shipping,
    'total',            v_result.total,
    'payment_method',   v_result.payment_method,
    'payment_status',   v_result.payment_status,
    'cod_advance_amount', v_result.cod_advance_amount
  );
END;
$$;

-- Grant execute to anon and authenticated (RLS still applies via auth.uid() check inside function)
GRANT EXECUTE ON FUNCTION public.create_order(UUID, TEXT, JSONB, JSONB, TEXT, TEXT) TO anon, authenticated;
