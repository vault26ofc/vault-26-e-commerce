create table if not exists public.lookbook_slides (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  media_type text not null default 'image' check (media_type in ('image','video')),
  caption text,
  product_slug text references public.products(slug) on delete set null,
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.lookbook_slides enable row level security;

create policy "lookbook_slides public read" on public.lookbook_slides for select using (true);
create policy "lookbook_slides admin write" on public.lookbook_slides for all
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
