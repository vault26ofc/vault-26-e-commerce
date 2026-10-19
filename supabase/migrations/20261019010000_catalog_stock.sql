-- Catalog + stock rules:
--   * products.price / compare_at: the base price. Variants that use it follow it when it changes;
--     a variant with its own price keeps it.
--   * products.stock / products.sizes are DERIVED from product_variants (never write them).
--   * products.color_images: optional photos per colour ({ "<colour>": [url, …] }, max 8 each).
--   * Every variant has a size ("ONE SIZE" when none) and a colour ("White" when none), except the
--     single plain item: one row, ONE SIZE, no colour.
--   * Removing a variant that was already sold keeps it at 0 stock instead of deleting it.
--   * admin_delete_product refuses products that were ever sold; check_cart_stock lists short lines.
--   * Stock is given back exactly once: on cancel, or when a return is RECEIVED.

alter table public.products
  add column if not exists price numeric(10,2),
  add column if not exists compare_at numeric(10,2),
  add column if not exists stock integer not null default 0,
  add column if not exists sizes text[] not null default '{}',
  add column if not exists color_images jsonb not null default '{}'::jsonb;

alter table public.orders add column if not exists stock_restored_at timestamptz;

-- ---------------------------------------------------------------- backfill (before the triggers exist)
-- Base price = the most common variant price (lowest on a tie); compare_at = the most common compare
-- price among the variants at that price.
update public.products p set
  price = s.price,
  compare_at = s.compare_at
from (
  select distinct on (v.product_id) v.product_id, v.price,
    (select v2.compare_price from public.product_variants v2
      where v2.product_id = v.product_id and v2.price = v.price
      group by v2.compare_price order by count(*) desc, v2.compare_price nulls last limit 1) as compare_at
  from public.product_variants v
  group by v.product_id, v.price
  order by v.product_id, count(*) desc, v.price
) s
where s.product_id = p.id and p.price is null;

update public.product_variants set size = 'ONE SIZE' where size is null or trim(size) = '';

-- Colourless rows take the product's first colour, else White — except the single plain item.
update public.product_variants v set
  color = coalesce(fc.color, 'White'),
  color_hex = coalesce(v.color_hex, fc.color_hex, case when fc.color is null then '#FFFFFF' end)
from public.products p
left join lateral (
  select x.color, x.color_hex from public.product_variants x
  where x.product_id = p.id and x.color is not null and trim(x.color) <> ''
  order by x.created_at, x.id limit 1
) fc on true
where v.product_id = p.id
  and (v.color is null or trim(v.color) = '')
  and not (v.size = 'ONE SIZE' and (select count(*) from public.product_variants c where c.product_id = p.id) = 1);

-- ---------------------------------------------------------------- derived stock + sizes
-- Conventional order for sizes a category's Admin → Sizes list doesn't cover: letter sizes,
-- then numbers ascending, then anything else A→Z. Mirrored in src/lib/sizes.ts.
create or replace function public.size_rank(p_label text)
returns integer language sql immutable as $$
  select case upper(trim(coalesce(p_label, '')))
    when 'XXXS' then 1 when '3XS' then 1 when 'XXS' then 2 when '2XS' then 2 when 'XS' then 3
    when 'S' then 4 when 'M' then 5 when 'L' then 6 when 'XL' then 7 when 'XXL' then 8 when '2XL' then 8
    when 'XXXL' then 9 when '3XL' then 9 when '4XL' then 10 when '5XL' then 11
    when 'ONE SIZE' then 50 when 'FREE SIZE' then 50
    else case when trim(p_label) ~ '^\d{1,4}(\.\d+)?$' then 1000 + (trim(p_label)::numeric * 10)::int else 1000000 end
  end;
$$;

create or replace function public.recompute_product_stock(p_product uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.recompute_stock', 'on', true);
  update products p set
    stock = coalesce((select sum(greatest(v.stock, 0)) from product_variants v where v.product_id = p.id), 0),
    -- Sizes in the Admin → Sizes order of the product's category; the rest after, in size_rank order.
    sizes = coalesce((
      select array_agg(s.size order by s.rank, public.size_rank(s.size), s.size)
      from (
        select v.size, coalesce(min(z.position), 2147483647) as rank
        from product_variants v
        left join sizes z on z.category_id = p.category_id and lower(z.label) = lower(v.size)
        where v.product_id = p.id and v.size is not null
        group by v.size
      ) s
    ), '{}')
  where p.id = p_product;
  perform set_config('app.recompute_stock', '', true);
end $$;

-- products.stock / sizes can only be written by recompute_product_stock.
create or replace function public.products_guard_derived()
returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('app.recompute_stock', true), '') <> 'on' then
    if tg_op = 'INSERT' then
      new.stock := 0; new.sizes := '{}';
    else
      new.stock := old.stock; new.sizes := old.sizes;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists products_guard_derived on public.products;
