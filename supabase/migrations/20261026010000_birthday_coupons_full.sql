-- Birthday codes carry every coupon setting (limits, start/end, first order only, category scope,
-- left-out products), not just the discount. The admin picks a birthday date, sees who was born
-- that day, and releases one personal code to each.

drop function if exists public.issue_birthday_coupons(uuid[], text, numeric, numeric, numeric, integer);

/** One personal PREFIX-XXXXXX code per customer per birthday year (the year of p_fields.birthday,
    else this IST year). p_fields: the save_coupon fields plus code_prefix and birthday.
    Customers who already have a code for that year are skipped. Returns how many were created. */
create or replace function public.issue_birthday_coupons(p_user_ids uuid[], p_fields jsonb, p_categories uuid[], p_excluded uuid[])
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_prefix text := upper(regexp_replace(coalesce(p_fields->>'code_prefix', 'BDAY'), '[^A-Za-z0-9]', '', 'g'));
  v_year integer := coalesce(extract(year from nullif(p_fields->>'birthday', '')::date)::int,
                             extract(year from (now() at time zone 'Asia/Kolkata'))::int);
  v_note text := coalesce(nullif(trim(coalesce(p_fields->>'description', '')), ''), 'Birthday ' || v_year);
  v_user uuid;
  v_id uuid;
  v_made integer := 0;
  v_tries integer;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;
  if length(v_prefix) < 2 or length(v_prefix) > 12 then raise exception 'The code prefix needs 2–12 letters or digits'; end if;

  for v_user in select distinct u from unnest(coalesce(p_user_ids, '{}')) u where u is not null loop
    continue when not exists (select 1 from profiles where id = v_user);
    continue when exists (select 1 from coupons where kind = 'birthday' and assigned_user_id = v_user and bday_year = v_year);
    v_tries := 0;
    loop
      begin
        insert into coupons (code, kind, assigned_user_id, bday_year, description, type, value, max_discount, min_order,
                             max_uses, per_user_limit, first_order_only, starts_at, expires_at, is_active, is_listed)
        values (
          v_prefix || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)), 'birthday', v_user, v_year, v_note,
          coalesce(nullif(p_fields->>'type', ''), 'PERCENT')::coupon_type, (p_fields->>'value')::numeric,
          nullif(p_fields->>'max_discount', '')::numeric, coalesce(nullif(p_fields->>'min_order', '')::numeric, 0),
          nullif(p_fields->>'max_uses', '')::int, nullif(p_fields->>'per_user_limit', '')::int,
          coalesce((p_fields->>'first_order_only')::boolean, false),
          nullif(p_fields->>'starts_at', '')::timestamptz, nullif(p_fields->>'expires_at', '')::timestamptz,
          coalesce((p_fields->>'is_active')::boolean, true), true
        ) returning id into v_id;
        insert into coupon_categories (coupon_id, category_id)
        select distinct v_id, c from unnest(coalesce(p_categories, '{}')) c where c is not null;
        insert into coupon_excluded_products (coupon_id, product_id)
        select distinct v_id, x from unnest(coalesce(p_excluded, '{}')) x where x is not null;
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

revoke all on function public.issue_birthday_coupons(uuid[], jsonb, uuid[], uuid[]) from public, anon;
grant execute on function public.issue_birthday_coupons(uuid[], jsonb, uuid[], uuid[]) to authenticated;
notify pgrst, 'reload schema';
