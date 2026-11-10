-- Store-only products: sold in the Vault 26 shop through the billing app,
-- never shown or sold on vault26.co.in.
--   * products.store_only (default false) - set in Admin -> Products.
--   * Website visitors and customers cannot read store-only products at all
--     (RLS), so no listing, search, product page or wishlist can show them.
--     Website admins and billing staff still read them.
--   * An online order can never contain one: order_items refuses the line
--     before payment (create_order inserts order_items before Razorpay).
--     ₹0 replacement orders of something sold earlier are not blocked.
-- Works whether or not the billing app's 'staff' role exists yet (the role
-- is compared as text).

alter table public.products add column if not exists store_only boolean not null default false;

create or replace function public.can_see_store_only()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role::text in ('admin', 'staff')
  );
$$;
grant execute on function public.can_see_store_only() to anon, authenticated;

drop policy if exists "prod public read" on public.products;
create policy "prod public read" on public.products
  for select using (not store_only or (select public.can_see_store_only()));

create or replace function public.order_items_block_store_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if new.variant_id is null then
    return new;
  end if;
  if exists (select 1 from orders o where o.id = new.order_id and o.replacement_of is not null) then
    return new;
  end if;
  select p.name into v_name
  from product_variants v
  join products p on p.id = v.product_id
  where v.id = new.variant_id and p.store_only;
  if v_name is not null then
    raise exception '% is sold only in the Vault 26 store. Remove it from your bag to continue.', v_name;
  end if;
  return new;
end;
$$;

drop trigger if exists order_items_block_store_only on public.order_items;
create trigger order_items_block_store_only
  before insert on public.order_items
  for each row execute function public.order_items_block_store_only();
