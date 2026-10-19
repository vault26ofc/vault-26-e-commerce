-- Coupons: kinds (general / welcome / birthday), personal codes, limits, category scope,
-- redemptions, the welcome offer and birthday codes. Codes are only ever validated through
-- coupon_evaluate (via quote_order / available_coupons / create_order) — there is no public list.

alter table public.coupons
  add column if not exists kind text not null default 'general',
  add column if not exists assigned_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists description text,
  add column if not exists max_discount numeric(10,2),
  add column if not exists per_user_limit integer,
  add column if not exists first_order_only boolean not null default false,
  add column if not exists starts_at timestamptz,
  add column if not exists is_listed boolean not null default true,
  add column if not exists bday_year integer,
  add column if not exists welcome_tier_id uuid;

alter table public.coupons drop constraint if exists coupons_kind_check;
alter table public.coupons add constraint coupons_kind_check check (kind in ('general', 'welcome', 'birthday'));
alter table public.coupons drop constraint if exists coupons_personal_owner;
alter table public.coupons add constraint coupons_personal_owner check (kind = 'general' or assigned_user_id is not null);
alter table public.coupons drop constraint if exists coupons_limits_check;
alter table public.coupons add constraint coupons_limits_check check (
  (max_uses is null or max_uses > 0) and (per_user_limit is null or per_user_limit > 0)
  and (max_discount is null or max_discount > 0) and min_order >= 0);

create unique index if not exists coupons_one_welcome_per_user on public.coupons (assigned_user_id) where kind = 'welcome';
create unique index if not exists coupons_one_birthday_per_year on public.coupons (assigned_user_id, bday_year) where kind = 'birthday';
create index if not exists coupons_assigned_user_idx on public.coupons (assigned_user_id) where assigned_user_id is not null;

-- Codes are UPPERCASE A–Z, 0–9, - and _.
create or replace function public.coupons_normalize()
returns trigger language plpgsql as $$
begin
  new.code := upper(trim(coalesce(new.code, '')));
  if new.code !~ '^[A-Z0-9_-]{2,40}$' then raise exception 'Coupon codes use 2–40 letters, digits, - or _'; end if;
  if new.value is null or new.value <= 0 then raise exception 'The discount must be above 0'; end if;
  if new.type = 'PERCENT' and new.value > 100 then raise exception 'A percent discount can be at most 100'; end if;
  return new;
end $$;

drop trigger if exists coupons_normalize on public.coupons;
create trigger coupons_normalize before insert or update of code, value, type on public.coupons
  for each row execute function public.coupons_normalize();

-- ---------------------------------------------------------------- scope
create table if not exists public.coupon_categories (
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (coupon_id, category_id)
);
create table if not exists public.coupon_excluded_products (
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key (coupon_id, product_id)
);
alter table public.coupon_categories enable row level security;
alter table public.coupon_excluded_products enable row level security;
drop policy if exists "coupon categories admin" on public.coupon_categories;
create policy "coupon categories admin" on public.coupon_categories for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
drop policy if exists "coupon excluded admin" on public.coupon_excluded_products;
create policy "coupon excluded admin" on public.coupon_excluded_products for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------- redemptions
create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid references public.coupons(id) on delete set null,
  code text not null,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  discount numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists coupon_redemptions_coupon_user_idx on public.coupon_redemptions (coupon_id, user_id);
alter table public.coupon_redemptions enable row level security;
drop policy if exists "redemptions admin read" on public.coupon_redemptions;
create policy "redemptions admin read" on public.coupon_redemptions for select using (public.has_role(auth.uid(), 'admin'));
drop policy if exists "redemptions own read" on public.coupon_redemptions;
create policy "redemptions own read" on public.coupon_redemptions for select using (auth.uid() = user_id);

-- Past paid orders that used a code (used_count already includes them).
insert into public.coupon_redemptions (coupon_id, code, order_id, user_id, discount, created_at)
select c.id, o.coupon_code, o.id, o.user_id, o.discount, o.created_at
from public.orders o
left join public.coupons c on c.code = o.coupon_code
where o.coupon_code is not null and o.razorpay_payment_id is not null
on conflict (order_id) do nothing;