create trigger products_guard_derived before insert or update on public.products
  for each row execute function public.products_guard_derived();

create or replace function public.product_variants_recompute()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op <> 'DELETE' then perform public.recompute_product_stock(new.product_id); end if;
  if tg_op = 'DELETE' or old.product_id is distinct from new.product_id then
    perform public.recompute_product_stock(old.product_id);
  end if;
  return null;
end $$;

drop trigger if exists product_variants_recompute on public.product_variants;
create trigger product_variants_recompute after insert or delete or update of stock, size, product_id on public.product_variants
  for each row execute function public.product_variants_recompute();

-- Size order or a product's category changed → its size list re-sorts.
create or replace function public.sizes_recompute_products()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select id from products
    where category_id in (case when tg_op <> 'INSERT' then old.category_id end, case when tg_op <> 'DELETE' then new.category_id end)
  loop
    perform public.recompute_product_stock(r.id);
  end loop;
  return null;
end $$;

drop trigger if exists sizes_recompute_products on public.sizes;
create trigger sizes_recompute_products after insert or delete or update of label, position, category_id on public.sizes
  for each row execute function public.sizes_recompute_products();

create or replace function public.products_recompute_on_category()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.category_id is distinct from old.category_id then perform public.recompute_product_stock(new.id); end if;
  return null;
end $$;

drop trigger if exists products_recompute_on_category on public.products;
create trigger products_recompute_on_category after update of category_id on public.products
  for each row execute function public.products_recompute_on_category();

select public.recompute_product_stock(id) from public.products;

-- ---------------------------------------------------------------- variant prices follow the base price
create or replace function public.products_price_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.price is distinct from old.price and old.price is not null and new.price is not null then
    update product_variants set price = new.price where product_id = new.id and price = old.price;
  end if;
  if new.compare_at is distinct from old.compare_at then
    update product_variants set compare_price = new.compare_at
    where product_id = new.id and compare_price is not distinct from old.compare_at;
  end if;
  return null;
end $$;

drop trigger if exists products_price_follow on public.products;
create trigger products_price_follow after update of price, compare_at on public.products
  for each row execute function public.products_price_follow();

