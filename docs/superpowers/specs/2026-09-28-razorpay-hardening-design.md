# Razorpay hardening + real refunds — design

Date: 2026-09-28 · Sub-project C of the admin/payments/shipping overhaul (order E→C→A→B→D).

## Goal

Money can only be taken for the amount the database says is owed, a payment can only
count once, stock and coupon usage only change when money actually arrived, and the
admin REFUND action sends money back through Razorpay instead of only flipping a flag.

## Decisions (from the user)

- Keep the existing flow: `create_order` RPC inserts a `PENDING` order first, then the
  customer pays for it. (The "pay first, insert after" flow in the user's notes described
  a different codebase.)
- COD **always** requires an advance: `cod_advance_percent` (default 20) of the order
  total. The `cod_threshold` setting is retired.
- REFUND must call Razorpay's refund API.

## Current state (what is wrong)

1. `razorpay-create-order` charges whatever `amount` the browser sends.
2. `razorpay-verify-payment` checks only the HMAC signature; it never asks Razorpay what
   was actually captured or for how much.
3. Nothing prevents one `razorpay_payment_id` being attached to two orders.
4. Stock is checked in `create_order` but never decremented.
5. Coupon `used_count` increments at order creation, even if payment never happens.
6. COD advance is marked `payment_status = PAID`, although the balance is still due.
7. REFUND in admin only updates DB columns.

## Design

### 1. `razorpay-create-order` (edge function, rewritten)

- Input: `{ order_id }`. Any `amount` sent is ignored.
- Auth: bearer token → user. Loads the order with the service role; 403 unless
  `order.user_id = user.id`; 400 unless `payment_status = 'PENDING'`.
- Amount (paise) = `round(total * 100)` for `RAZORPAY`, `round(cod_advance_amount * 100)`
  for `COD`. 400 if < 100 paise.
- If the order already has a `razorpay_order_id`, fetch it from Razorpay and reuse it when
  its amount matches and its status is not `paid` (double-click safe). Otherwise create a
  new Razorpay order with `receipt = order_number`, `notes.order_id = order.id`, and save
  `razorpay_order_id` on the order row.
- Returns `{ order: { id, amount, currency }, key_id }` (same shape the client already
  consumes).
