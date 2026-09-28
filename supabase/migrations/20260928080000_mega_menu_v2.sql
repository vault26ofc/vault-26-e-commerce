-- Mega menu v2 (admin: tabs → links → 2 featured products, all picked, nothing typed).
-- Links now hang off the tab directly (groups are kept for old data but no longer needed) and can be
-- hidden individually. Tabs are a category or a fixed page.

alter table public.mega_menu_links
  add column if not exists tab_id uuid references public.mega_menu_tabs(id) on delete cascade,
  add column if not exists is_visible boolean not null default true;

update public.mega_menu_links l set tab_id = g.tab_id
from public.mega_menu_groups g where g.id = l.group_id and l.tab_id is null;

alter table public.mega_menu_links alter column group_id drop not null;

-- Allow 'page' tabs (label + storefront path, same shape as custom).
alter table public.mega_menu_tabs drop constraint if exists mega_menu_tabs_tab_type_check;
alter table public.mega_menu_tabs drop constraint if exists mega_menu_tabs_check;
alter table public.mega_menu_tabs add constraint mega_menu_tabs_check check (
  (tab_type = 'category' and category_id is not null and custom_label is null and custom_href is null)
  or (tab_type in ('custom', 'page') and category_id is null and custom_label is not null and custom_href is not null)
);

-- LOOKBOOK-style custom tabs that point at a real storefront page become page tabs.
update public.mega_menu_tabs set tab_type = 'page'
where tab_type = 'custom' and custom_href in ('/', '/shop', '/accessories', '/lookbook', '/wishlist', '/account', '/orders');

create table if not exists public.mega_menu_featured (
  id uuid primary key default gen_random_uuid(),
  tab_id uuid not null references public.mega_menu_tabs(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  position integer not null default 0,
  unique (tab_id, product_id)
);
alter table public.mega_menu_featured enable row level security;
drop policy if exists "mega featured public read" on public.mega_menu_featured;
create policy "mega featured public read" on public.mega_menu_featured for select using (true);
drop policy if exists "mega featured admin write" on public.mega_menu_featured;
create policy "mega featured admin write" on public.mega_menu_featured
  for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.mega_menu_featured_cap() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.mega_menu_featured where tab_id = new.tab_id and id <> new.id) >= 2 then
    raise exception 'A tab can feature at most 2 products';
  end if;
  return new;
end;
$$;
drop trigger if exists mega_menu_featured_cap on public.mega_menu_featured;
create trigger mega_menu_featured_cap before insert on public.mega_menu_featured
  for each row execute function public.mega_menu_featured_cap();

notify pgrst, 'reload schema';
