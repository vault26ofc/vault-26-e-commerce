drop table if exists public.mega_menu_products;
drop table if exists public.mega_menu_links;
drop table if exists public.mega_menu_categories;

create table public.mega_menu_tabs (
  id uuid primary key default gen_random_uuid(),
  tab_type text not null check (tab_type in ('category','custom')),
  category_id uuid references public.categories(id) on delete cascade,
  custom_label text,
  custom_href text,
  hero_image_url text,
  subhead text,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (
    (tab_type = 'category' and category_id is not null and custom_label is null and custom_href is null) or
    (tab_type = 'custom' and category_id is null and custom_label is not null and custom_href is not null)
  )
);
create unique index mega_menu_tabs_category_id_key on public.mega_menu_tabs (category_id) where category_id is not null;

create table public.mega_menu_groups (
  id uuid primary key default gen_random_uuid(),
  tab_id uuid not null references public.mega_menu_tabs(id) on delete cascade,
  heading text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.mega_menu_links (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.mega_menu_groups(id) on delete cascade,
  link_type text not null check (link_type in ('category','custom')),
  category_id uuid references public.categories(id) on delete cascade,
  custom_label text,
  custom_href text,
  hover_image_url text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  check (
    (link_type = 'category' and category_id is not null and custom_label is null and custom_href is null) or
    (link_type = 'custom' and category_id is null and custom_label is not null and custom_href is not null)
  )
);

alter table public.mega_menu_tabs enable row level security;
alter table public.mega_menu_groups enable row level security;
alter table public.mega_menu_links enable row level security;

create policy "mmt public read" on public.mega_menu_tabs for select using (true);
create policy "mmt admin write" on public.mega_menu_tabs for all
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "mmg public read" on public.mega_menu_groups for select using (true);
create policy "mmg admin write" on public.mega_menu_groups for all
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "mml public read" on public.mega_menu_links for select using (true);
create policy "mml admin write" on public.mega_menu_links for all
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Seed: one tab per real active category, each with a single "SHOP" group
-- containing one link back to that same category — a functional starting
-- point, not a finished editorial layout. Admins flesh it out via the new
-- /admin/mega-menu page (Task 19). Plus Lookbook/About as custom tabs,
-- matching the two static-page tabs the real Navbar already links to.
insert into public.mega_menu_tabs (tab_type, category_id, position)
select 'category', id, (row_number() over (order by name) - 1)::int
from public.categories where is_active = true;

insert into public.mega_menu_groups (tab_id, heading, position)
select t.id, 'SHOP', 0
from public.mega_menu_tabs t where t.tab_type = 'category';

insert into public.mega_menu_links (group_id, link_type, category_id, position)
select g.id, 'category', t.category_id, 0
from public.mega_menu_groups g
join public.mega_menu_tabs t on t.id = g.tab_id
where t.tab_type = 'category';

insert into public.mega_menu_tabs (tab_type, custom_label, custom_href, position)
values ('custom', 'LOOKBOOK', '/lookbook', 100), ('custom', 'ABOUT', '/about', 101);
