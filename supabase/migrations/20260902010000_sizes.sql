create table if not exists public.sizes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  label text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (category_id, label)
);

alter table public.sizes enable row level security;

create policy "sizes public read" on public.sizes
  for select using (true);

create policy "sizes admin write" on public.sizes
  for all using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));
