-- Customers: date of birth (set once), address labels + one default, and signup extras
-- (welcome code + a queued WhatsApp welcome message).

alter table public.profiles add column if not exists dob date;

-- A customer can set their birthday once; after that only admins (or the SQL editor) change it.
-- Stops moving the birthday around to collect a birthday code every month.
create or replace function public.profiles_dob_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.dob is not distinct from old.dob then return new; end if;
  if new.dob is not null and (new.dob > (now() at time zone 'Asia/Kolkata')::date or new.dob < date '1900-01-01') then
    raise exception 'dob_invalid';
  end if;
  if tg_op = 'UPDATE' and old.dob is not null and auth.uid() is not null and not public.has_role(auth.uid(), 'admin') then
    raise exception 'dob_locked';
  end if;
  return new;
end $$;

drop trigger if exists profiles_dob_guard on public.profiles;
create trigger profiles_dob_guard before insert or update of dob on public.profiles
  for each row execute function public.profiles_dob_guard();

alter table public.addresses add column if not exists label text not null default 'Home';

create or replace function public.addresses_single_default()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_default then
    update addresses set is_default = false where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return null;
end $$;

drop trigger if exists addresses_single_default on public.addresses;
create trigger addresses_single_default after insert or update of is_default on public.addresses
  for each row execute function public.addresses_single_default();

-- ---------------------------------------------------------------- WhatsApp welcome templates
insert into public.notification_templates (name, trigger_type, language, body_text, variables, is_active)
select v.name, 'welcome', 'en', v.body, v.vars, true
from (values
  ('welcome', 'Hi {{customer_name}}, welcome to Vault 26! Explore the archive: https://vault26.co.in', array['customer_name']),
  ('welcome_offer', 'Hi {{customer_name}}, welcome to Vault 26! Your welcome code {{discount_code}} is waiting at checkout: https://vault26.co.in', array['customer_name', 'discount_code'])
) as v(name, body, vars)
where not exists (select 1 from public.notification_templates t where t.name = v.name);

-- ---------------------------------------------------------------- signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_phone text := regexp_replace(coalesce(new.raw_user_meta_data->>'phone', ''), '\D', '', 'g');
  v_name text := coalesce(nullif(trim(coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', '')), ''), 'there');
begin
  insert into public.profiles (id, name, email, phone)
  values (new.id, new.raw_user_meta_data->>'name', new.email, new.raw_user_meta_data->>'phone');
  insert into public.user_roles (user_id, role) values (new.id, 'customer');

  -- Extras never block a signup.
  begin
    v_code := public.issue_welcome_coupon(new.id);
  exception when others then
    raise warning 'welcome coupon not issued for %: %', new.id, sqlerrm;
    v_code := null;
  end;
  begin
    if length(v_phone) = 10 then v_phone := '91' || v_phone; end if;
    if length(v_phone) between 11 and 15 then
      insert into public.notification_queue (to_phone, user_id, trigger_type, template_name, variables, idempotency_key, status, next_retry_at)
      values (v_phone, new.id, 'welcome',
              case when v_code is null then 'welcome' else 'welcome_offer' end,
              case when v_code is null then to_jsonb(array[v_name]) else to_jsonb(array[v_name, v_code]) end,
              'welcome_' || new.id, 'pending', now())
      on conflict (idempotency_key) do nothing;
    end if;
  exception when others then
    raise warning 'welcome message not queued for %: %', new.id, sqlerrm;
  end;
  return new;
end $$;
