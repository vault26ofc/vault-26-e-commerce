-- product_categories' foreign keys made PostgREST see a second products↔categories relationship,
-- so every `products?select=...,categories(...)` embed became ambiguous (HTTP 300) and broke the
-- storefront. Integrity is kept with triggers instead, which PostgREST does not treat as relationships.

alter table public.product_categories drop constraint if exists product_categories_product_id_fkey;
alter table public.product_categories drop constraint if exists product_categories_category_id_fkey;

create or replace function public.product_categories_validate() returns trigger
language plpgsql as $$
begin
  if not exists (select 1 from public.products where id = new.product_id) then
    raise exception 'product_categories: product % does not exist', new.product_id;
  end if;
  if not exists (select 1 from public.categories where id = new.category_id) then
    raise exception 'product_categories: category % does not exist', new.category_id;
  end if;
  return new;
end;
$$;
drop trigger if exists product_categories_validate on public.product_categories;
create trigger product_categories_validate before insert or update on public.product_categories
  for each row execute function public.product_categories_validate();

create or replace function public.product_categories_cleanup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'products' then
    delete from product_categories where product_id = old.id;
  else
    delete from product_categories where category_id = old.id;
  end if;
  return old;
end;
$$;
drop trigger if exists products_cleanup_categories on public.products;
create trigger products_cleanup_categories after delete on public.products
  for each row execute function public.product_categories_cleanup();
drop trigger if exists categories_cleanup_products on public.categories;
create trigger categories_cleanup_products after delete on public.categories
  for each row execute function public.product_categories_cleanup();

notify pgrst, 'reload schema';