-- ---------------------------------------------------------------- RLS: no public coupon list
drop policy if exists "coupons read active" on public.coupons;
drop policy if exists "coupons read own" on public.coupons;
create policy "coupons read own" on public.coupons for select using (auth.uid() = assigned_user_id);

-- ---------------------------------------------------------------- evaluation (internal)
-- p_lines: [{ product_id, amount }] — amount = line price × qty, priced by the server.
-- Order of checks: someone else's personal code (answered as not_found), inactive, not_started,
-- expired, login_required, already_used, limit_reached, first_order_only, not_applicable, min_order.
create or replace function public.coupon_evaluate(p_coupon public.coupons, p_user uuid, p_lines jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_scoped boolean;
  v_covered numeric := 0;
  v_discount numeric;
  fail jsonb := jsonb_build_object('ok', false, 'code', p_coupon.code, 'discount', 0);
begin
  if p_coupon.assigned_user_id is not null and p_coupon.assigned_user_id is distinct from p_user then
    return fail || jsonb_build_object('reason', 'not_found');
  end if;
  if not p_coupon.is_active then return fail || jsonb_build_object('reason', 'inactive'); end if;
  if p_coupon.starts_at is not null and p_coupon.starts_at > now() then
    return fail || jsonb_build_object('reason', 'not_started', 'starts_at', p_coupon.starts_at);
  end if;
  if p_coupon.expires_at is not null and p_coupon.expires_at <= now() then return fail || jsonb_build_object('reason', 'expired'); end if;
  if p_user is null and (p_coupon.per_user_limit is not null or p_coupon.first_order_only) then
    return fail || jsonb_build_object('reason', 'login_required');
  end if;
  if p_coupon.per_user_limit is not null and (
    select count(*) from coupon_redemptions r where r.coupon_id = p_coupon.id and r.user_id = p_user) >= p_coupon.per_user_limit then
    return fail || jsonb_build_object('reason', 'already_used');
  end if;
  if p_coupon.max_uses is not null and p_coupon.used_count >= p_coupon.max_uses then
    return fail || jsonb_build_object('reason', 'limit_reached');
  end if;
  if p_coupon.first_order_only and exists (
    select 1 from orders o where o.user_id = p_user and o.razorpay_payment_id is not null and o.status <> 'CANCELLED') then
    return fail || jsonb_build_object('reason', 'first_order_only');
  end if;

  v_scoped := exists (select 1 from coupon_categories where coupon_id = p_coupon.id);
  with recursive cats(id) as (
    select category_id from coupon_categories where coupon_id = p_coupon.id
    union
    select ch.id from categories ch join cats on ch.parent_id = cats.id
  )
  select coalesce(sum((l->>'amount')::numeric), 0) into v_covered
  from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) l
  join products p on p.id = (l->>'product_id')::uuid
  where not exists (select 1 from coupon_excluded_products x where x.coupon_id = p_coupon.id and x.product_id = p.id)
    and (not v_scoped
         or p.category_id in (select id from cats)
         or exists (select 1 from product_categories pc where pc.product_id = p.id and pc.category_id in (select id from cats)));

  if v_covered <= 0 then return fail || jsonb_build_object('reason', 'not_applicable'); end if;
  if v_covered < p_coupon.min_order then
    return fail || jsonb_build_object('reason', 'min_order', 'min_order', p_coupon.min_order, 'covered', v_covered);
  end if;

  v_discount := case when p_coupon.type = 'PERCENT' then round(v_covered * p_coupon.value / 100) else p_coupon.value end;
  if p_coupon.max_discount is not null then v_discount := least(v_discount, p_coupon.max_discount); end if;
  v_discount := least(v_discount, v_covered);
  return jsonb_build_object('ok', true, 'reason', null, 'coupon_id', p_coupon.id, 'code', p_coupon.code,
                            'discount', v_discount, 'covered', v_covered, 'min_order', p_coupon.min_order);
end $$;

