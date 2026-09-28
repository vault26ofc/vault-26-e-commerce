-- Stock is returned exactly once when a paid order is cancelled. Always rolls back.
begin;
do $$
declare
  v_prod uuid; v_var uuid; v_order uuid; v_unpaid uuid; v_stock int; v_res jsonb; v_cust uuid;
begin
  select u.id into v_cust from auth.users u where not public.has_role(u.id, 'admin') limit 1;
  if v_cust is null then raise exception 'SETUP: need at least one non-admin user in auth.users'; end if;
  insert into public.products(name, slug) values ('__t', '__t-' || gen_random_uuid()) returning id into v_prod;
  insert into public.product_variants(product_id, price, stock) values (v_prod, 500, 5) returning id into v_var;

  -- paid order for 2 → stock 3
  v_res := public.create_order(null, 't@t.t', '{}'::jsonb, jsonb_build_array(jsonb_build_object('variant_id', v_var, 'quantity', 2)), null, 'RAZORPAY');
  v_order := (v_res->>'id')::uuid;
  perform public.confirm_order_payment(v_order, 'pay_G1', 100);
  select stock into v_stock from public.product_variants where id = v_var;
  if v_stock <> 3 then raise exception 'FAIL setup stock %', v_stock; end if;

  -- customer cancels their paid, not-yet-packed order → stock back to 5
  update public.orders set user_id = v_cust where id = v_order;
  perform set_config('request.jwt.claims', json_build_object('sub', v_cust, 'role', 'authenticated')::text, true);
  update public.orders set status = 'CANCELLED' where id = v_order;
  perform set_config('request.jwt.claims', '{"sub":null}', true);
  select stock into v_stock from public.product_variants where id = v_var;
  if v_stock <> 5 then raise exception 'FAIL restock on cancel: %', v_stock; end if;

  -- a second cancel-type write does not restock again
  update public.orders set status = 'CANCELLED', notes = 'x' where id = v_order;
  select stock into v_stock from public.product_variants where id = v_var;
  if v_stock <> 5 then raise exception 'FAIL double restock: %', v_stock; end if;

  -- cancelling an unpaid order never touches stock
  v_res := public.create_order(null, 't@t.t', '{}'::jsonb, jsonb_build_array(jsonb_build_object('variant_id', v_var, 'quantity', 1)), null, 'RAZORPAY');
  v_unpaid := (v_res->>'id')::uuid;
  update public.orders set status = 'CANCELLED' where id = v_unpaid;
  select stock into v_stock from public.product_variants where id = v_var;
  if v_stock <> 5 then raise exception 'FAIL unpaid cancel changed stock: %', v_stock; end if;

  raise notice 'ALL PAYMENT GAP TESTS PASSED';
end $$;
rollback;
