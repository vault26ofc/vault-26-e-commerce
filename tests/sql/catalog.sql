-- Catalog + inventory: save_product keeps variant ids, adjust_stock, stock history. Always rolls back.
begin;
do $$
declare
  v_admin uuid; v_cust uuid; v_cat uuid; v_pid uuid; v_keep uuid; v_drop uuid; v_new uuid;
  v_res jsonb; v_order uuid; v_n int; v_row record;
begin
  select u.id into v_admin from auth.users u join public.user_roles r on r.user_id = u.id and r.role = 'admin' limit 1;
  select u.id into v_cust from auth.users u where not public.has_role(u.id, 'admin') limit 1;
  if v_admin is null or v_cust is null then raise exception 'SETUP: need an admin and a non-admin user'; end if;
  insert into public.categories(name, slug, description, video, position) values ('__tc', '__tc-' || gen_random_uuid(), 'd', 'https://x/v.mp4', 3) returning id into v_cat;

  -- customers cannot save products
  perform set_config('request.jwt.claims', json_build_object('sub', v_cust, 'role', 'authenticated')::text, true);
  begin
    perform public.save_product('{"name":"x","slug":"x"}'::jsonb, '[]'::jsonb);
    raise exception 'FAIL customer saved a product';
  exception when others then if sqlerrm not like 'Admins only%' then raise; end if; end;

  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  -- create with two variants (and videos)
  v_pid := public.save_product(
    jsonb_build_object('name', '__tp', 'slug', '__tp-' || gen_random_uuid(), 'category_id', v_cat, 'images', '["https://x/a.jpg"]'::jsonb, 'videos', '["https://x/a.mp4"]'::jsonb, 'is_active', true),
    '[{"size":"M","color":"Red","color_hex":"#f00","price":500,"stock":4},{"size":"L","color":"Red","color_hex":"#f00","price":500,"stock":2}]'::jsonb);
  select id into v_keep from public.product_variants where product_id = v_pid and size = 'M';
  select id into v_drop from public.product_variants where product_id = v_pid and size = 'L';
  if (select videos from public.products where id = v_pid) <> array['https://x/a.mp4'] then raise exception 'FAIL videos not saved'; end if;
  select count(*) into v_n from public.inventory_movements where variant_id in (v_keep, v_drop) and reason = 'initial';
  if v_n <> 2 then raise exception 'FAIL initial stock movements: %', v_n; end if;

  -- an order references the kept variant
  v_res := public.create_order(null, 't@t.t', '{}'::jsonb, jsonb_build_array(jsonb_build_object('variant_id', v_keep, 'quantity', 1)), null, 'RAZORPAY');
  v_order := (v_res->>'id')::uuid;
  perform public.confirm_order_payment(v_order, 'pay_C1', 100);
  select * into v_row from public.inventory_movements where variant_id = v_keep and reason = 'order';
  if v_row is null or v_row.delta <> -1 or v_row.order_id <> v_order or v_row.stock_after <> 3 then raise exception 'FAIL order movement %', row_to_json(v_row); end if;

  -- edit: change the kept variant, drop L, add XL — kept id must survive, order link intact
  perform public.save_product(
    jsonb_build_object('id', v_pid, 'name', '__tp2', 'slug', (select slug from public.products where id = v_pid), 'category_id', v_cat),
    jsonb_build_array(
      jsonb_build_object('id', v_keep, 'size', 'M', 'color', 'Red', 'color_hex', '#f00', 'price', 650, 'stock', 3),
      jsonb_build_object('size', 'XL', 'color', 'Red', 'color_hex', '#f00', 'price', 700, 'stock', 1)));
  if not exists (select 1 from public.product_variants where id = v_keep and price = 650) then raise exception 'FAIL kept variant not updated in place'; end if;
  if exists (select 1 from public.product_variants where id = v_drop) then raise exception 'FAIL removed variant still there'; end if;
  if (select variant_id from public.order_items where order_id = v_order) <> v_keep then raise exception 'FAIL order lost its variant link'; end if;
  select id into v_new from public.product_variants where product_id = v_pid and size = 'XL';
  if v_new is null then raise exception 'FAIL new variant not inserted'; end if;
  if (select name from public.products where id = v_pid) <> '__tp2' then raise exception 'FAIL product not updated'; end if;

  -- duplicate size+colour is refused
  begin
    perform public.save_product(jsonb_build_object('id', v_pid, 'name', '__tp2', 'slug', (select slug from public.products where id = v_pid)),
      '[{"size":"M","color":"Red","price":1,"stock":1},{"size":"M","color":"Red","price":1,"stock":1}]'::jsonb);
    raise exception 'FAIL duplicate variant allowed';
  exception when others then if sqlerrm not like 'Duplicate variant%' then raise; end if; end;

  -- adjust_stock logs a manual movement and refuses negatives
  perform public.adjust_stock(v_new, 5, 'Restock from supplier');
  select * into v_row from public.inventory_movements where variant_id = v_new and reason = 'Restock from supplier';
  if v_row is null or v_row.delta <> 5 or v_row.stock_after <> 6 or v_row.created_by <> v_admin then raise exception 'FAIL adjust movement %', row_to_json(v_row); end if;
  begin
    perform public.adjust_stock(v_new, -100, 'oops');
    raise exception 'FAIL negative stock allowed';
  exception when others then if sqlerrm not like 'Stock cannot go below zero%' then raise; end if; end;

  -- cancelling the paid order logs a cancel movement
  update public.orders set status = 'CANCELLED' where id = v_order;
  if not exists (select 1 from public.inventory_movements where variant_id = v_keep and reason = 'cancel' and delta = 1) then raise exception 'FAIL cancel movement'; end if;

  -- extra categories: primary stays on products.category_id; extras replace on each save
  declare v_c2 uuid; v_c3 uuid; begin
    insert into public.categories(name, slug) values ('__tc2', '__tc2-' || gen_random_uuid()) returning id into v_c2;
    insert into public.categories(name, slug) values ('__tc3', '__tc3-' || gen_random_uuid()) returning id into v_c3;
    perform public.save_product(jsonb_build_object('id', v_pid, 'name', '__tp2', 'slug', (select slug from public.products where id = v_pid),
      'category_id', v_cat, 'extra_category_ids', jsonb_build_array(v_c2, v_c3, v_cat)),
      (select jsonb_agg(jsonb_build_object('id', id, 'size', size, 'color', color, 'price', price, 'stock', stock)) from public.product_variants where product_id = v_pid));
    select count(*) into v_n from public.product_categories where product_id = v_pid;
    if v_n <> 2 then raise exception 'FAIL extra categories (primary must not be duplicated): %', v_n; end if;
    perform public.save_product(jsonb_build_object('id', v_pid, 'name', '__tp2', 'slug', (select slug from public.products where id = v_pid),
      'category_id', v_cat, 'extra_category_ids', jsonb_build_array(v_c3)),
      (select jsonb_agg(jsonb_build_object('id', id, 'size', size, 'color', color, 'price', price, 'stock', stock)) from public.product_variants where product_id = v_pid));
    if (select array_agg(category_id) from public.product_categories where product_id = v_pid) <> array[v_c3] then raise exception 'FAIL extra categories not replaced'; end if;
    -- saving without the key leaves extras untouched
    perform public.save_product(jsonb_build_object('id', v_pid, 'name', '__tp2', 'slug', (select slug from public.products where id = v_pid)),
      (select jsonb_agg(jsonb_build_object('id', id, 'size', size, 'color', color, 'price', price, 'stock', stock)) from public.product_variants where product_id = v_pid));
    if not exists (select 1 from public.product_categories where product_id = v_pid and category_id = v_c3) then raise exception 'FAIL extras dropped when key absent'; end if;
  end;

  -- product_categories integrity without FKs: bad ids refused, deletes clean up
  begin
    insert into public.product_categories(product_id, category_id) values (gen_random_uuid(), v_cat);
    raise exception 'FAIL orphan product_categories row allowed';
  exception when others then if sqlerrm not like 'product_categories: product%' then raise; end if; end;
  insert into public.product_categories(product_id, category_id) values (v_pid, v_cat) on conflict do nothing;
  delete from public.categories where id = v_cat;
  if exists (select 1 from public.product_categories where category_id = v_cat) then raise exception 'FAIL category delete left rows'; end if;
  -- PostgREST must see exactly one products→categories relationship
  if (select count(*) from pg_constraint where contype = 'f' and conrelid = 'public.product_categories'::regclass) <> 0 then
    raise exception 'FAIL product_categories has foreign keys again (breaks categories(...) embeds)';
  end if;

  -- customers cannot read stock history
  perform set_config('request.jwt.claims', json_build_object('sub', v_cust, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.inventory_movements;
  reset role;
  if v_n <> 0 then raise exception 'FAIL customers can read inventory_movements (% rows)', v_n; end if;
  perform set_config('request.jwt.claims', '{"sub":null}', true);

  raise notice 'ALL CATALOG TESTS PASSED';
end $$;
rollback;