-- ---------------------------------------------------------------- admin save (coupon + scope in one transaction)
create or replace function public.save_coupon(p_id uuid, p_fields jsonb, p_categories uuid[], p_excluded uuid[])
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := p_id;
  v_kind text := coalesce(nullif(p_fields->>'kind', ''), 'general');
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;
  if v_id is null then
    insert into coupons (code, kind, assigned_user_id, description, type, value, max_discount, min_order, max_uses,
                         per_user_limit, first_order_only, starts_at, expires_at, is_active, is_listed)
    values (
      p_fields->>'code', v_kind, nullif(p_fields->>'assigned_user_id', '')::uuid, nullif(trim(coalesce(p_fields->>'description', '')), ''),
      coalesce(nullif(p_fields->>'type', ''), 'PERCENT')::coupon_type, (p_fields->>'value')::numeric,
      nullif(p_fields->>'max_discount', '')::numeric, coalesce(nullif(p_fields->>'min_order', '')::numeric, 0),
      nullif(p_fields->>'max_uses', '')::int, nullif(p_fields->>'per_user_limit', '')::int,
      coalesce((p_fields->>'first_order_only')::boolean, false),
      nullif(p_fields->>'starts_at', '')::timestamptz, nullif(p_fields->>'expires_at', '')::timestamptz,
      coalesce((p_fields->>'is_active')::boolean, true), coalesce((p_fields->>'is_listed')::boolean, true)
    ) returning id into v_id;
  else
    update coupons set
      code = p_fields->>'code',
      kind = v_kind,
      assigned_user_id = nullif(p_fields->>'assigned_user_id', '')::uuid,
      description = nullif(trim(coalesce(p_fields->>'description', '')), ''),
      type = coalesce(nullif(p_fields->>'type', ''), 'PERCENT')::coupon_type,
      value = (p_fields->>'value')::numeric,
      max_discount = nullif(p_fields->>'max_discount', '')::numeric,
      min_order = coalesce(nullif(p_fields->>'min_order', '')::numeric, 0),
      max_uses = nullif(p_fields->>'max_uses', '')::int,
      per_user_limit = nullif(p_fields->>'per_user_limit', '')::int,
      first_order_only = coalesce((p_fields->>'first_order_only')::boolean, false),
      starts_at = nullif(p_fields->>'starts_at', '')::timestamptz,
      expires_at = nullif(p_fields->>'expires_at', '')::timestamptz,
      is_active = coalesce((p_fields->>'is_active')::boolean, true),
      is_listed = coalesce((p_fields->>'is_listed')::boolean, true)
    where id = v_id;
    if not found then raise exception 'Coupon not found'; end if;
  end if;

  delete from coupon_categories where coupon_id = v_id;
  insert into coupon_categories (coupon_id, category_id)
  select distinct v_id, c from unnest(coalesce(p_categories, '{}')) c where c is not null;
  delete from coupon_excluded_products where coupon_id = v_id;
  insert into coupon_excluded_products (coupon_id, product_id)
  select distinct v_id, x from unnest(coalesce(p_excluded, '{}')) x where x is not null;
  return v_id;
exception when unique_violation then
  raise exception 'That code is already used by another coupon';
end $$;

-- ---------------------------------------------------------------- welcome offer
create table if not exists public.welcome_offer_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  code_prefix text not null default 'VAULT',
  valid_days integer not null default 30 check (valid_days between 1 and 365),
  min_order numeric(10,2) not null default 0 check (min_order >= 0),
  max_discount numeric(10,2) check (max_discount is null or max_discount > 0),
  first_order_only boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.welcome_offer_settings default values on conflict (id) do nothing;