-- ---------------------------------------------------------------- save_product_core
create or replace function public.save_product_core(p_product jsonb, p_variants jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := nullif(p_product->>'id', '')::uuid;
  v_price numeric := nullif(p_product->>'price', '')::numeric;
  v_compare numeric := nullif(p_product->>'compare_at', '')::numeric;
  v_colors jsonb;
  v_count integer;
  v_payload_ids uuid[];
  v_keys text[] := '{}';
  v_keep uuid[] := '{}';
  v_row record;
  v_key text;
  v_color text;
  v_hex text;
  v_vprice numeric;
  v_vcompare numeric;
  v_vid uuid;
  v_from_payload boolean;
  v_stock integer;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;
  if length(trim(coalesce(p_product->>'name', ''))) = 0 or length(trim(coalesce(p_product->>'slug', ''))) = 0 then
    raise exception 'Name and slug are required';
  end if;
  if jsonb_typeof(p_variants) <> 'array' then raise exception 'Variants must be a list'; end if;
  if v_price is not null and v_price <= 0 then raise exception 'The product price must be above ₹0'; end if;
  if v_compare is not null and v_compare <= 0 then v_compare := null; end if;

  -- Colour photos: { "<colour>": [url, …] }, at most 8 per colour; empty lists are dropped.
  select coalesce(jsonb_object_agg(c.k, c.imgs), '{}'::jsonb) into v_colors
  from (
    select trim(e.k) as k,
      (select jsonb_agg(u.url order by u.n) from (
         select t.url, t.n from jsonb_array_elements_text(e.v) with ordinality t(url, n)
         where length(trim(t.url)) > 0 order by t.n limit 8) u) as imgs
    from jsonb_each(case when jsonb_typeof(p_product->'color_images') = 'object' then p_product->'color_images' else '{}'::jsonb end) e(k, v)
    where jsonb_typeof(e.v) = 'array' and length(trim(e.k)) > 0
  ) c
  where c.imgs is not null;

  if v_id is null then
    insert into products (name, slug, description, brand_id, category_id, material, care, is_active, is_featured, images, videos, price, compare_at, color_images)
    values (
      trim(p_product->>'name'), trim(p_product->>'slug'), p_product->>'description',
      nullif(p_product->>'brand_id', '')::uuid, nullif(p_product->>'category_id', '')::uuid,
      p_product->>'material', p_product->>'care',
      coalesce((p_product->>'is_active')::boolean, true), coalesce((p_product->>'is_featured')::boolean, false),
      coalesce(array(select jsonb_array_elements_text(p_product->'images')), '{}'),
      coalesce(array(select jsonb_array_elements_text(p_product->'videos')), '{}'),
      v_price, v_compare, v_colors
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
      videos = case when p_product ? 'videos' then array(select jsonb_array_elements_text(p_product->'videos')) else videos end,
      price = case when p_product ? 'price' then v_price else price end,
      compare_at = case when p_product ? 'compare_at' then v_compare else compare_at end,
      color_images = case when p_product ? 'color_images' then v_colors else color_images end
    where id = v_id;
    if not found then raise exception 'Product not found'; end if;
    v_price := coalesce(v_price, (select price from products where id = v_id));
  end if;

  v_count := jsonb_array_length(p_variants);
  select coalesce(array_agg(nullif(e->>'id', '')::uuid) filter (where nullif(e->>'id', '') is not null), '{}')
    into v_payload_ids from jsonb_array_elements(p_variants) e;

  perform set_stock_context('admin_edit');
  for v_row in
    select t.e, coalesce(nullif(trim(coalesce(t.e->>'size', '')), ''), 'ONE SIZE') as size,
           nullif(trim(coalesce(t.e->>'color', '')), '') as color
    from jsonb_array_elements(p_variants) with ordinality t(e, n) order by t.n
  loop
    v_color := v_row.color;
    v_hex := nullif(trim(coalesce(v_row.e->>'color_hex', '')), '');
    -- Stock is never saved without a colour, except the single plain item.
    if v_color is null and not (v_count = 1 and v_row.size = 'ONE SIZE') then
      v_color := 'White';
      v_hex := coalesce(v_hex, '#FFFFFF');
    end if;

    v_key := lower(v_row.size) || '|' || lower(coalesce(v_color, ''));
    if v_key = any(v_keys) then
      raise exception 'Duplicate variant: % / % appears twice', v_row.size, coalesce(v_color, 'no colour');
    end if;
    v_keys := v_keys || v_key;

    -- Blank price = the product price; blank compare price = the product compare price.
    v_vprice := nullif(v_row.e->>'price', '')::numeric;
    if v_vprice is null or v_vprice <= 0 then v_vprice := v_price; end if;
    if v_vprice is null or v_vprice <= 0 then raise exception 'Every variant needs a price'; end if;
    v_vcompare := nullif(v_row.e->>'compare_price', '')::numeric;
    if v_vcompare is null or v_vcompare <= 0 then v_vcompare := v_compare; end if;

    v_stock := greatest(0, coalesce((v_row.e->>'stock')::int, 0));
    v_vid := nullif(v_row.e->>'id', '')::uuid;
    v_from_payload := v_vid is not null and exists (select 1 from product_variants where id = v_vid and product_id = v_id);
    if not v_from_payload then
      -- Re-use an existing row for the same size + colour (e.g. one kept at 0 because it was sold).
      select id into v_vid from product_variants
      where product_id = v_id and lower(coalesce(size, '')) = lower(v_row.size)
        and lower(coalesce(color, '')) = lower(coalesce(v_color, ''))
        and not (id = any(v_keep)) and not (id = any(v_payload_ids))
      limit 1;
    end if;

    if v_vid is not null then
      update product_variants set
        size = v_row.size,
        color = v_color,
        color_hex = v_hex,
        price = v_vprice,
        compare_price = v_vcompare,
        sku = nullif(trim(coalesce(v_row.e->>'sku', '')), ''),
        -- Stock the editor loaded vs. now: a sale in the meantime is kept, only the admin's change is applied.
        stock = case
          when v_from_payload and v_row.e ? 'original_stock' then greatest(0, stock + v_stock - (v_row.e->>'original_stock')::int)
          else v_stock end
      where id = v_vid;
    else
      insert into product_variants (product_id, size, color, color_hex, price, compare_price, sku, stock)
      values (v_id, v_row.size, v_color, v_hex, v_vprice, v_vcompare, nullif(trim(coalesce(v_row.e->>'sku', '')), ''), v_stock)
      returning id into v_vid;
    end if;
    v_keep := v_keep || v_vid;
  end loop;

  -- Variants no longer listed: deleted, unless already sold — those stay at 0 so order history keeps its link.
  update product_variants v set stock = 0
  where v.product_id = v_id and not (v.id = any(v_keep)) and v.stock <> 0
    and exists (select 1 from order_items oi where oi.variant_id = v.id);
  delete from product_variants v
  where v.product_id = v_id and not (v.id = any(v_keep))
    and not exists (select 1 from order_items oi where oi.variant_id = v.id);
  perform set_stock_context(null);

  return v_id;
end $$;

-- ---------------------------------------------------------------- permanent delete
create or replace function public.admin_delete_product(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_sold integer;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;
  select coalesce(sum(oi.quantity), 0) into v_sold
  from order_items oi
  join product_variants v on v.id = oi.variant_id
  join orders o on o.id = oi.order_id
  where v.product_id = p_id and (o.razorpay_payment_id is not null or o.replacement_of is not null);
  if v_sold > 0 then raise exception 'PRODUCT_SOLD:%', v_sold; end if;
  -- Cascades remove variants, wishlist entries, influencer-pick tags, mega-menu picks, cart lines,
  -- category links and stock history; lookbook slides are unlinked (FK set null).
  delete from products where id = p_id;
  if not found then raise exception 'Product not found'; end if;
end $$;

-- ---------------------------------------------------------------- stock check before payment
-- p_items: [{ variant_id, qty }] → only the lines that don't have enough stock.
create or replace function public.check_cart_stock(p_items jsonb)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'variant_id', i.variant_id, 'requested', i.qty,
    'available', case when p.is_active then greatest(coalesce(v.stock, 0), 0) else 0 end)), '[]'::jsonb)
  from (
    select (e->>'variant_id')::uuid as variant_id,
           sum(greatest(coalesce((e->>'qty')::int, (e->>'quantity')::int, 1), 1)) as qty
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) e
    group by 1
  ) i
  left join product_variants v on v.id = i.variant_id
  left join products p on p.id = v.product_id
  where (case when p.is_active then greatest(coalesce(v.stock, 0), 0) else 0 end) < i.qty;
