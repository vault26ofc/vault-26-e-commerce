-- Shiprocket: shipment/return columns, PACKED → auto shipment, CANCELLED → Shiprocket cancel,
-- admin replacement orders, realtime for the admin orders table.
--
-- One-off setup (NOT in this file — secrets): Vault secrets `functions_base_url`
-- (https://<ref>.supabase.co/functions/v1) and `shipping_hook_secret` (= Edge secret SHIPPING_HOOK_SECRET).

create extension if not exists pg_net;

do $$ begin
  create type public.return_status as enum
    ('NONE', 'REQUESTED', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'RECEIVED', 'REFUNDED', 'REPLACED', 'REJECTED');
exception when duplicate_object then null; end $$;

alter table public.orders
  add column if not exists shiprocket_order_id text,
  add column if not exists shipment_id text,
  add column if not exists awb_number text,
  add column if not exists courier_name text,
  add column if not exists tracking_url text,
  add column if not exists pickup_scheduled_at timestamptz,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists rto_initiated_at timestamptz,
  add column if not exists shipping_status text,
  add column if not exists shipping_error text,
  add column if not exists shiprocket_cancelled_at timestamptz,
  add column if not exists return_status public.return_status not null default 'NONE',
  add column if not exists return_reason text,
  add column if not exists return_requested_at timestamptz,
  add column if not exists return_shiprocket_order_id text,
  add column if not exists return_shipment_id text,
  add column if not exists return_awb text,
  add column if not exists return_tracking_url text,
  add column if not exists return_received_at timestamptz,
  add column if not exists replacement_of uuid references public.orders(id),
  add column if not exists replacement_order_id uuid references public.orders(id);

create index if not exists orders_awb_number_idx on public.orders (awb_number) where awb_number is not null;
create index if not exists orders_return_awb_idx on public.orders (return_awb) where return_awb is not null;

insert into public.settings(key, value) values ('return_window_days', '7'::jsonb) on conflict (key) do nothing;

-- ---------------------------------------------------------------- DB → edge function calls
create or replace function public.call_shipping_function(p_function text, p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_base text;
  v_secret text;
begin
  select decrypted_secret into v_base from vault.decrypted_secrets where name = 'functions_base_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'shipping_hook_secret';
  if v_base is null or v_secret is null then
    raise warning 'Shipping hook not configured (vault secrets missing); % not called for %', p_function, p_order_id;
    update orders set shipping_error = 'Shipping automation is not configured' where id = p_order_id;
    return;
  end if;
  perform net.http_post(
    url := v_base || '/' || p_function,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-secret', v_secret),
    body := jsonb_build_object('order_id', p_order_id),
    timeout_milliseconds := 60000
  );
end;
$$;
revoke all on function public.call_shipping_function(text, uuid) from public, anon, authenticated;

create or replace function public.orders_shipping_hooks() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'PACKED' and old.status is distinct from 'PACKED' and new.awb_number is null then
    perform public.call_shipping_function('shiprocket-sync', new.id);
  elsif new.status = 'CANCELLED' and old.status is distinct from 'CANCELLED'
        and new.shiprocket_order_id is not null and new.shiprocket_cancelled_at is null then
    perform public.call_shipping_function('shiprocket-cancel', new.id);
  end if;
  return null;
end;
$$;
drop trigger if exists orders_shipping_hooks on public.orders;
create trigger orders_shipping_hooks after update of status on public.orders
  for each row execute function public.orders_shipping_hooks();

-- ---------------------------------------------------------------- replacement orders
create or replace function public.create_replacement_order(p_order_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_orig orders%rowtype;
  v_new uuid;
  v_item record;
  v_updated int;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;

  select * into v_orig from orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if v_orig.return_status <> 'RECEIVED' then raise exception 'Return must be RECEIVED before replacing (is %)', v_orig.return_status; end if;

  insert into orders (user_id, email, shipping_address, subtotal, discount, shipping, total,
                      payment_method, payment_status, cod_advance_amount, stock_committed, replacement_of, notes)
  values (v_orig.user_id, v_orig.email, v_orig.shipping_address, 0, 0, 0, 0,
          'RAZORPAY', 'PAID', 0, true, v_orig.id, 'Replacement for ' || v_orig.order_number)
  returning id into v_new;

  for v_item in select * from order_items where order_id = p_order_id loop
    insert into order_items (order_id, variant_id, product_name, variant_label, image, quantity, price_at_purchase)
    values (v_new, v_item.variant_id, v_item.product_name, v_item.variant_label, v_item.image, v_item.quantity, v_item.price_at_purchase);
    if v_item.variant_id is not null then
      update product_variants set stock = stock - v_item.quantity where id = v_item.variant_id and stock >= v_item.quantity;
      get diagnostics v_updated = row_count;
      if v_updated = 0 then raise exception 'Not enough stock to replace %', v_item.product_name; end if;
    end if;
  end loop;

  update orders set return_status = 'REPLACED', replacement_order_id = v_new where id = v_orig.id;
  update orders set status = 'PACKED' where id = v_new; -- ships automatically via orders_shipping_hooks
  return v_new;
end;
$$;
revoke all on function public.create_replacement_order(uuid) from public, anon;
grant execute on function public.create_replacement_order(uuid) to authenticated;

-- ---------------------------------------------------------------- realtime for admin orders table
do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null; end $$;
