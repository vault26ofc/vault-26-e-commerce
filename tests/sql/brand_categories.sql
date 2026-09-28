-- Brands belong to any number of categories. Always rolls back.
begin;
do $$
declare v_brand uuid; v_c1 uuid; v_c2 uuid; v_n int;
begin
  insert into public.brands(name, slug) values ('__tb', '__tb-' || gen_random_uuid()) returning id into v_brand;
  insert into public.categories(name, slug) values ('__tc1', '__tc1-' || gen_random_uuid()) returning id into v_c1;
  insert into public.categories(name, slug) values ('__tc2', '__tc2-' || gen_random_uuid()) returning id into v_c2;
  insert into public.brand_categories(brand_id, category_id) values (v_brand, v_c1), (v_brand, v_c2);
  select count(*) into v_n from public.brand_categories where brand_id = v_brand;
  if v_n <> 2 then raise exception 'FAIL link count %', v_n; end if;
  begin
    insert into public.brand_categories(brand_id, category_id) values (gen_random_uuid(), v_c1);
    raise exception 'FAIL orphan brand allowed';
  exception when others then if sqlerrm not like 'brand_categories: brand%' then raise; end if; end;
  delete from public.categories where id = v_c1;
  delete from public.brands where id = v_brand;
  if exists (select 1 from public.brand_categories where brand_id = v_brand) then raise exception 'FAIL cleanup'; end if;
  if (select count(*) from pg_constraint where contype = 'f' and conrelid = 'public.brand_categories'::regclass) <> 0 then
    raise exception 'FAIL brand_categories must not have foreign keys (breaks brands/categories embeds)';
  end if;
  raise notice 'ALL BRAND CATEGORY TESTS PASSED';
end $$;
rollback;
