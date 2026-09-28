# Shiprocket shipping, cancellation and returns — design

Date: 2026-09-28 · Sub-project D (moved ahead of A at the user's request). Approved in chat.

## Flow

1. Customer pays → order `PENDING` (paid, or COD advance paid).
2. Admin sets status `PACKED` → DB trigger calls `shiprocket-sync` via `pg_net` → Shiprocket order
   created, courier + AWB assigned, pickup booked at location `work`. Order keeps `PACKED`, gains
   AWB/courier/tracking link.
3. Shiprocket webhook `shipment-status-webhook` moves the order:
   picked up / in transit / out for delivery → `SHIPPED` (+ `shipped_at`);
   delivered → `DELIVERED` (+ `delivered_at`; COD flips to PAID via existing trigger);
   RTO → `rto_initiated_at`.
4. Order with a Shiprocket order set to `CANCELLED` → trigger calls `shiprocket-cancel`: cancel the
   Shiprocket order; if already manifested, cancel by AWB (starts RTO). Existing restock/refund applies.
5. Returns: customer requests within `return_window_days` (default 7) of `delivered_at` →
   `shiprocket-return` books reverse pickup to the `work` warehouse. Webhook on the return AWB:
   picked/in transit → `IN_TRANSIT`; delivered → `RECEIVED`. Admin → Returns: **Refund** (Razorpay,
   online-paid amount; COD cash is refunded by hand, shown on the page) or **Replace** (₹0
   replacement order, same items, stock taken, set `PACKED` so it ships automatically).

## Decisions

- Parcel: 30×25×5 cm; weight `max(0.5, 0.25 × units)` kg (from the user's notes).
- Payment type: `Prepaid`, or `COD` with `sub_total` = balance due (total − advance). **To verify on
  the first live COD shipment** that the courier collects exactly that.
- Replacement orders: `Prepaid`, declared value = sum of item prices.
- Courier: Shiprocket's recommended courier (no `courier_id`).
- Internal calls (DB → function) authenticate with `SHIPPING_HOOK_SECRET` (Supabase secret + Vault);
  admin retries authenticate with an admin JWT.
- Webhook authenticates with `x-api-key` = `SHIPROCKET_WEBHOOK_SECRET`; deployed `verify_jwt = false`.
  Always 200 for events it can't match (Shiprocket disables webhooks that keep failing).
- Errors never block the admin: saved to `orders.shipping_error`, shown with **Retry shipment**.
- Admin orders table subscribes to Realtime on `orders`.
- No live shipment is created by automated tests: AWB assignment and pickup cost wallet money and
  dispatch a courier. Payload building and status mapping are unit-tested; the first real shipment
  is done with the user.

## Schema (migration `20260928020000_shiprocket.sql`)

`orders` + `shiprocket_order_id`, `shipment_id`, `awb_number`, `courier_name`, `tracking_url`,
`pickup_scheduled_at`, `shipped_at`, `delivered_at`, `rto_initiated_at`, `shipping_status` (last raw
Shiprocket status), `shipping_error`, `shiprocket_cancelled_at`, `return_status` (enum NONE /
REQUESTED / PICKUP_SCHEDULED / IN_TRANSIT / RECEIVED / REFUNDED / REPLACED / REJECTED),
`return_reason`, `return_requested_at`, `return_shiprocket_order_id`, `return_shipment_id`,
`return_awb`, `return_tracking_url`, `return_received_at`, `replacement_of`, `replacement_order_id`.
Setting `return_window_days` (7). `pg_net` extension; Vault secrets `shipping_hook_secret`,
`functions_base_url`; triggers `orders_ship_on_packed`, `orders_cancel_shipment`; admin-only
`create_replacement_order(p_order_id)`; `orders` in the `supabase_realtime` publication.

## Units

- `_shared/shipping-core.ts` (pure, unit-tested): `parcelFor`, `splitName`, `codCollectable`,
  `buildForwardOrder`, `buildReturnOrder`, `mapShipmentEvent`.
- `_shared/shiprocket.ts`: API client (login, create adhoc/return order, assign AWB, pickup, cancel,
  pickup locations).
- Functions: `shiprocket-sync`, `shiprocket-cancel`, `shiprocket-return`, `shipment-status-webhook`.
- UI: Admin Orders (shipping column, retry, realtime), Admin Returns (new page), customer order
  detail (tracking link, return request), Settings (`return_window_days`).
