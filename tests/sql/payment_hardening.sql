begin;
do $$
declare
  v_prod uuid; v_var uuid; v_order uuid; v_order2 uuid; v_stock int; v_res jsonb; v_row public.orders%rowtype;
  v_cust uuid;
begin
  select u.id into v_cust from auth.users u where not public.has_role(u.id, 'admin') limit 1;
  if v_cust is null then raise exception 'SETUP: need at least one non-admin user in auth.users'; end if;
  insert into public.products(name, slug) values ('__t', '__t-' || gen_random_uuid()) returning id into v_prod;
  insert into public.product_variants(product_id, price, stock) values (v_prod, 500, 3) returning id into v_var;

  -- create_order: COD advance always charged
  perform set_config('request.jwt.claims', '{"sub":null}', true);
  v_res := public.create_order(null, 't@t.t', '{}'::jsonb, jsonb_build_array(jsonb_build_object('variant_id', v_var, 'quantity', 1)), null, 'COD');
  if (v_res->>'cod_advance_amount')::numeric <> round((v_res->>'total')::numeric * 20 / 100, 2) then
    raise exception 'FAIL advance: %', v_res; end if;

  -- COD minimum
  insert into public.settings(key, value) values ('cod_min_order', '100000') on conflict (key) do update set value = excluded.value;
  begin
    perform public.create_order(null, 't@t.t', '{}'::jsonb, jsonb_build_array(jsonb_build_object('variant_id', v_var, 'quantity', 1)), null, 'COD');
    raise exception 'FAIL cod_min not enforced';
  exception when others then
    if sqlerrm not like 'COD is available%' then raise; end if;
  end;
  update public.settings set value = '0' where key = 'cod_min_order';

  -- confirm: prepaid, qty 2
  v_res := public.create_order(null, 't@t.t', '{}'::jsonb, jsonb_build_array(jsonb_build_object('variant_id', v_var, 'quantity', 2)), null, 'RAZORPAY');
  v_order := (v_res->>'id')::uuid;
  perform public.confirm_order_payment(v_order, 'pay_T1', 100);
  select stock into v_stock from public.product_variants where id = v_var;
  if v_stock <> 1 then raise exception 'FAIL stock after confirm: %', v_stock; end if;
  select * into v_row from public.orders where id = v_order;
  if v_row.payment_status <> 'PAID' or v_row.razorpay_payment_id <> 'pay_T1' then raise exception 'FAIL paid state'; end if;

  -- replay: same payment id is a no-op
  v_res := public.confirm_order_payment(v_order, 'pay_T1', 100);
  select stock into v_stock from public.product_variants where id = v_var;
  if v_stock <> 1 or (v_res->>'already')::boolean is not true then raise exception 'FAIL replay: stock % res %', v_stock, v_res; end if;

  -- out of stock: order for 1 made while stock 1, then stock drops to 0 before payment
  v_res := public.create_order(null, 't@t.t', '{}'::jsonb, jsonb_build_array(jsonb_build_object('variant_id', v_var, 'quantity', 1)), null, 'COD');
  v_order2 := (v_res->>'id')::uuid;
  update public.product_variants set stock = 0 where id = v_var;
  begin
    perform public.confirm_order_payment(v_order2, 'pay_T2', 100);
    raise exception 'FAIL out of stock not raised';
  exception when others then
    if sqlerrm <> 'OUT_OF_STOCK' then raise; end if;
  end;

  -- COD: advance keeps PENDING, delivery flips to PAID
  update public.product_variants set stock = 5 where id = v_var;
  perform public.confirm_order_payment(v_order2, 'pay_T3', 100);
  select * into v_row from public.orders where id = v_order2;
  if v_row.payment_status <> 'PENDING' or not v_row.cod_advance_paid then raise exception 'FAIL cod advance state'; end if;
  update public.orders set status = 'DELIVERED' where id = v_order2;
  select * into v_row from public.orders where id = v_order2;
  if v_row.payment_status <> 'PAID' then raise exception 'FAIL cod paid on delivery'; end if;

  -- guard: a signed-in customer cannot mark their order paid, but can cancel it
  update public.orders set user_id = v_cust, status = 'PENDING', payment_status = 'PENDING' where id = v_order2;
  perform set_config('request.jwt.claims', json_build_object('sub', v_cust, 'role', 'authenticated')::text, true);
  begin
    update public.orders set payment_status = 'PAID' where id = v_order2;
    raise exception 'FAIL guard allowed payment_status change';
  exception when others then
    if sqlerrm not like 'Customers can only cancel%' then raise; end if;
  end;
  update public.orders set status = 'CANCELLED' where id = v_order2;
  perform set_config('request.jwt.claims', '{"sub":null}', true);

  raise notice 'ALL PAYMENT HARDENING TESTS PASSED';
end $$;
rollback;
