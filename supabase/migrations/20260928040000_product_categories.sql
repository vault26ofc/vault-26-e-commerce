-- A product has one primary category (products.category_id — decides its sizes) and any number of
-- extra categories it is also listed under (e.g. a T-shirt in both Men and Women).

create table if not exists public.product_categories (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (product_id, category_id)
);
create index if not exists product_categories_category_idx on public.product_categories (category_id);
alter table public.product_categories enable row level security;
drop policy if exists "product categories public read" on public.product_categories;
create policy "product categories public read" on public.product_categories for select using (true);
drop policy if exists "product categories admin write" on public.product_categories;
create policy "product categories admin write" on public.product_categories
  for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- save_product: optional p_product.extra_category_ids (array). When present it replaces the
-- product's extra categories (the primary is never duplicated there); when absent they are untouched.
create or replace function public.save_product_extra_categories(p_product_id uuid, p_product jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (p_product ? 'extra_category_ids') then return; end if;
  delete from product_categories where product_id = p_product_id;
  insert into product_categories (product_id, category_id)
  select distinct p_product_id, c::uuid
  from jsonb_array_elements_text(coalesce(p_product->'extra_category_ids', '[]'::jsonb)) c
  where c::uuid is distinct from (select category_id from products where id = p_product_id);
end;
$$;
revoke all on function public.save_product_extra_categories(uuid, jsonb) from public, anon, authenticated;

-- Wrap the existing save_product so extras are saved in the same transaction.
alter function public.save_product(jsonb, jsonb) rename to save_product_core;
revoke all on function public.save_product_core(jsonb, jsonb) from public, anon, authenticated;

create or replace function public.save_product(p_product jsonb, p_variants jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  v_id := public.save_product_core(p_product, p_variants);
  perform public.save_product_extra_categories(v_id, p_product);
  return v_id;
end;
$$;
revoke all on function public.save_product(jsonb, jsonb) from public, anon;
grant execute on function public.save_product(jsonb, jsonb) to authenticated;
