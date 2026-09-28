-- Return stock when an order whose stock was taken (payment confirmed) is cancelled.

alter table public.orders
  add column if not exists stock_committed boolean not null default false;

-- confirm_order_payment now records that stock was taken.
create or replace function public.confirm_order_payment(p_order_id uuid, p_payment_id text, p_amount_paise integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_order orders%rowtype;
  v_item record;
  v_updated int;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if v_order.razorpay_payment_id is not null then
    if v_order.razorpay_payment_id = p_payment_id then return jsonb_build_object('ok', true, 'already', true); end if;
    raise exception 'ALREADY_CONFIRMED';
  end if;
  if v_order.payment_status <> 'PENDING' or v_order.status = 'CANCELLED' or v_order.cod_advance_paid then
    raise exception 'NOT_PENDING';
  end if;

  for v_item in select variant_id, quantity from order_items where order_id = p_order_id loop
    update product_variants set stock = stock - v_item.quantity
    where id = v_item.variant_id and stock >= v_item.quantity;
    get diagnostics v_updated = row_count;
    if v_updated = 0 then raise exception 'OUT_OF_STOCK'; end if;
  end loop;

  if v_order.coupon_code is not null then
    update coupons set used_count = used_count + 1 where code = v_order.coupon_code;
  end if;

  update orders set
    razorpay_payment_id = p_payment_id,
    payment_amount_paise = p_amount_paise,
    payment_status = case when payment_method = 'COD' then payment_status else 'PAID'::payment_status end,
    cod_advance_paid = (payment_method = 'COD'),
    stock_committed = true
  where id = p_order_id;

  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.confirm_order_payment(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.confirm_order_payment(uuid, text, integer) to service_role;

-- Runs after orders_guard_customer_update (alphabetical), so the guard sees the customer's
-- untouched row; SECURITY DEFINER because customers cannot write product_variants.
create or replace function public.orders_restock_on_cancel() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_item record;
begin
  if new.status = 'CANCELLED' and old.status is distinct from 'CANCELLED' and old.stock_committed then
    for v_item in select variant_id, quantity from order_items where order_id = new.id and variant_id is not null loop
      update product_variants set stock = stock + v_item.quantity where id = v_item.variant_id;
    end loop;
    new.stock_committed := false;
  end if;
  return new;
end;
$$;
drop trigger if exists orders_restock_on_cancel on public.orders;
create trigger orders_restock_on_cancel before update of status on public.orders
  for each row execute function public.orders_restock_on_cancel();