$$;

-- ---------------------------------------------------------------- give stock back exactly once
create or replace function public.orders_restock_on_cancel()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_item record;
  v_cancel boolean := new.status = 'CANCELLED' and old.status is distinct from 'CANCELLED';
  v_return boolean := new.return_status = 'RECEIVED' and old.return_status is distinct from 'RECEIVED';
begin
  if (v_cancel or v_return) and old.stock_committed and old.stock_restored_at is null then
    perform set_stock_context(case when v_cancel then 'cancel' else 'return' end, new.id);
    for v_item in select variant_id, quantity from order_items where order_id = new.id and variant_id is not null loop
      update product_variants set stock = stock + v_item.quantity where id = v_item.variant_id;
    end loop;
    perform set_stock_context(null);
    new.stock_committed := false;
    new.stock_restored_at := now();
  end if;
  return new;
end $$;

drop trigger if exists orders_restock_on_cancel on public.orders;
create trigger orders_restock_on_cancel before update of status, return_status on public.orders
  for each row execute function public.orders_restock_on_cancel();

-- ---------------------------------------------------------------- grants
revoke all on function public.recompute_product_stock(uuid) from public, anon, authenticated;
revoke all on function public.admin_delete_product(uuid) from public, anon;
grant execute on function public.admin_delete_product(uuid) to authenticated;
revoke all on function public.check_cart_stock(jsonb) from public;
grant execute on function public.check_cart_stock(jsonb) to anon, authenticated;
