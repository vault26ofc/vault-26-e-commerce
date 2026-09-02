create table if not exists public.mega_menu_categories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null unique references public.categories(id) on delete cascade,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.mega_menu_links (
  id uuid primary key default gen_random_uuid(),
  menu_category_id uuid not null references public.mega_menu_categories(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.mega_menu_products (
  id uuid primary key default gen_random_uuid(),
  menu_category_id uuid not null references public.mega_menu_categories(id) on delete cascade,
  product_slug text not null references public.products(slug) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (menu_category_id, product_slug)
);

alter table public.mega_menu_categories enable row level security;
alter table public.mega_menu_links enable row level security;
alter table public.mega_menu_products enable row level security;

create policy "mmc public read" on public.mega_menu_categories for select using (true);
create policy "mmc admin write" on public.mega_menu_categories for all
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "mml public read" on public.mega_menu_links for select using (true);
create policy "mml admin write" on public.mega_menu_links for all
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "mmp public read" on public.mega_menu_products for select using (true);
create policy "mmp admin write" on public.mega_menu_products for all
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
