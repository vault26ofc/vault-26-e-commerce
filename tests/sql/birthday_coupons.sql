-- Birthday codes: admin-only, every coupon field + category scope saved, one per customer per year. Always rolls back.
begin;
do $$
declare
  v_admin uuid; v_cust uuid; v_cat uuid; v_prod uuid; v_n int; c record;
begin
  select u.id into v_admin from auth.users u join public.user_roles r on r.user_id = u.id and r.role = 'admin' limit 1;
  select u.id into v_cust from auth.users u join public.profiles p on p.id = u.id where not public.has_role(u.id, 'admin') limit 1;
  if v_admin is null or v_cust is null then raise exception 'SETUP: need an admin and a non-admin user'; end if;
  select id into v_cat from public.categories limit 1;
  select id into v_prod from public.products limit 1;
  if v_cat is null or v_prod is null then raise exception 'SETUP: need a category and a product'; end if;
  delete from public.coupons where kind = 'birthday' and assigned_user_id = v_cust and bday_year = 2031;

  -- customers cannot release birthday codes
  perform set_config('request.jwt.claims', json_build_object('sub', v_cust, 'role', 'authenticated')::text, true);
  begin
    perform public.issue_birthday_coupons(array[v_cust], '{"value":10,"birthday":"2031-05-04"}'::jsonb, '{}', '{}');
    raise exception 'FAIL customer released a birthday code';
  exception when others then if sqlerrm not like 'Admins only%' then raise; end if; end;

  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  -- a bad prefix is refused
  begin
    perform public.issue_birthday_coupons(array[v_cust], '{"value":10,"code_prefix":"B","birthday":"2031-05-04"}'::jsonb, '{}', '{}');
    raise exception 'FAIL one-letter prefix accepted';
  exception when others then if sqlerrm not like 'The code prefix%' then raise; end if; end;

  -- every field and the scope are saved
  v_n := public.issue_birthday_coupons(array[v_cust, v_cust],
    jsonb_build_object('code_prefix', 'hbd', 'birthday', '2031-05-04', 'description', 'May birthdays', 'type', 'FLAT', 'value', 300,
      'max_discount', null, 'min_order', 1500, 'max_uses', 2, 'per_user_limit', 2, 'first_order_only', true,
      'starts_at', '2031-05-04T00:00:00+05:30', 'expires_at', '2031-06-04T00:00:00+05:30', 'is_active', true),
    array[v_cat], array[v_prod]);
  if v_n <> 1 then raise exception 'FAIL expected 1 code, made %', v_n; end if;
  select * into c from public.coupons where kind = 'birthday' and assigned_user_id = v_cust and bday_year = 2031;
  if c.code !~ '^HBD-[0-9A-F]{6}$' then raise exception 'FAIL code %', c.code; end if;
  if c.type <> 'FLAT' or c.value <> 300 or c.min_order <> 1500 or c.max_uses <> 2 or c.per_user_limit <> 2
     or not c.first_order_only or c.description <> 'May birthdays'
     or c.starts_at <> '2031-05-04T00:00:00+05:30'::timestamptz or c.expires_at <> '2031-06-04T00:00:00+05:30'::timestamptz then
    raise exception 'FAIL fields not saved: %', row_to_json(c);
  end if;
  if not exists (select 1 from public.coupon_categories where coupon_id = c.id and category_id = v_cat) then raise exception 'FAIL category scope'; end if;
  if not exists (select 1 from public.coupon_excluded_products where coupon_id = c.id and product_id = v_prod) then raise exception 'FAIL left-out product'; end if;

  -- one per customer per year
  v_n := public.issue_birthday_coupons(array[v_cust], '{"value":10,"birthday":"2031-12-01"}'::jsonb, '{}', '{}');
  if v_n <> 0 then raise exception 'FAIL second code in the same year'; end if;

  perform set_config('request.jwt.claims', '{"sub":null}', true);
  raise notice 'ALL BIRTHDAY COUPON TESTS PASSED';
end $$;
rollback;
