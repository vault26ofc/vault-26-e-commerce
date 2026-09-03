create table if not exists public.influencer_picks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  handle text,
  video_source text not null check (video_source in ('upload','link')),
  video_url text,
  link_url text,
  thumbnail_url text,
  thumbnail_type text not null default 'image' check (thumbnail_type in ('image','video')),
  quote text,
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  check (
    (video_source = 'upload' and video_url is not null) or
    (video_source = 'link' and link_url is not null)
  )
);

create table if not exists public.influencer_pick_products (
  id uuid primary key default gen_random_uuid(),
  influencer_pick_id uuid not null references public.influencer_picks(id) on delete cascade,
  product_slug text not null references public.products(slug) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (influencer_pick_id, product_slug)
);

alter table public.influencer_picks enable row level security;
alter table public.influencer_pick_products enable row level security;

create policy "influencer_picks public read" on public.influencer_picks for select using (true);
create policy "influencer_picks admin write" on public.influencer_picks for all
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "influencer_pick_products public read" on public.influencer_pick_products for select using (true);
create policy "influencer_pick_products admin write" on public.influencer_pick_products for all
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.influencer_picks (name, handle, video_source, link_url, thumbnail_url, quote, position)
values (
  'Vault 26 Style Edit', '@vault26',
  'link', 'https://www.instagram.com/vault26ofc/',
  'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&q=80&w=800',
  'Effortless, minimal, made in India.',
  0
);

insert into public.website_sections (page_slug, section_type, label, config, position, is_visible, is_locked)
select 'home', 'influencer_picks', 'Influencer Picks', '{}'::jsonb,
  coalesce((select max(position) from public.website_sections where page_slug = 'home'), 0) + 10,
  true, false
where not exists (
  select 1 from public.website_sections where page_slug = 'home' and section_type = 'influencer_picks'
);
