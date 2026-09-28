-- Mega menu v2: links belong to tabs directly, per-link visibility, max 2 featured products. Rolls back.
begin;
do $$
declare v_tab uuid; v_p1 uuid; v_p2 uuid; v_p3 uuid; v_n int; v_ids uuid[];
begin
  -- every existing link has been attached to its tab
  if exists (select 1 from public.mega_menu_links where tab_id is null) then raise exception 'FAIL link without tab_id'; end if;
  -- lookbook became a page tab
  if exists (select 1 from public.mega_menu_tabs where custom_href = '/lookbook' and tab_type <> 'page') then raise exception 'FAIL lookbook not a page tab'; end if;

  insert into public.mega_menu_tabs(tab_type, custom_label, custom_href, position) values ('page', '__T', '/shop', 999) returning id into v_tab;
  select array_agg(id order by id) into v_ids from (select id from public.products order by id limit 3) x;
  v_p1 := v_ids[1]; v_p2 := v_ids[2]; v_p3 := v_ids[3];
  insert into public.mega_menu_featured(tab_id, product_id, position) values (v_tab, v_p1, 0), (v_tab, v_p2, 1);
  begin
    insert into public.mega_menu_featured(tab_id, product_id, position) values (v_tab, v_p3, 2);
    raise exception 'FAIL third featured product allowed';
  exception when others then if sqlerrm not like 'A tab can feature at most 2 products%' then raise; end if; end;
  delete from public.mega_menu_tabs where id = v_tab;
  select count(*) into v_n from public.mega_menu_featured where tab_id = v_tab;
  if v_n <> 0 then raise exception 'FAIL featured not removed with tab'; end if;
  raise notice 'ALL MEGA MENU TESTS PASSED';
end $$;
rollback;
