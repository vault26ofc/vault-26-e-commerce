create table if not exists public.community_photos (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  media_type text not null default 'image' check (media_type in ('image','video')),
  handle text,
  bento_size text not null default 'md' check (bento_size in ('sm','md','lg','wide','tall')),
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.community_photos enable row level security;

create policy "community_photos public read" on public.community_photos for select using (true);
create policy "community_photos admin write" on public.community_photos for all
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Seed one row + one website_sections row so the section has real content and
-- shows up in the admin's "Pages" tab without a manual step.
insert into public.community_photos (image_url, handle, bento_size, position)
values ('https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&q=80&w=800', '@vault26', 'md', 0);

insert into public.website_sections (page_slug, section_type, label, config, position, is_visible, is_locked)
select 'home', 'community', 'Community', '{}'::jsonb,
  coalesce((select max(position) from public.website_sections where page_slug = 'home'), 0) + 10,
  true, false
where not exists (
  select 1 from public.website_sections where page_slug = 'home' and section_type = 'community'
);
