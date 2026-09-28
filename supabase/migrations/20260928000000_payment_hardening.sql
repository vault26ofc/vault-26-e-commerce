-- Payment hardening: server-confirmed payments, COD rules, RLS fixes.

alter table public.orders
  add column if not exists razorpay_refund_id text,
  add column if not exists payment_amount_paise integer;

create unique index if not exists orders_razorpay_payment_id_key
  on public.orders (razorpay_payment_id) where razorpay_payment_id is not null;

delete from public.settings where key = 'cod_threshold';
insert into public.settings(key, value) values ('cod_min_order', '0'::jsonb) on conflict (key) do nothing;

-- ---------------------------------------------------------------- create_order
create or replace function public.create_order(
  p_user_id uuid, p_email text, p_shipping_address jsonb, p_items jsonb,
  p_coupon_code text default null, p_payment_method text default 'RAZORPAY'
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_order_id uuid;
  v_subtotal numeric(10,2) := 0;
  v_discount numeric(10,2) := 0;
  v_shipping numeric(10,2);
  v_free_threshold numeric(10,2);
  v_cod_advance_pct numeric(10,2);
  v_cod_min numeric(10,2);
  v_total numeric(10,2);
  v_cod_advance numeric(10,2) := 0;
  v_coupon record;
  v_elem jsonb;
  v_variant_id uuid;
  v_qty int;
  v_price numeric(10,2);
  v_stock int;
  v_product_name text;
  v_product_image text;
  v_variant_label text;
  v_result record;
begin
  if p_user_id is not null and p_user_id is distinct from auth.uid() then
    raise exception 'Unauthorized: user_id mismatch';
  end if;

  select coalesce((select (value#>>'{}')::numeric from settings where key = 'free_shipping_threshold'), 999) into v_free_threshold;
  select coalesce((select (value#>>'{}')::numeric from settings where key = 'shipping_fee'), 79) into v_shipping;
  select coalesce((select (value#>>'{}')::numeric from settings where key = 'cod_advance_percent'), 20) into v_cod_advance_pct;
  select coalesce((select (value#>>'{}')::numeric from settings where key = 'cod_min_order'), 0) into v_cod_min;

  for v_elem in select * from jsonb_array_elements(p_items) loop
    v_variant_id := (v_elem->>'variant_id')::uuid;
    v_qty := (v_elem->>'quantity')::int;
    if v_qty <= 0 then raise exception 'Invalid quantity for variant %', v_variant_id; end if;

    select pv.price, pv.stock, p.name
      into v_price, v_stock, v_product_name
    from product_variants pv join products p on p.id = pv.product_id
    where pv.id = v_variant_id and p.is_active = true;
    if not found then raise exception 'Variant % not found or product is inactive', v_variant_id; end if;
    if v_stock < v_qty then
      raise exception 'Insufficient stock for % (available: %, requested: %)', v_product_name, v_stock, v_qty;
    end if;
    v_subtotal := v_subtotal + (v_price * v_qty);
  end loop;

  if v_subtotal <= 0 then raise exception 'Order must contain at least one item'; end if;
  if v_subtotal >= v_free_threshold then v_shipping := 0; end if;

  -- Coupon is validated here; its use is only counted once payment is confirmed.
  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    select * into v_coupon from coupons
    where code = upper(trim(p_coupon_code)) and is_active = true
      and (expires_at is null or expires_at > now())
      and (max_uses is null or used_count < max_uses);
    if found and v_subtotal >= v_coupon.min_order then
      if v_coupon.type = 'PERCENT' then
        v_discount := least(round(v_subtotal * v_coupon.value / 100, 2), v_subtotal);
      else
        v_discount := least(v_coupon.value, v_subtotal);
      end if;
    end if;
  end if;

  v_total := greatest(v_subtotal - v_discount, 0) + v_shipping;

  if p_payment_method = 'COD' then
    if v_cod_min > 0 and v_total < v_cod_min then
      raise exception 'COD is available on orders of ₹% or more', v_cod_min;
    end if;
    v_cod_advance := round(v_total * v_cod_advance_pct / 100, 2);
  end if;

  insert into orders (user_id, email, shipping_address, subtotal, discount, shipping, total,
                      payment_method, payment_status, cod_advance_amount, coupon_code)
  values (p_user_id, p_email, p_shipping_address, v_subtotal, v_discount, v_shipping, v_total,
          p_payment_method::payment_method, 'PENDING', v_cod_advance,
          nullif(upper(trim(coalesce(p_coupon_code, ''))), ''))
  returning id into v_order_id;

  for v_elem in select * from jsonb_array_elements(p_items) loop
    v_variant_id := (v_elem->>'variant_id')::uuid;
    v_qty := (v_elem->>'quantity')::int;
    select pv.price, p.name, p.images[1],
      nullif(trim(coalesce(pv.size,'') || case when pv.size is not null and pv.color is not null then ' · ' else '' end || coalesce(pv.color,'')), '')
      into v_price, v_product_name, v_product_image, v_variant_label
    from product_variants pv join products p on p.id = pv.product_id
    where pv.id = v_variant_id;
    insert into order_items (order_id, variant_id, product_name, variant_label, image, quantity, price_at_purchase)
    values (v_order_id, v_variant_id, v_product_name, v_variant_label, v_product_image, v_qty, v_price);
  end loop;

  select * into v_result from orders where id = v_order_id;
  return jsonb_build_object(
    'id', v_result.id, 'order_number', v_result.order_number,
    'subtotal', v_result.subtotal, 'discount', v_result.discount, 'shipping', v_result.shipping,
    'total', v_result.total, 'payment_method', v_result.payment_method,
    'payment_status', v_result.payment_status, 'cod_advance_amount', v_result.cod_advance_amount);
end;
$$;
grant execute on function public.create_order(uuid, text, jsonb, jsonb, text, text) to anon, authenticated;

-- ---------------------------------------------------------------- confirm_order_payment
create or replace function public.confirm_order_payment(p_order_id uuid, p_payment_id text, p_amount_paise integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_order orders%rowtype;
  v_item record;
  v_updated int;
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

  for v_item in select variant_id, quantity from order_items where order_id = p_order_id loop
    update product_variants set stock = stock - v_item.quantity
    where id = v_item.variant_id and stock >= v_item.quantity;
    get diagnostics v_updated = row_count;
    if v_updated = 0 then raise exception 'OUT_OF_STOCK'; end if;
  end loop;

  if v_order.coupon_code is not null then
    update coupons set used_count = used_count + 1 where code = v_order.coupon_code;
  end if;

  update orders set
    razorpay_payment_id = p_payment_id,
    payment_amount_paise = p_amount_paise,
    payment_status = case when payment_method = 'COD' then payment_status else 'PAID'::payment_status end,
    cod_advance_paid = (payment_method = 'COD')
  where id = p_order_id;

  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.confirm_order_payment(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.confirm_order_payment(uuid, text, integer) to service_role;

-- ---------------------------------------------------------------- COD paid on delivery
create or replace function public.cod_paid_on_delivery() returns trigger
language plpgsql as $$
begin
  if new.status = 'DELIVERED' and old.status is distinct from 'DELIVERED'
     and new.payment_method = 'COD' and new.payment_status = 'PENDING' then
    new.payment_status := 'PAID';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_cod_paid_on_delivery on public.orders;
create trigger trg_cod_paid_on_delivery before update of status on public.orders
  for each row execute function public.cod_paid_on_delivery();

-- ---------------------------------------------------------------- RLS hardening
drop policy if exists "orders insert own" on public.orders;
drop policy if exists "oi insert" on public.order_items;

create or replace function public.orders_guard_customer_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.has_role(auth.uid(), 'admin') then return new; end if;
  if old.status = 'PENDING' and new.status = 'CANCELLED'
     and (to_jsonb(new) - 'status' - 'updated_at') = (to_jsonb(old) - 'status' - 'updated_at') then
    return new;
  end if;
  raise exception 'Customers can only cancel a pending order';
end;
$$;
drop trigger if exists orders_guard_customer_update on public.orders;
create trigger orders_guard_customer_update before update on public.orders
  for each row execute function public.orders_guard_customer_update();