create table if not exists public.welcome_offer_tiers (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  discount_type coupon_type not null default 'PERCENT',
  discount_value numeric(10,2) not null check (discount_value > 0),
  target_percent integer not null default 0 check (target_percent >= 0),
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.welcome_offer_settings enable row level security;
alter table public.welcome_offer_tiers enable row level security;
drop policy if exists "welcome settings admin" on public.welcome_offer_settings;
create policy "welcome settings admin" on public.welcome_offer_settings for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
drop policy if exists "welcome tiers admin" on public.welcome_offer_tiers;
create policy "welcome tiers admin" on public.welcome_offer_tiers for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

/** One personal welcome code per customer, tier picked by weight. Returns the code, or null. */
create or replace function public.issue_welcome_coupon(p_user uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  s welcome_offer_settings;
  v_tier record;
  v_total numeric;
  v_pick numeric;
  v_code text;
  v_tries integer := 0;
begin
  select * into s from welcome_offer_settings limit 1;
  if not found or not s.enabled or p_user is null then return null; end if;
  if exists (select 1 from coupons where kind = 'welcome' and assigned_user_id = p_user) then return null; end if;
  select coalesce(sum(target_percent), 0) into v_total from welcome_offer_tiers where is_active and target_percent > 0;
  if v_total = 0 then return null; end if;
  v_pick := random() * v_total;
  select t.id, t.label, t.discount_type, t.discount_value into v_tier
  from (select w.*, sum(w.target_percent) over (order by w.position, w.created_at, w.id) as cum
        from welcome_offer_tiers w where w.is_active and w.target_percent > 0) t
  where t.cum > v_pick order by t.cum limit 1;

  loop
    v_code := s.code_prefix || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    begin
      insert into coupons (code, kind, assigned_user_id, description, type, value, min_order, max_discount, max_uses,
                           per_user_limit, first_order_only, expires_at, is_active, is_listed, welcome_tier_id)
      values (v_code, 'welcome', p_user, 'Welcome offer · ' || v_tier.label, v_tier.discount_type, v_tier.discount_value,
              s.min_order, s.max_discount, 1, 1, s.first_order_only, now() + make_interval(days => s.valid_days), true, true, v_tier.id);
      return v_code;
    exception when unique_violation then
      if exists (select 1 from coupons where kind = 'welcome' and assigned_user_id = p_user) then return null; end if;
      v_tries := v_tries + 1;
      if v_tries >= 5 then return null; end if;
    end;
  end loop;
end $$;

create or replace function public.save_welcome_offer(p_settings jsonb, p_tiers jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_prefix text := upper(regexp_replace(coalesce(p_settings->>'code_prefix', 'VAULT'), '[^A-Za-z0-9]', '', 'g'));
  v_keep uuid[] := '{}';
  t jsonb;
  v_id uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;
  if length(v_prefix) < 2 or length(v_prefix) > 12 then raise exception 'The code prefix needs 2–12 letters or digits'; end if;
  update welcome_offer_settings set
    enabled = coalesce((p_settings->>'enabled')::boolean, false),
    code_prefix = v_prefix,
    valid_days = coalesce(nullif(p_settings->>'valid_days', '')::int, 30),
    min_order = coalesce(nullif(p_settings->>'min_order', '')::numeric, 0),
    max_discount = nullif(p_settings->>'max_discount', '')::numeric,
    first_order_only = coalesce((p_settings->>'first_order_only')::boolean, true),
    updated_at = now();

  for t in select * from jsonb_array_elements(coalesce(p_tiers, '[]'::jsonb)) loop
    if length(trim(coalesce(t->>'label', ''))) = 0 then raise exception 'Every tier needs a name'; end if;
    if (t->>'discount_type') = 'PERCENT' and (t->>'discount_value')::numeric > 100 then raise exception 'A percent discount can be at most 100'; end if;
    v_id := nullif(t->>'id', '')::uuid;
    if v_id is not null and exists (select 1 from welcome_offer_tiers where id = v_id) then
      update welcome_offer_tiers set label = trim(t->>'label'), discount_type = (t->>'discount_type')::coupon_type,
        discount_value = (t->>'discount_value')::numeric, target_percent = coalesce((t->>'target_percent')::int, 0),
        is_active = coalesce((t->>'is_active')::boolean, true), position = coalesce((t->>'position')::int, 0)
      where id = v_id;
    else
      insert into welcome_offer_tiers (label, discount_type, discount_value, target_percent, is_active, position)
      values (trim(t->>'label'), (t->>'discount_type')::coupon_type, (t->>'discount_value')::numeric,
              coalesce((t->>'target_percent')::int, 0), coalesce((t->>'is_active')::boolean, true), coalesce((t->>'position')::int, 0))
      returning id into v_id;
    end if;
    v_keep := v_keep || v_id;
  end loop;
  -- Removed tiers: deleted when no code was issued from them, otherwise switched off (keeps the stats).
  update welcome_offer_tiers w set is_active = false
  where not (w.id = any(v_keep)) and exists (select 1 from coupons c where c.welcome_tier_id = w.id);
  delete from welcome_offer_tiers w
  where not (w.id = any(v_keep)) and not exists (select 1 from coupons c where c.welcome_tier_id = w.id);
end $$;

create or replace function public.welcome_offer_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;
  return jsonb_build_object(
    'issued', (select count(*) from coupons where kind = 'welcome'),
    'used', (select count(*) from coupons c where c.kind = 'welcome' and c.used_count > 0),
    'tiers', coalesce((
      select jsonb_agg(jsonb_build_object('tier_id', w.id, 'label', w.label, 'target_percent', w.target_percent,
        'is_active', w.is_active,
        'issued', (select count(*) from coupons c where c.welcome_tier_id = w.id),
        'used', (select count(*) from coupons c where c.welcome_tier_id = w.id and c.used_count > 0)) order by w.position, w.created_at)
      from welcome_offer_tiers w), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------- birthday codes
/** One single-use BDAY-XXXXXX code per customer per calendar year (IST). Returns how many were created. */
create or replace function public.issue_birthday_coupons(p_user_ids uuid[], p_discount_type text, p_discount_value numeric,
  p_max_discount numeric, p_min_order numeric, p_valid_days integer)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_year integer := extract(year from (now() at time zone 'Asia/Kolkata'))::int;
  v_user uuid;
  v_code text;
  v_made integer := 0;
  v_tries integer;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;
  if p_discount_value is null or p_discount_value <= 0 then raise exception 'The discount must be above 0'; end if;
  if p_discount_type = 'PERCENT' and p_discount_value > 100 then raise exception 'A percent discount can be at most 100'; end if;
  if coalesce(p_valid_days, 0) < 1 or p_valid_days > 365 then raise exception 'Valid for 1–365 days'; end if;

  for v_user in select distinct u from unnest(coalesce(p_user_ids, '{}')) u where u is not null loop
    continue when not exists (select 1 from profiles where id = v_user);
    continue when exists (select 1 from coupons where kind = 'birthday' and assigned_user_id = v_user and bday_year = v_year);
    v_tries := 0;
    loop
      v_code := 'BDAY-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
      begin
        insert into coupons (code, kind, assigned_user_id, bday_year, description, type, value, max_discount, min_order,
                             max_uses, per_user_limit, expires_at, is_active, is_listed)
        values (v_code, 'birthday', v_user, v_year, 'Birthday ' || v_year, p_discount_type::coupon_type, p_discount_value,
                nullif(p_max_discount, 0), coalesce(p_min_order, 0), 1, 1, now() + make_interval(days => p_valid_days), true, true);
        v_made := v_made + 1;
        exit;
      exception when unique_violation then
        exit when exists (select 1 from coupons where kind = 'birthday' and assigned_user_id = v_user and bday_year = v_year);
        v_tries := v_tries + 1;
        exit when v_tries >= 5;
      end;
    end loop;
  end loop;
  return v_made;
end $$;

-- ---------------------------------------------------------------- grants
revoke all on function public.coupon_evaluate(public.coupons, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.issue_welcome_coupon(uuid) from public, anon, authenticated;
revoke all on function public.save_coupon(uuid, jsonb, uuid[], uuid[]) from public, anon;
grant execute on function public.save_coupon(uuid, jsonb, uuid[], uuid[]) to authenticated;
revoke all on function public.save_welcome_offer(jsonb, jsonb) from public, anon;
grant execute on function public.save_welcome_offer(jsonb, jsonb) to authenticated;
revoke all on function public.welcome_offer_stats() from public, anon;
grant execute on function public.welcome_offer_stats() to authenticated;
revoke all on function public.issue_birthday_coupons(uuid[], text, numeric, numeric, numeric, integer) from public, anon;
grant execute on function public.issue_birthday_coupons(uuid[], text, numeric, numeric, numeric, integer) to authenticated;
