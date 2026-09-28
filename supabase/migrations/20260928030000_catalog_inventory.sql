-- Catalog + inventory: category media/order, product videos, stock history, save_product (keeps
-- variant ids), adjust_stock.

alter table public.categories
  add column if not exists description text,
  add column if not exists video text,
  add column if not exists position integer not null default 0;

alter table public.products
  add column if not exists videos text[] not null default '{}';

insert into public.settings(key, value) values ('low_stock_threshold', '5'::jsonb) on conflict (key) do nothing;

-- ---------------------------------------------------------------- stock history
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  delta integer not null,
  stock_after integer not null,
  reason text not null,
  order_id uuid references public.orders(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists inventory_movements_variant_idx on public.inventory_movements (variant_id, created_at desc);
alter table public.inventory_movements enable row level security;
drop policy if exists "inventory movements admin read" on public.inventory_movements;
create policy "inventory movements admin read" on public.inventory_movements
  for select using (public.has_role(auth.uid(), 'admin'));

-- Writers set app.stock_reason / app.stock_order (transaction-local) before touching stock and clear
-- them afterwards; anything else (e.g. a direct admin edit) is recorded as 'admin_edit'.
create or replace function public.log_stock_movement() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_delta integer := new.stock - case when tg_op = 'INSERT' then 0 else old.stock end;
begin
  if v_delta = 0 then return null; end if;
  insert into inventory_movements (variant_id, delta, stock_after, reason, order_id, created_by)
  values (
    new.id, v_delta, new.stock,
    case when tg_op = 'INSERT' then 'initial'
         else coalesce(nullif(current_setting('app.stock_reason', true), ''), 'admin_edit') end,
    nullif(current_setting('app.stock_order', true), '')::uuid,
    auth.uid()
  );
  return null;
end;
$$;
drop trigger if exists product_variants_stock_log on public.product_variants;
create trigger product_variants_stock_log after insert or update of stock on public.product_variants
  for each row execute function public.log_stock_movement();

create or replace function public.set_stock_context(p_reason text, p_order uuid default null) returns void
language sql as $$
  select set_config('app.stock_reason', coalesce(p_reason, ''), true),
         set_config('app.stock_order', coalesce(p_order::text, ''), true);
$$;

-- ---------------------------------------------------------------- existing stock writers, now labelled
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

  perform set_stock_context('order', p_order_id);
  for v_item in select variant_id, quantity from order_items where order_id = p_order_id loop
    update product_variants set stock = stock - v_item.quantity
    where id = v_item.variant_id and stock >= v_item.quantity;
    get diagnostics v_updated = row_count;
    if v_updated = 0 then raise exception 'OUT_OF_STOCK'; end if;
  end loop;
  perform set_stock_context(null);

  if v_order.coupon_code is not null then
    update coupons set used_count = used_count + 1 where code = v_order.coupon_code;
  end if;

  update orders set
    razorpay_payment_id = p_payment_id,
    payment_amount_paise = p_amount_paise,
    payment_status = case when payment_method = 'COD' then payment_status else 'PAID'::payment_status end,
    cod_advance_paid = (payment_method = 'COD'),
    stock_committed = true
  where id = p_order_id;

  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.confirm_order_payment(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.confirm_order_payment(uuid, text, integer) to service_role;

create or replace function public.orders_restock_on_cancel() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_item record;
begin
  if new.status = 'CANCELLED' and old.status is distinct from 'CANCELLED' and old.stock_committed then
    perform set_stock_context('cancel', new.id);
    for v_item in select variant_id, quantity from order_items where order_id = new.id and variant_id is not null loop
      update product_variants set stock = stock + v_item.quantity where id = v_item.variant_id;
    end loop;
    perform set_stock_context(null);
    new.stock_committed := false;
  end if;
  return new;
end;
$$;

create or replace function public.create_replacement_order(p_order_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_orig orders%rowtype;
  v_new uuid;
  v_item record;
  v_updated int;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;

  select * into v_orig from orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if v_orig.return_status <> 'RECEIVED' then raise exception 'Return must be RECEIVED before replacing (is %)', v_orig.return_status; end if;

  insert into orders (user_id, email, shipping_address, subtotal, discount, shipping, total,
                      payment_method, payment_status, cod_advance_amount, stock_committed, replacement_of, notes)
  values (v_orig.user_id, v_orig.email, v_orig.shipping_address, 0, 0, 0, 0,
          'RAZORPAY', 'PAID', 0, true, v_orig.id, 'Replacement for ' || v_orig.order_number)
  returning id into v_new;

  perform set_stock_context('replacement', v_new);
  for v_item in select * from order_items where order_id = p_order_id loop
    insert into order_items (order_id, variant_id, product_name, variant_label, image, quantity, price_at_purchase)
    values (v_new, v_item.variant_id, v_item.product_name, v_item.variant_label, v_item.image, v_item.quantity, v_item.price_at_purchase);
    if v_item.variant_id is not null then
      update product_variants set stock = stock - v_item.quantity where id = v_item.variant_id and stock >= v_item.quantity;
      get diagnostics v_updated = row_count;
      if v_updated = 0 then raise exception 'Not enough stock to replace %', v_item.product_name; end if;
    end if;
  end loop;
  perform set_stock_context(null);

  update orders set return_status = 'REPLACED', replacement_order_id = v_new where id = v_orig.id;
  update orders set status = 'PACKED' where id = v_new;
  return v_new;
end;
$$;

-- ---------------------------------------------------------------- admin RPCs
create or replace function public.adjust_stock(p_variant_id uuid, p_delta integer, p_reason text) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_stock integer;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;
  if p_delta = 0 then raise exception 'Adjustment must not be zero'; end if;
  if length(trim(coalesce(p_reason, ''))) < 2 then raise exception 'Give a reason for the adjustment'; end if;
  perform set_stock_context(trim(p_reason));
  update product_variants set stock = stock + p_delta
  where id = p_variant_id and stock + p_delta >= 0
  returning stock into v_stock;
  perform set_stock_context(null);
  -- (checked via v_stock: PERFORM above resets FOUND)
  if v_stock is null then
    if exists (select 1 from product_variants where id = p_variant_id) then raise exception 'Stock cannot go below zero'; end if;
    raise exception 'Variant not found';
  end if;
  return v_stock;
end;
$$;
revoke all on function public.adjust_stock(uuid, integer, text) from public, anon;
grant execute on function public.adjust_stock(uuid, integer, text) to authenticated;

-- Saves a product and its variants in one transaction. Variants keep their ids (orders, carts and
-- stock history stay linked); only variants missing from p_variants are deleted. When the editor
-- sends original_stock, the stock change is applied as a delta so concurrent orders aren't clobbered.
create or replace function public.save_product(p_product jsonb, p_variants jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := nullif(p_product->>'id', '')::uuid;
  v_keep uuid[] := '{}';
  v_elem jsonb;
  v_vid uuid;
  v_stock integer;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;
  if length(trim(coalesce(p_product->>'name', ''))) = 0 or length(trim(coalesce(p_product->>'slug', ''))) = 0 then
    raise exception 'Name and slug are required';
  end if;
  if jsonb_typeof(p_variants) <> 'array' then raise exception 'Variants must be a list'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_variants) e
    group by lower(trim(coalesce(e->>'size', ''))), lower(trim(coalesce(e->>'color', '')))
    having count(*) > 1
  ) then raise exception 'Duplicate variant: each size + colour combination may appear once'; end if;

  if v_id is null then
    insert into products (name, slug, description, brand_id, category_id, material, care, is_active, is_featured, images, videos)
    values (
      trim(p_product->>'name'), trim(p_product->>'slug'), p_product->>'description',
      nullif(p_product->>'brand_id', '')::uuid, nullif(p_product->>'category_id', '')::uuid,
      p_product->>'material', p_product->>'care',
      coalesce((p_product->>'is_active')::boolean, true), coalesce((p_product->>'is_featured')::boolean, false),
      coalesce(array(select jsonb_array_elements_text(p_product->'images')), '{}'),
      coalesce(array(select jsonb_array_elements_text(p_product->'videos')), '{}')
    ) returning id into v_id;
  else
    update products set
      name = trim(p_product->>'name'),
      slug = trim(p_product->>'slug'),
      description = case when p_product ? 'description' then p_product->>'description' else description end,
      brand_id = case when p_product ? 'brand_id' then nullif(p_product->>'brand_id', '')::uuid else brand_id end,
      category_id = case when p_product ? 'category_id' then nullif(p_product->>'category_id', '')::uuid else category_id end,
      material = case when p_product ? 'material' then p_product->>'material' else material end,
      care = case when p_product ? 'care' then p_product->>'care' else care end,
      is_active = coalesce((p_product->>'is_active')::boolean, is_active),
      is_featured = coalesce((p_product->>'is_featured')::boolean, is_featured),
      images = case when p_product ? 'images' then array(select jsonb_array_elements_text(p_product->'images')) else images end,
      videos = case when p_product ? 'videos' then array(select jsonb_array_elements_text(p_product->'videos')) else videos end
    where id = v_id;
    if not found then raise exception 'Product not found'; end if;
  end if;

  perform set_stock_context('admin_edit');
  for v_elem in select * from jsonb_array_elements(p_variants) loop
    v_vid := nullif(v_elem->>'id', '')::uuid;
    if (v_elem->>'price')::numeric is null or (v_elem->>'price')::numeric < 0 then raise exception 'Every variant needs a price'; end if;
    v_stock := greatest(0, coalesce((v_elem->>'stock')::int, 0));

    if v_vid is not null and exists (select 1 from product_variants where id = v_vid and product_id = v_id) then
      update product_variants set
        size = nullif(trim(coalesce(v_elem->>'size', '')), ''),
        color = nullif(trim(coalesce(v_elem->>'color', '')), ''),
        color_hex = nullif(v_elem->>'color_hex', ''),
        price = (v_elem->>'price')::numeric,
        compare_price = nullif(v_elem->>'compare_price', '')::numeric,
        sku = nullif(trim(coalesce(v_elem->>'sku', '')), ''),
        stock = case
          when v_elem ? 'original_stock' then greatest(0, stock + v_stock - (v_elem->>'original_stock')::int)
          else v_stock end
      where id = v_vid;
    else
      insert into product_variants (product_id, size, color, color_hex, price, compare_price, sku, stock)
      values (v_id, nullif(trim(coalesce(v_elem->>'size', '')), ''), nullif(trim(coalesce(v_elem->>'color', '')), ''),
              nullif(v_elem->>'color_hex', ''), (v_elem->>'price')::numeric, nullif(v_elem->>'compare_price', '')::numeric,
              nullif(trim(coalesce(v_elem->>'sku', '')), ''), v_stock)
      returning id into v_vid;
    end if;
    v_keep := v_keep || v_vid;
  end loop;
  perform set_stock_context(null);

  delete from product_variants where product_id = v_id and not (id = any(v_keep));
  return v_id;
end;
$$;
revoke all on function public.save_product(jsonb, jsonb) from public, anon;
grant execute on function public.save_product(jsonb, jsonb) to authenticated;
