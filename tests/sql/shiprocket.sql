-- Shiprocket DB wiring: PACKED/CANCELLED queue edge-function calls; admin-only replacement orders.
-- Runs in a transaction that always rolls back, so queued pg_net requests are never sent.
begin;
do $$
declare
  v_prod uuid; v_var uuid; v_order uuid; v_repl uuid; v_stock int; v_res jsonb; v_row public.orders%rowtype;
  v_admin uuid; v_cust uuid; v_q0 bigint; v_q1 bigint;
begin
  select u.id into v_admin from auth.users u join public.user_roles r on r.user_id = u.id and r.role = 'admin' limit 1;
  select u.id into v_cust from auth.users u where not public.has_role(u.id, 'admin') limit 1;
  if v_admin is null or v_cust is null then raise exception 'SETUP: need an admin and a non-admin user'; end if;

  insert into public.products(name, slug) values ('__t', '__t-' || gen_random_uuid()) returning id into v_prod;
  insert into public.product_variants(product_id, price, stock) values (v_prod, 500, 5) returning id into v_var;
  v_res := public.create_order(null, 't@t.t', '{"full_name":"T T"}'::jsonb, jsonb_build_array(jsonb_build_object('variant_id', v_var, 'quantity', 2)), null, 'RAZORPAY');
  v_order := (v_res->>'id')::uuid;
  perform public.confirm_order_payment(v_order, 'pay_S1', 100);

  -- PACKED queues shiprocket-sync
  select count(*) into v_q0 from net.http_request_queue where url like '%/shiprocket-sync';
  update public.orders set status = 'PACKED' where id = v_order;
  select count(*) into v_q1 from net.http_request_queue where url like '%/shiprocket-sync';
  if v_q1 <> v_q0 + 1 then raise exception 'FAIL PACKED did not queue shiprocket-sync (% -> %)', v_q0, v_q1; end if;

  -- re-saving PACKED, or PACKED with an AWB, does not queue again
  update public.orders set notes = 'x' where id = v_order;
  update public.orders set awb_number = 'AWB1', status = 'PENDING' where id = v_order;
  update public.orders set status = 'PACKED' where id = v_order;
  select count(*) into v_q0 from net.http_request_queue where url like '%/shiprocket-sync';
  if v_q0 <> v_q1 then raise exception 'FAIL duplicate shiprocket-sync queued'; end if;

  -- CANCELLED with a Shiprocket order queues shiprocket-cancel
  update public.orders set shiprocket_order_id = '123' where id = v_order;
  select count(*) into v_q0 from net.http_request_queue where url like '%/shiprocket-cancel';
  update public.orders set status = 'CANCELLED' where id = v_order;
  select count(*) into v_q1 from net.http_request_queue where url like '%/shiprocket-cancel';
  if v_q1 <> v_q0 + 1 then raise exception 'FAIL CANCELLED did not queue shiprocket-cancel'; end if;

  -- replacement: customers may not create one
  update public.orders set status = 'DELIVERED', return_status = 'RECEIVED', user_id = v_cust where id = v_order;
  perform set_config('request.jwt.claims', json_build_object('sub', v_cust, 'role', 'authenticated')::text, true);
  begin
    perform public.create_replacement_order(v_order);
    raise exception 'FAIL customer created a replacement';
  exception when others then
    if sqlerrm not like 'Admins only%' then raise; end if;
  end;

  -- admin creates it: ₹0, PAID, stock taken, PACKED (queues shipment), original marked REPLACED
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  select stock into v_stock from public.product_variants where id = v_var;
  select count(*) into v_q0 from net.http_request_queue where url like '%/shiprocket-sync';
  v_repl := public.create_replacement_order(v_order);
  select * into v_row from public.orders where id = v_repl;
  if v_row.total <> 0 or v_row.payment_status <> 'PAID' or v_row.status <> 'PACKED'
     or v_row.replacement_of <> v_order or not v_row.stock_committed then
    raise exception 'FAIL replacement row %', row_to_json(v_row);
  end if;
  if (select stock from public.product_variants where id = v_var) <> v_stock - 2 then raise exception 'FAIL replacement stock'; end if;
  select count(*) into v_q1 from net.http_request_queue where url like '%/shiprocket-sync';
  if v_q1 <> v_q0 + 1 then raise exception 'FAIL replacement did not queue shipment'; end if;
  select * into v_row from public.orders where id = v_order;
  if v_row.return_status <> 'REPLACED' or v_row.replacement_order_id <> v_repl then raise exception 'FAIL original not marked REPLACED'; end if;

  -- only once
  begin
    perform public.create_replacement_order(v_order);
    raise exception 'FAIL second replacement allowed';
  exception when others then
    if sqlerrm not like 'Return must be RECEIVED%' then raise; end if;
  end;
  perform set_config('request.jwt.claims', '{"sub":null}', true);

  raise notice 'ALL SHIPROCKET DB TESTS PASSED';
end $$;
rollback;
