-- Brands can belong to any number of categories (e.g. Nike → Shoes, Hoodies, Accessories).
-- No foreign keys on purpose: FKs would give PostgREST a second brands↔categories route and make
-- existing embeds ambiguous (see 20260928050000). Integrity is enforced with triggers.

create table if not exists public.brand_categories (
  brand_id uuid not null,
  category_id uuid not null,
  primary key (brand_id, category_id)
);
create index if not exists brand_categories_category_idx on public.brand_categories (category_id);
alter table public.brand_categories enable row level security;
drop policy if exists "brand categories public read" on public.brand_categories;
create policy "brand categories public read" on public.brand_categories for select using (true);
drop policy if exists "brand categories admin write" on public.brand_categories;
create policy "brand categories admin write" on public.brand_categories
  for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.brand_categories_validate() returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.brands where id = new.brand_id) then
    raise exception 'brand_categories: brand % does not exist', new.brand_id;
  end if;
  if not exists (select 1 from public.categories where id = new.category_id) then
    raise exception 'brand_categories: category % does not exist', new.category_id;
  end if;
  return new;
end;
$$;
drop trigger if exists brand_categories_validate on public.brand_categories;
create trigger brand_categories_validate before insert or update on public.brand_categories
  for each row execute function public.brand_categories_validate();

create or replace function public.brand_categories_cleanup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'brands' then
    delete from brand_categories where brand_id = old.id;
  else
    delete from brand_categories where category_id = old.id;
  end if;
  return old;
end;
$$;
drop trigger if exists brands_cleanup_categories on public.brands;
create trigger brands_cleanup_categories after delete on public.brands
  for each row execute function public.brand_categories_cleanup();
drop trigger if exists categories_cleanup_brands on public.categories;
create trigger categories_cleanup_brands after delete on public.categories
  for each row execute function public.brand_categories_cleanup();

-- Carry over the existing single brand links stored on categories.brand_id.
insert into public.brand_categories (brand_id, category_id)
select c.brand_id, c.id from public.categories c
where c.brand_id is not null and exists (select 1 from public.brands b where b.id = c.brand_id)
on conflict do nothing;

notify pgrst, 'reload schema';
