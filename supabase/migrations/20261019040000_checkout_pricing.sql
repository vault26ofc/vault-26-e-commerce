-- Checkout pricing lives on the server: quote_order prices the bag (subtotal → coupon → shipping
-- → total, COD rules), available_coupons lists the codes a shopper can apply, and create_order
-- saves exactly what quote_order priced. The browser's prices never count.

insert into public.settings (key, value) values ('cod_enabled', 'true'::jsonb) on conflict (key) do nothing;

alter table public.brand_settings
  add column if not exists social_whatsapp text,
  add column if not exists social_youtube text,
  add column if not exists support_hours text;

-- Friendly text for a coupon refusal (shown at checkout and raised by create_order).
create or replace function public.coupon_reason_text(p_reason text, p_code text, p_min numeric default null)
returns text language sql immutable as $$
  select case p_reason
    when 'not_found' then 'Coupon ' || p_code || ' doesn''t exist'
    when 'inactive' then 'Coupon ' || p_code || ' is switched off'
    when 'not_started' then 'Coupon ' || p_code || ' isn''t active yet'
    when 'expired' then 'Coupon ' || p_code || ' has expired'
    when 'login_required' then 'Sign in to use coupon ' || p_code
    when 'already_used' then 'You have already used coupon ' || p_code
    when 'limit_reached' then 'Coupon ' || p_code || ' has been fully redeemed'
    when 'first_order_only' then 'Coupon ' || p_code || ' is for your first order only'
    when 'not_applicable' then 'Coupon ' || p_code || ' doesn''t apply to anything in your bag'
    when 'min_order' then 'Coupon ' || p_code || ' needs ₹' || coalesce(trim(to_char(p_min, 'FM99999990')), '0') || ' of eligible items'
    else 'Coupon ' || p_code || ' can''t be used'
  end;
$$;

-- p_items: [{ variant_id, quantity | qty }]. Never raises for an unavailable line — it is listed in
-- `unavailable` and left out of the totals, so the bag can still be shown.
create or replace function public.quote_order(p_items jsonb, p_coupon_code text default null, p_payment_method text default 'RAZORPAY')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_lines jsonb := '[]'::jsonb;
  v_unavailable jsonb := '[]'::jsonb;
  v_subtotal numeric(10,2) := 0;
  v_discount numeric(10,2) := 0;
  v_fee numeric(10,2);
  v_free numeric(10,2);
  v_shipping numeric(10,2);
  v_total numeric(10,2);
  v_cod_enabled boolean;
  v_cod_min numeric(10,2);
  v_cod_pct numeric(10,2);
  v_cod jsonb;
  v_coupon_row coupons;
  v_coupon jsonb := null;
  v_code text := nullif(upper(trim(coalesce(p_coupon_code, ''))), '');
  r record;