- Errors: 401 missing/invalid token, 403 not owner, 400 bad input/state, 502 Razorpay
  API failure (with Razorpay's error description), 500 otherwise.

### 2. `razorpay-verify-payment` (edge function, rewritten)

- Input: `{ order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature }`;
  400 if any missing.
- Auth + ownership as above.
- 400 unless `razorpay_order_id` equals the one stored on the order row.
- HMAC-SHA256(`razorpay_order_id|razorpay_payment_id`, KEY_SECRET), constant-time
  compare; 400 on mismatch (order untouched).
- `GET /v1/payments/{payment_id}`: require `order_id` match and `amount` equal to the
  expected paise. If status is `authorized`, call capture; require final status
  `captured`. Otherwise 400.
- If the order is already confirmed with this same payment id → return success
  (idempotent). With a different payment id → 409.
- Calls DB function `confirm_order_payment(order_id, razorpay_payment_id, amount_paise)`
  via service role.

### 3. DB function `confirm_order_payment` (new, SECURITY DEFINER, service role only)

One transaction, row-locks the order (`FOR UPDATE`):

- Re-checks `payment_status = 'PENDING'`.
- Decrements `product_variants.stock` for each `order_items` row with
  `UPDATE … SET stock = stock - qty WHERE id = … AND stock >= qty`; if any row fails,
  raises (verify returns 409 "out of stock"; the payment is then refunded automatically
  by the function via the refund path in §5 so the customer is never charged for
  nothing).
- Increments `coupons.used_count` for `coupon_code` (moved here from `create_order`).
- `RAZORPAY`: `payment_status = 'PAID'`. `COD`: `cod_advance_paid = true`,
  `payment_status` stays `PENDING` (balance due on delivery).
- Sets `razorpay_payment_id`.
- `EXECUTE` revoked from `anon`, `authenticated`; granted to `service_role` only.

### 4. Migration `20260928000000_payment_hardening.sql`

- Unique partial index on `orders(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL`.
- New columns: `razorpay_refund_id text`, `payment_amount_paise integer`.
- `create_order` replaced: COD advance always `round(total * cod_advance_percent / 100, 2)`;
  coupon increment removed (now in §3).
- Removes the `cod_threshold` row from `settings`; adds `cod_min_order` (default 0 = no
  minimum). `create_order` raises "COD is available on orders of ₹X or more" when a COD
  order's total is below it. Admin edits `cod_advance_percent` and `cod_min_order` in Settings.
- RLS hardening (holes found in the live policies):
  - drop `orders insert own` — customers could insert orders with arbitrary totals and
    `payment_status = PAID`. Orders are only created by `create_order` (SECURITY DEFINER).
  - drop `oi insert` — anyone could add items to any order.
  - trigger `orders_guard_customer_update`: for a signed-in non-admin the only allowed
    change is `status` PENDING → CANCELLED; any other column change raises.
- Trigger `trg_cod_paid_on_delivery` (BEFORE UPDATE on `orders`): when `status` changes
  to `DELIVERED` and `payment_method = 'COD'` and `payment_status = 'PENDING'`, set
  `payment_status = 'PAID'`. Delivery is when the courier collects the balance, so the
  order is fully paid at that point. Fires for every writer — the admin status dropdown
  and the Shiprocket webhook (sub-project D) alike.

### 4b. COD payment display (customer + admin)

| State | `cod_advance_paid` | `payment_status` | Label shown |
|---|---|---|---|
| Order placed, advance not paid | false | PENDING | "Awaiting advance" |
| Advance paid, not delivered | true | PENDING | "Advance ₹X paid · ₹Y due on delivery" |
| Delivered | true | PAID | "Paid in full" |

Shown on the order list and detail in `Orders.tsx`, the admin orders table, and the invoice.
A small pure helper `paymentLabel(order)` in `src/lib/payment.ts` produces it for every order (unit-tested); prepaid orders read "Paid" / "Awaiting payment" / "Payment failed", refunded ones "Refunded".

### 5. Refunds — `razorpay-refund` (new edge function)

- Admin only: bearer token → user → `has_role(user, 'admin')`, else 403.
- Actions:
  - `{ action: 'refund', order_id, amount }` — `amount` in rupees, must be > 0 and
    ≤ amount actually paid (`payment_amount_paise`). One refund per order; 409 if
    `razorpay_refund_id` is already set. Calls `POST /v1/payments/{id}/refund` with
    `amount` in paise, `notes.order_id`, `receipt`. Saves `razorpay_refund_id`,
    `refund_amount`; `refund_status = 'REFUNDED'` + `refunded_at` if Razorpay reports
    `processed`, else `PROCESSING`. Full refund also sets `payment_status = 'REFUNDED'`.
  - `{ action: 'sync', order_id }` — `GET /v1/refunds/{refund_id}`; moves `PROCESSING`
    to `REFUNDED` when Razorpay says `processed`.
- Orders with no `razorpay_payment_id` (nothing was charged) → 400 "nothing to refund".
- Internal use from §3's out-of-stock path calls the same refund helper (shared module
  `_shared/razorpay.ts`), not the HTTP endpoint.

### 6. Frontend

- `Checkout.tsx`: send `{ order_id }` to create-order; advance display uses
  `cod_advance_percent` on every COD order; listen to `payment.failed` and show
  Razorpay's `error.description`; dismissal keeps the existing "Payment cancelled".
- `AdminRefunds.tsx`: Manage dialog gets "Refund via Razorpay" (amount prefilled with
  amount paid, confirm step) and "Refresh status" when `PROCESSING`. Shows the
  Razorpay refund id. The manual status editor stays for REJECTED / notes.
- `AdminMisc.tsx` (Settings): replace "COD pre-payment threshold" with "COD minimum order
  (₹, 0 = none)"; keep "COD advance %".
- `Checkout.tsx`: COD option disabled, with "COD available on orders of ₹X or more", when
  the total is below `cod_min_order`.

### 7. Shared module

`supabase/functions/_shared/razorpay.ts`: basic-auth fetch wrapper, `getPayment`,
`capturePayment`, `createOrder`, `getOrder`, `createRefund`, `getRefund`, HMAC verify.
All three functions use it.

## Out of scope

- Expiring abandoned `PENDING` orders.
- Razorpay webhooks (verify + sync cover the flows).
- Multiple partial refunds per order.

## Testing

- Vitest: pure helpers (paise conversion, COD advance calc, signature verify with a
  known vector).
- Live (test keys) after deploy: prepaid order with card `4100 2800 0000 1007` → order
  `PAID`, stock down by qty, coupon count +1; replaying the same verify body → success
  with no second decrement; tampered amount/signature → 400; COD order → advance
  charged, `cod_advance_paid = true`; admin refund → Razorpay refund id stored, status
  `REFUNDED`/`PROCESSING`.
