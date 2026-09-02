create table if not exists public.preloader_settings (
  id uuid primary key default gen_random_uuid(),
  bg_type text not null default 'color' check (bg_type in ('color','image','video')),
  bg_image_url text,
  bg_video_url text,
  content_type text not null default 'text' check (content_type in ('image','text')),
  content_image_url text,
  content_text text not null default '26',
  text_color text not null default '#000000',
  duration_ms integer not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.preloader_settings enable row level security;

create policy "preloader public read" on public.preloader_settings for select using (true);
create policy "preloader admin write" on public.preloader_settings for all
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create trigger preloader_touch before update on public.preloader_settings
  for each row execute function public.touch_updated_at();

insert into public.preloader_settings (content_text) values ('26');