begin
  select coalesce((select (value#>>'{}')::numeric from settings where key = 'shipping_fee'), 79) into v_fee;
  select coalesce((select (value#>>'{}')::numeric from settings where key = 'free_shipping_threshold'), 999) into v_free;
  select coalesce((select (value#>>'{}')::boolean from settings where key = 'cod_enabled'), true) into v_cod_enabled;
  select coalesce((select (value#>>'{}')::numeric from settings where key = 'cod_min_order'), 0) into v_cod_min;
  select coalesce((select (value#>>'{}')::numeric from settings where key = 'cod_advance_percent'), 20) into v_cod_pct;

  for r in
    select i.variant_id, i.qty, v.id as vid, v.price, v.stock, v.size, v.color, p.id as product_id, p.name, p.slug, p.is_active,
           coalesce(p.color_images->(v.color)->>0, p.images[1]) as image
    from (
      select (e->>'variant_id')::uuid as variant_id, sum(coalesce((e->>'quantity')::int, (e->>'qty')::int, 0)) as qty, min(n) as n
      from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality t(e, n)
      group by 1
    ) i
    left join product_variants v on v.id = i.variant_id
    left join products p on p.id = v.product_id
    order by i.n
  loop
    if r.qty < 1 or r.qty > 99 then raise exception 'Quantity must be between 1 and 99'; end if;
    if r.vid is null or not r.is_active then
      v_unavailable := v_unavailable || jsonb_build_object('variant_id', r.variant_id, 'reason', 'unavailable', 'available', 0, 'requested', r.qty);
      continue;
    end if;
    if r.stock < r.qty then
      v_unavailable := v_unavailable || jsonb_build_object('variant_id', r.variant_id, 'reason', 'stock', 'available', greatest(r.stock, 0),
                                                           'requested', r.qty, 'name', r.name);
      continue;
    end if;
    v_lines := v_lines || jsonb_build_object(
      'variant_id', r.vid, 'product_id', r.product_id, 'name', r.name, 'slug', r.slug, 'size', r.size, 'color', r.color,
      'image', r.image, 'price', r.price, 'quantity', r.qty, 'amount', r.price * r.qty);
    v_subtotal := v_subtotal + r.price * r.qty;
  end loop;

  if v_code is not null then
    select * into v_coupon_row from coupons where code = v_code;
    if not found then
      v_coupon := jsonb_build_object('ok', false, 'code', v_code, 'reason', 'not_found', 'discount', 0);
    else
      v_coupon := public.coupon_evaluate(v_coupon_row, v_user, v_lines);
    end if;
    if (v_coupon->>'ok')::boolean then
      v_discount := least((v_coupon->>'discount')::numeric, v_subtotal);
    end if;
    v_coupon := v_coupon || jsonb_build_object('message',
      case when (v_coupon->>'ok')::boolean then null
           else public.coupon_reason_text(v_coupon->>'reason', v_code, (v_coupon->>'min_order')::numeric) end);
  end if;

  -- Free shipping is judged on what's left after the coupon.
  v_shipping := case when v_subtotal <= 0 or v_subtotal - v_discount >= v_free then 0 else v_fee end;
  v_total := greatest(v_subtotal - v_discount, 0) + v_shipping;

  v_cod := jsonb_build_object(
    'allowed', v_cod_enabled and (v_cod_min <= 0 or v_total >= v_cod_min),
    'reason', case when not v_cod_enabled then 'disabled' when v_cod_min > 0 and v_total < v_cod_min then 'min_order' end,
    'min_order', v_cod_min, 'advance_percent', v_cod_pct,
    'advance', case when v_cod_pct > 0 then round(v_total * v_cod_pct / 100, 2) else 0 end);

  return jsonb_build_object(
    'lines', v_lines, 'unavailable', v_unavailable,
    'subtotal', v_subtotal, 'coupon', v_coupon, 'discount', v_discount,
    'shipping', v_shipping, 'shipping_fee', v_fee, 'free_shipping_threshold', v_free,
    'total', v_total, 'cod', v_cod,
    'payment_method', case when p_payment_method = 'COD' then 'COD' else 'RAZORPAY' end);
end $$;

-- The checkout "Apply coupon" list: live general coupons plus the shopper's own codes, each priced
-- against the bag. Usable first, biggest saving first; the rest say why they can't be used yet.
create or replace function public.available_coupons(p_items jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_lines jsonb := public.quote_order(p_items, null)->'lines';
begin
  return coalesce((
    select jsonb_agg(x.j order by (x.j->>'ok')::boolean desc, (x.j->>'discount')::numeric desc, x.j->>'code')
    from (
      select jsonb_build_object(
        'code', c.code, 'kind', c.kind, 'personal', c.assigned_user_id is not null,
        'type', c.type, 'value', c.value, 'max_discount', c.max_discount, 'min_order', c.min_order,
        'expires_at', c.expires_at, 'first_order_only', c.first_order_only,
        'ok', coalesce((e.r->>'ok')::boolean, false), 'reason', e.r->>'reason',
        'discount', coalesce((e.r->>'discount')::numeric, 0),
        'message', case when (e.r->>'ok')::boolean then null
                        else public.coupon_reason_text(e.r->>'reason', c.code, (e.r->>'min_order')::numeric) end) as j
      from coupons c
      cross join lateral (select public.coupon_evaluate(c, v_user, v_lines) as r) e
      where c.is_active
        and (c.starts_at is null or c.starts_at <= now())
        and (c.expires_at is null or c.expires_at > now())
        and (c.max_uses is null or c.used_count < c.max_uses)
        and ((c.kind = 'general' and c.assigned_user_id is null and c.is_listed) or (v_user is not null and c.assigned_user_id = v_user))
        and coalesce(e.r->>'reason', '') not in ('not_found', 'already_used', 'limit_reached', 'first_order_only')
    ) x
  ), '[]'::jsonb);
end $$;

-- Same signature as before (the razorpay-create-order edge function reads the saved order, not
-- this function, so it needs no change). Saves exactly what quote_order priced.
create or replace function public.create_order(p_user_id uuid, p_email text, p_shipping_address jsonb, p_items jsonb,
  p_coupon_code text default null, p_payment_method text default 'RAZORPAY')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_q jsonb;
  v_bad jsonb;
  v_order_id uuid;
  v_line jsonb;
  v_code text := nullif(upper(trim(coalesce(p_coupon_code, ''))), '');
  v_result record;
begin
  if p_user_id is not null and p_user_id is distinct from auth.uid() then
    raise exception 'Unauthorized: user_id mismatch';
  end if;
  if p_payment_method not in ('RAZORPAY', 'COD') then raise exception 'Invalid payment method'; end if;

  v_q := public.quote_order(p_items, v_code, p_payment_method);

  if jsonb_array_length(v_q->'unavailable') > 0 then
    v_bad := v_q->'unavailable'->0;
    if v_bad->>'reason' = 'stock' then
      raise exception 'Insufficient stock for % (available: %, requested: %)', v_bad->>'name', v_bad->>'available', v_bad->>'requested';
    end if;
    raise exception 'An item in your bag is no longer available';
  end if;
  if jsonb_array_length(v_q->'lines') = 0 or (v_q->>'subtotal')::numeric <= 0 then
    raise exception 'Order must contain at least one item';
  end if;
  if v_code is not null and not coalesce((v_q->'coupon'->>'ok')::boolean, false) then
    raise exception '%. Remove it to continue.', v_q->'coupon'->>'message';
  end if;
  if p_payment_method = 'COD' and not (v_q->'cod'->>'allowed')::boolean then
    if v_q->'cod'->>'reason' = 'min_order' then
      raise exception 'COD is available on orders of ₹% or more', v_q->'cod'->>'min_order';
    end if;
    raise exception 'Cash on delivery is not available right now';
  end if;

  insert into orders (user_id, email, shipping_address, subtotal, discount, shipping, total,
                      payment_method, payment_status, cod_advance_amount, coupon_code)
  values (p_user_id, p_email, p_shipping_address,
          (v_q->>'subtotal')::numeric, (v_q->>'discount')::numeric, (v_q->>'shipping')::numeric, (v_q->>'total')::numeric,
          p_payment_method::payment_method, 'PENDING',
          case when p_payment_method = 'COD' then (v_q->'cod'->>'advance')::numeric else 0 end,
          case when (v_q->>'discount')::numeric > 0 then v_code end)
  returning id into v_order_id;

  for v_line in select * from jsonb_array_elements(v_q->'lines') loop
    insert into order_items (order_id, variant_id, product_name, variant_label, image, quantity, price_at_purchase)
    values (v_order_id, (v_line->>'variant_id')::uuid, v_line->>'name',
            nullif(concat_ws(' · ', nullif(v_line->>'size', ''), nullif(v_line->>'color', '')), ''),
            v_line->>'image', (v_line->>'quantity')::int, (v_line->>'price')::numeric);
  end loop;

  select * into v_result from orders where id = v_order_id;
  return jsonb_build_object(
    'id', v_result.id, 'order_number', v_result.order_number,
    'subtotal', v_result.subtotal, 'discount', v_result.discount, 'shipping', v_result.shipping,
    'total', v_result.total, 'payment_method', v_result.payment_method,
    'payment_status', v_result.payment_status, 'cod_advance_amount', v_result.cod_advance_amount);
end $$;

-- Payment confirmed: take stock, count the coupon and record the redemption. Unchanged otherwise
-- (a line that sold out meanwhile raises OUT_OF_STOCK and the edge function refunds the payment).
create or replace function public.confirm_order_payment(p_order_id uuid, p_payment_id text, p_amount_paise integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_order orders%rowtype;
  v_item record;
  v_updated int;
  v_coupon_id uuid;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if v_order.razorpay_payment_id is not null then
    if v_order.razorpay_payment_id = p_payment_id then return jsonb_build_object('ok', true, 'already', true); end if;
    raise exception 'ALREADY_CONFIRMED';
  end if;
  if v_order.payment_status <> 'PENDING' or v_order.status = 'CANCELLED' or v_order.cod_advance_paid then
    raise exception 'NOT_PENDING';
  end if;

  perform set_stock_context('order', p_order_id);
  for v_item in select variant_id, quantity from order_items where order_id = p_order_id loop
    update product_variants set stock = stock - v_item.quantity
    where id = v_item.variant_id and stock >= v_item.quantity;
    get diagnostics v_updated = row_count;
    if v_updated = 0 then raise exception 'OUT_OF_STOCK'; end if;
  end loop;
  perform set_stock_context(null);

  if v_order.coupon_code is not null then
    update coupons set used_count = used_count + 1 where code = v_order.coupon_code returning id into v_coupon_id;
    insert into coupon_redemptions (coupon_id, code, order_id, user_id, discount)
    values (v_coupon_id, v_order.coupon_code, v_order.id, v_order.user_id, v_order.discount)
    on conflict (order_id) do nothing;
  end if;

  update orders set
    razorpay_payment_id = p_payment_id,
    payment_amount_paise = p_amount_paise,
    payment_status = case when payment_method = 'COD' then payment_status else 'PAID'::payment_status end,
    cod_advance_paid = (payment_method = 'COD'),
    stock_committed = true
  where id = p_order_id;

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.quote_order(jsonb, text, text) from public;
grant execute on function public.quote_order(jsonb, text, text) to anon, authenticated;
revoke all on function public.available_coupons(jsonb) from public;
grant execute on function public.available_coupons(jsonb) to anon, authenticated;
revoke all on function public.confirm_order_payment(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.confirm_order_payment(uuid, text, integer) to service_role;
