# Razorpay Hardening + Real Refunds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Charge only what the database says is owed, count each payment once, move stock/coupons only on confirmed payment, close the orders RLS holes, and send refunds through Razorpay.

**Architecture:** Three Supabase Edge Functions (`razorpay-create-order`, `razorpay-verify-payment`, new `razorpay-refund`) share a Razorpay client (`_shared/razorpay.ts`) and pure, unit-tested helpers (`_shared/payment-core.ts`). All state changes that must be atomic live in one SECURITY DEFINER Postgres function, `confirm_order_payment`, callable only by the service role. The React client only sends ids; a pure `src/lib/payment.ts` drives display (advance, COD eligibility, payment labels).

**Tech Stack:** Supabase (Postgres, Edge Functions on Deno), Razorpay REST v1, React 18 + Vite + TS, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-28-razorpay-hardening-design.md`

## Global Constraints

- `RAZORPAY_KEY_SECRET` never reaches frontend code; only `key_id` is returned to the browser.
- Amounts sent to Razorpay are integer paise; minimum 100 paise.
- COD advance = `round(total * cod_advance_percent / 100, 2)` on **every** COD order.
- COD is refused when order total < `cod_min_order` (0 = no minimum).
- COD advance paid ⇒ `cod_advance_paid = true`, `payment_status` stays `PENDING`; becomes `PAID` when `status` → `DELIVERED`.
- One Razorpay refund per order.
- Migrations are applied with `scripts/db-apply.mjs` (management API), never retyped by hand.
- Functions deploy with `npx supabase@latest functions deploy <name> --project-ref yevidhicrhyidrklflvn --use-api` using `SUPABASE_ACCESS_TOKEN` from `.env`.
- Commit straight to `main` (user preference).

## Review Focus

1. Customer double-clicks Pay or reopens the modal → the same Razorpay order is reused, not a second one (Task 4, step "idempotency check").
2. Verify is replayed with the same payment → success, stock decremented once (Task 3 SQL test `replay`).
3. Stock sells out between order creation and payment → customer auto-refunded, order cancelled (Task 3 SQL test `out_of_stock` + Task 4 handling).
4. Signed-in customer PATCHes their own order to `payment_status = PAID` via REST → rejected (Task 3 SQL test `guard`).
5. Orders placed before this migration (no `payment_amount_paise`) are refundable → refund path reads the amount from Razorpay (Task 5).

---

### Task 1: Frontend payment helpers

**Files:**
- Create: `src/lib/payment.ts`
- Test: `src/lib/payment.test.ts`

**Interfaces:**
- Produces: `codAdvanceAmount(total: number, pct: number): number`, `isCodAllowed(total: number, minOrder: number): boolean`, `paymentLabel(o: PaymentView): string`, `readFunctionError(e: unknown): Promise<string>`, type `PaymentView`.

- [ ] **Step 1: Write the failing test** — `src/lib/payment.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { codAdvanceAmount, isCodAllowed, paymentLabel, readFunctionError } from './payment';

describe('codAdvanceAmount', () => {
  it('is pct of total rounded to paise', () => {
    expect(codAdvanceAmount(1234.5, 20)).toBe(246.9);
    expect(codAdvanceAmount(999, 33)).toBe(329.67);
  });
  it('is 0 when pct is 0 or invalid', () => {
    expect(codAdvanceAmount(1000, 0)).toBe(0);
    expect(codAdvanceAmount(1000, NaN)).toBe(0);
  });
});

describe('isCodAllowed', () => {
  it('allows everything when min is 0', () => expect(isCodAllowed(10, 0)).toBe(true));
  it('blocks totals below the minimum', () => {
    expect(isCodAllowed(499, 500)).toBe(false);
    expect(isCodAllowed(500, 500)).toBe(true);
  });
});

describe('paymentLabel', () => {
  const base = { total: 1000, cod_advance_amount: 200, cod_advance_paid: false };
  it('prepaid states', () => {
    expect(paymentLabel({ ...base, payment_method: 'RAZORPAY', payment_status: 'PAID' })).toBe('Paid');
    expect(paymentLabel({ ...base, payment_method: 'RAZORPAY', payment_status: 'PENDING' })).toBe('Awaiting payment');
    expect(paymentLabel({ ...base, payment_method: 'RAZORPAY', payment_status: 'FAILED' })).toBe('Payment failed');
  });
  it('COD states', () => {
    expect(paymentLabel({ ...base, payment_method: 'COD', payment_status: 'PENDING' })).toBe('Awaiting advance');
    expect(paymentLabel({ ...base, payment_method: 'COD', payment_status: 'PENDING', cod_advance_paid: true }))
      .toMatch(/^Advance .*200 paid · .*800 due on delivery$/);
    expect(paymentLabel({ ...base, payment_method: 'COD', payment_status: 'PAID', cod_advance_paid: true })).toBe('Paid in full');
  });
  it('refunded wins', () => {
    expect(paymentLabel({ ...base, payment_method: 'COD', payment_status: 'REFUNDED' })).toBe('Refunded');
  });
});

describe('readFunctionError', () => {
  it('reads the JSON error body of a FunctionsHttpError', async () => {
    const e = { message: 'Edge Function returned a non-2xx status code', context: new Response(JSON.stringify({ error: 'Invalid signature' })) };
    expect(await readFunctionError(e)).toBe('Invalid signature');
  });
  it('falls back to message', async () => {
    expect(await readFunctionError(new Error('boom'))).toBe('boom');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run src/lib/payment.test.ts` → FAIL (cannot find module `./payment`).

- [ ] **Step 3: Implement** — `src/lib/payment.ts`

```ts
import { inr } from './format';

const round2 = (n: number) => Math.round(n * 100) / 100;

export function codAdvanceAmount(total: number, pct: number): number {
  if (!(pct > 0) || !(total > 0)) return 0;
  return round2((total * pct) / 100);
}

export function isCodAllowed(total: number, minOrder: number): boolean {
  return !(minOrder > 0) || total >= minOrder;
}

export type PaymentView = {
  payment_method: string;
  payment_status: string;
  total: number | string;
  cod_advance_amount?: number | string | null;
  cod_advance_paid?: boolean | null;
};

export function paymentLabel(o: PaymentView): string {
  if (o.payment_status === 'REFUNDED') return 'Refunded';
  if (o.payment_method !== 'COD') {
    if (o.payment_status === 'PAID') return 'Paid';
    if (o.payment_status === 'FAILED') return 'Payment failed';
    return 'Awaiting payment';
  }
  if (o.payment_status === 'PAID') return 'Paid in full';
  if (!o.cod_advance_paid) return 'Awaiting advance';
  const advance = Number(o.cod_advance_amount) || 0;
  return `Advance ${inr(advance)} paid · ${inr(round2(Number(o.total) - advance))} due on delivery`;
}

/** supabase.functions.invoke() puts non-2xx bodies in error.context (a Response). */
export async function readFunctionError(e: unknown): Promise<string> {
  const ctx = (e as { context?: unknown })?.context;
  if (ctx instanceof Response) {
    try {
      const body = await ctx.clone().json();
      if (body?.error) return typeof body.error === 'string' ? body.error : JSON.stringify(body.error);
    } catch { /* not JSON */ }
  }
  return (e as { message?: string })?.message || 'Something went wrong';
}
```

- [ ] **Step 4: Run** — `npx vitest run src/lib/payment.test.ts` → PASS.
- [ ] **Step 5: Commit** — `git add src/lib/payment.ts src/lib/payment.test.ts && git commit -m "feat(payments): client payment helpers"`

---

### Task 2: Edge shared modules (pure core + Razorpay client)

**Files:**
- Create: `supabase/functions/_shared/payment-core.ts`, `supabase/functions/_shared/payment-core.test.ts`, `supabase/functions/_shared/razorpay.ts`, `supabase/functions/_shared/http.ts`
- Modify: `vitest.config.ts` (include `supabase/functions/**/*.test.ts`)

**Interfaces:**
- Produces (payment-core): `verifyRazorpaySignature(orderId, paymentId, signature, secret): Promise<boolean>`, `amountDuePaise(o: PayableOrder): number`, `validateRefund(requestedRupees: number, refundablePaise: number): { paise: number } | { error: string }`, type `PayableOrder = { payment_method: string; total: number|string; cod_advance_amount: number|string|null }`.
- Produces (razorpay): `keyId()`, `createOrder(amountPaise, receipt, notes)`, `getOrder(id)`, `getPayment(id)`, `capturePayment(id, amountPaise)`, `createRefund(paymentId, amountPaise, notes)`, `getRefund(id)`, class `RazorpayError { status; message }`, types `RzpOrder`, `RzpPayment`, `RzpRefund`.
- Produces (http): `json(body, status?)`, `getUser(req)`, `serviceClient()`, `isAdmin(db, userId)`.

- [ ] **Step 1: Add vitest include** — in `vitest.config.ts` change `include` to `["src/**/*.{test,spec}.{ts,tsx}", "supabase/functions/**/*.test.ts"]`.

- [ ] **Step 2: Failing test** — `supabase/functions/_shared/payment-core.test.ts`

```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyRazorpaySignature, amountDuePaise, validateRefund } from './payment-core.ts';

describe('verifyRazorpaySignature', () => {
  const secret = 'test_secret';
  const good = createHmac('sha256', secret).update('order_1|pay_1').digest('hex');
  it('accepts the correct HMAC', async () => expect(await verifyRazorpaySignature('order_1', 'pay_1', good, secret)).toBe(true));
  it('rejects a tampered payment id', async () => expect(await verifyRazorpaySignature('order_1', 'pay_2', good, secret)).toBe(false));
  it('rejects garbage', async () => expect(await verifyRazorpaySignature('order_1', 'pay_1', 'abc', secret)).toBe(false));
});

describe('amountDuePaise', () => {
  it('prepaid charges the total', () => expect(amountDuePaise({ payment_method: 'RAZORPAY', total: '1078.00', cod_advance_amount: 0 })).toBe(107800));
  it('COD charges the advance', () => expect(amountDuePaise({ payment_method: 'COD', total: 1234.5, cod_advance_amount: '246.90' })).toBe(24690));
});

describe('validateRefund', () => {
  it('converts to paise', () => expect(validateRefund(100.5, 20000)).toEqual({ paise: 10050 }));
  it('rejects below ₹1', () => expect(validateRefund(0.5, 20000)).toHaveProperty('error'));
  it('rejects above refundable', () => expect(validateRefund(250, 20000)).toEqual({ error: 'Maximum refundable is ₹200.00' }));
});
```

- [ ] **Step 3: Run** — `npx vitest run supabase/functions` → FAIL (module missing).

- [ ] **Step 4: Implement** — `supabase/functions/_shared/payment-core.ts` (no imports: runs in Deno and Node)

```ts
export type PayableOrder = {
  payment_method: string;
  total: number | string;
  cod_advance_amount: number | string | null;
};

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string, secret: string) {
  return timingSafeEqual(await hmacSha256Hex(secret, `${orderId}|${paymentId}`), signature);
}

export function amountDuePaise(o: PayableOrder): number {
  const rupees = o.payment_method === 'COD' ? Number(o.cod_advance_amount) : Number(o.total);
  return Math.round(rupees * 100);
}

export function validateRefund(requestedRupees: number, refundablePaise: number): { paise: number } | { error: string } {
  const paise = Math.round(Number(requestedRupees) * 100);
  if (!(paise >= 100)) return { error: 'Refund must be at least ₹1' };
  if (paise > refundablePaise) return { error: `Maximum refundable is ₹${(refundablePaise / 100).toFixed(2)}` };
  return { paise };
}
```

`supabase/functions/_shared/razorpay.ts`

```ts
const BASE = 'https://api.razorpay.com/v1';

export class RazorpayError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export type RzpOrder = { id: string; amount: number; currency: string; status: string };
export type RzpPayment = { id: string; order_id: string; amount: number; amount_refunded: number; status: string };
export type RzpRefund = { id: string; amount: number; status: 'pending' | 'processed' | 'failed' };

export const keyId = () => Deno.env.get('RAZORPAY_KEY_ID') ?? '';

async function rzp<T>(method: string, path: string, body?: unknown): Promise<T> {
  const id = Deno.env.get('RAZORPAY_KEY_ID');
  const secret = Deno.env.get('RAZORPAY_KEY_SECRET');
  if (!id || !secret) throw new Error('Razorpay keys are not configured');
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Basic ${btoa(`${id}:${secret}`)}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new RazorpayError(res.status, data?.error?.description || `Razorpay error ${res.status}`);
  return data as T;
}

export const createOrder = (amount: number, receipt: string, notes: Record<string, string>) =>
  rzp<RzpOrder>('POST', '/orders', { amount, currency: 'INR', receipt, notes });
export const getOrder = (id: string) => rzp<RzpOrder>('GET', `/orders/${id}`);
export const getPayment = (id: string) => rzp<RzpPayment>('GET', `/payments/${id}`);
export const capturePayment = (id: string, amount: number) =>
  rzp<RzpPayment>('POST', `/payments/${id}/capture`, { amount, currency: 'INR' });
export const createRefund = (paymentId: string, amount: number, notes: Record<string, string>) =>
  rzp<RzpRefund>('POST', `/payments/${paymentId}/refund`, { amount, notes });
export const getRefund = (id: string) => rzp<RzpRefund>('GET', `/refunds/${id}`);
```

`supabase/functions/_shared/http.ts`

```ts
import { createClient, type SupabaseClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from './cors.ts';

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

export async function getUser(req: Request): Promise<User | null> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
  const { data, error } = await anon.auth.getUser(auth.slice(7));
  return error ? null : data.user;
}

export const serviceClient = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

export async function isAdmin(db: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await db.rpc('has_role', { _user_id: userId, _role: 'admin' });
  return data === true;
}
```

- [ ] **Step 5: Run** — `npx vitest run supabase/functions` → PASS.
- [ ] **Step 6: Commit** — `git add vitest.config.ts supabase/functions/_shared && git commit -m "feat(payments): shared Razorpay client and verified payment core"`

---

### Task 3: Migration — payment confirmation, COD rules, RLS hardening

**Files:**
- Create: `scripts/db-apply.mjs`, `supabase/migrations/20260928000000_payment_hardening.sql`, `tests/sql/payment_hardening.sql`

**Interfaces:**
- Produces: `public.confirm_order_payment(p_order_id uuid, p_payment_id text, p_amount_paise integer) returns jsonb` — raises `OUT_OF_STOCK`, `NOT_PENDING`, `ALREADY_CONFIRMED`, `ORDER_NOT_FOUND`; returns `{ok:true}` or `{ok:true, already:true}`. Columns `orders.razorpay_refund_id text`, `orders.payment_amount_paise integer`. Setting `cod_min_order`.
- Consumes: existing `has_role(_user_id uuid, _role app_role)`.

- [ ] **Step 1: Apply script** — `scripts/db-apply.mjs`

```js
// Apply a migration or run SQL against the linked Supabase project via the management API.
//   node --env-file=.env scripts/db-apply.mjs supabase/migrations/<version>_<name>.sql
//   node --env-file=.env scripts/db-apply.mjs --file tests/sql/x.sql   (run only, not recorded)
//   node --env-file=.env scripts/db-apply.mjs --sql "select 1"
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const ref = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!ref || !token) { console.error('SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN must be set (.env)'); process.exit(1); }

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return JSON.parse(text);
}

const [flag, arg] = process.argv.slice(2);
try {
  if (flag === '--sql') console.log(JSON.stringify(await query(arg), null, 2));
  else if (flag === '--file') console.log(JSON.stringify(await query(readFileSync(arg, 'utf8')), null, 2));
  else if (flag) {
    const version = basename(flag).split('_')[0];
    const done = await query(`select 1 from supabase_migrations.schema_migrations where version = '${version}'`);
    if (done.length) { console.log(`already applied: ${version}`); process.exit(0); }
    await query(`begin;\n${readFileSync(flag, 'utf8')}\n;\ninsert into supabase_migrations.schema_migrations(version) values ('${version}');\ncommit;`);
    console.log(`applied: ${version}`);
  } else { console.error('usage: db-apply.mjs <migration.sql> | --file <x.sql> | --sql "<query>"'); process.exit(1); }
} catch (e) { console.error(e.message); process.exit(1); }
```

- [ ] **Step 2: Failing SQL test** — `tests/sql/payment_hardening.sql` (runs in a transaction that always rolls back; any failed assertion raises)

```sql
begin;
do $$
declare
  v_prod uuid; v_var uuid; v_order uuid; v_order2 uuid; v_stock int; v_res jsonb; v_row public.orders%rowtype;
  v_cust uuid := gen_random_uuid();
begin
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
```

Note: `create_order` checks `p_user_id IS DISTINCT FROM auth.uid()`; with `p_user_id = null` and `sub = null` that passes. `auth.uid()` reads `request.jwt.claims->>'sub'`.

- [ ] **Step 3: Run it** — `node --env-file=.env scripts/db-apply.mjs --file tests/sql/payment_hardening.sql` → FAIL (`function public.confirm_order_payment ... does not exist`).

- [ ] **Step 4: Migration** — `supabase/migrations/20260928000000_payment_hardening.sql`

```sql
-- Payment hardening: server-confirmed payments, COD rules, RLS fixes.

alter table public.orders
  add column if not exists razorpay_refund_id text,
  add column if not exists payment_amount_paise integer;

create unique index if not exists orders_razorpay_payment_id_key
  on public.orders (razorpay_payment_id) where razorpay_payment_id is not null;

delete from public.settings where key = 'cod_threshold';
insert into public.settings(key, value) values ('cod_min_order', '0'::jsonb) on conflict (key) do nothing;

-- ---------------------------------------------------------------- create_order
create or replace function public.create_order(
  p_user_id uuid, p_email text, p_shipping_address jsonb, p_items jsonb,
  p_coupon_code text default null, p_payment_method text default 'RAZORPAY'
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_order_id uuid;
  v_subtotal numeric(10,2) := 0;
  v_discount numeric(10,2) := 0;
  v_shipping numeric(10,2);
  v_free_threshold numeric(10,2);
  v_cod_advance_pct numeric(10,2);
  v_cod_min numeric(10,2);
  v_total numeric(10,2);
  v_cod_advance numeric(10,2) := 0;
  v_coupon record;
  v_elem jsonb;
  v_variant_id uuid;
  v_qty int;
  v_price numeric(10,2);
  v_stock int;
  v_product_name text;
  v_product_image text;
  v_variant_label text;
  v_result record;
begin
  if p_user_id is not null and p_user_id is distinct from auth.uid() then
    raise exception 'Unauthorized: user_id mismatch';
  end if;

  select coalesce((select (value#>>'{}')::numeric from settings where key = 'free_shipping_threshold'), 999) into v_free_threshold;
  select coalesce((select (value#>>'{}')::numeric from settings where key = 'shipping_fee'), 79) into v_shipping;
  select coalesce((select (value#>>'{}')::numeric from settings where key = 'cod_advance_percent'), 20) into v_cod_advance_pct;
  select coalesce((select (value#>>'{}')::numeric from settings where key = 'cod_min_order'), 0) into v_cod_min;

  for v_elem in select * from jsonb_array_elements(p_items) loop
    v_variant_id := (v_elem->>'variant_id')::uuid;
    v_qty := (v_elem->>'quantity')::int;
    if v_qty <= 0 then raise exception 'Invalid quantity for variant %', v_variant_id; end if;

    select pv.price, pv.stock, p.name
      into v_price, v_stock, v_product_name
    from product_variants pv join products p on p.id = pv.product_id
    where pv.id = v_variant_id and p.is_active = true;
    if not found then raise exception 'Variant % not found or product is inactive', v_variant_id; end if;
    if v_stock < v_qty then
      raise exception 'Insufficient stock for % (available: %, requested: %)', v_product_name, v_stock, v_qty;
    end if;
    v_subtotal := v_subtotal + (v_price * v_qty);
  end loop;

  if v_subtotal <= 0 then raise exception 'Order must contain at least one item'; end if;
  if v_subtotal >= v_free_threshold then v_shipping := 0; end if;

  -- Coupon is validated here; its use is only counted once payment is confirmed.
  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    select * into v_coupon from coupons
    where code = upper(trim(p_coupon_code)) and is_active = true
      and (expires_at is null or expires_at > now())
      and (max_uses is null or used_count < max_uses);
    if found and v_subtotal >= v_coupon.min_order then
      if v_coupon.type = 'PERCENT' then
        v_discount := least(round(v_subtotal * v_coupon.value / 100, 2), v_subtotal);
      else
        v_discount := least(v_coupon.value, v_subtotal);
      end if;
    end if;
  end if;

  v_total := greatest(v_subtotal - v_discount, 0) + v_shipping;

  if p_payment_method = 'COD' then
    if v_cod_min > 0 and v_total < v_cod_min then
      raise exception 'COD is available on orders of ₹% or more', v_cod_min;
    end if;
    v_cod_advance := round(v_total * v_cod_advance_pct / 100, 2);
  end if;

  insert into orders (user_id, email, shipping_address, subtotal, discount, shipping, total,
                      payment_method, payment_status, cod_advance_amount, coupon_code)
  values (p_user_id, p_email, p_shipping_address, v_subtotal, v_discount, v_shipping, v_total,
          p_payment_method::payment_method, 'PENDING', v_cod_advance,
          nullif(upper(trim(coalesce(p_coupon_code, ''))), ''))
  returning id into v_order_id;

  for v_elem in select * from jsonb_array_elements(p_items) loop
    v_variant_id := (v_elem->>'variant_id')::uuid;
    v_qty := (v_elem->>'quantity')::int;
    select pv.price, p.name, p.images[1],
      nullif(trim(coalesce(pv.size,'') || case when pv.size is not null and pv.color is not null then ' · ' else '' end || coalesce(pv.color,'')), '')
      into v_price, v_product_name, v_product_image, v_variant_label
    from product_variants pv join products p on p.id = pv.product_id
    where pv.id = v_variant_id;
    insert into order_items (order_id, variant_id, product_name, variant_label, image, quantity, price_at_purchase)
    values (v_order_id, v_variant_id, v_product_name, v_variant_label, v_product_image, v_qty, v_price);
  end loop;

  select * into v_result from orders where id = v_order_id;
  return jsonb_build_object(
    'id', v_result.id, 'order_number', v_result.order_number,
    'subtotal', v_result.subtotal, 'discount', v_result.discount, 'shipping', v_result.shipping,
    'total', v_result.total, 'payment_method', v_result.payment_method,
    'payment_status', v_result.payment_status, 'cod_advance_amount', v_result.cod_advance_amount);
end;
$$;
grant execute on function public.create_order(uuid, text, jsonb, jsonb, text, text) to anon, authenticated;

-- ---------------------------------------------------------------- confirm_order_payment
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
    cod_advance_paid = (payment_method = 'COD')
  where id = p_order_id;

  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.confirm_order_payment(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.confirm_order_payment(uuid, text, integer) to service_role;

-- ---------------------------------------------------------------- COD paid on delivery
create or replace function public.cod_paid_on_delivery() returns trigger
language plpgsql as $$
begin
  if new.status = 'DELIVERED' and old.status is distinct from 'DELIVERED'
     and new.payment_method = 'COD' and new.payment_status = 'PENDING' then
    new.payment_status := 'PAID';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_cod_paid_on_delivery on public.orders;
create trigger trg_cod_paid_on_delivery before update of status on public.orders
  for each row execute function public.cod_paid_on_delivery();

-- ---------------------------------------------------------------- RLS hardening
drop policy if exists "orders insert own" on public.orders;
drop policy if exists "oi insert" on public.order_items;

create or replace function public.orders_guard_customer_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.has_role(auth.uid(), 'admin') then return new; end if;
  if old.status = 'PENDING' and new.status = 'CANCELLED'
     and (to_jsonb(new) - 'status' - 'updated_at') = (to_jsonb(old) - 'status' - 'updated_at') then
    return new;
  end if;
  raise exception 'Customers can only cancel a pending order';
end;
$$;
drop trigger if exists orders_guard_customer_update on public.orders;
create trigger orders_guard_customer_update before update on public.orders
  for each row execute function public.orders_guard_customer_update();
```

Trigger order note: BEFORE triggers fire alphabetically — `orders_guard_customer_update` < `orders_touch` < `trg_cod_paid_on_delivery`. The guard compares OLD vs the customer's NEW before `updated_at`/`payment_status` are touched, so the COD-delivered trigger (admin/service only) never trips it.

- [ ] **Step 5: Apply** — `node --env-file=.env scripts/db-apply.mjs supabase/migrations/20260928000000_payment_hardening.sql` → `applied: 20260928000000`.
- [ ] **Step 6: Run SQL test** — `node --env-file=.env scripts/db-apply.mjs --file tests/sql/payment_hardening.sql` → exits 0 (no `FAIL`). Then confirm no test rows leaked: `--sql "select count(*) from products where name='__t'"` → `0`.
- [ ] **Step 7: Commit** — `git add scripts/db-apply.mjs supabase/migrations/20260928000000_payment_hardening.sql tests/sql/payment_hardening.sql && git commit -m "feat(db): confirm_order_payment, COD rules, orders RLS hardening"`

---

### Task 4: Rewrite create-order and verify-payment

**Files:**
- Modify (full rewrite): `supabase/functions/razorpay-create-order/index.ts`, `supabase/functions/razorpay-verify-payment/index.ts`

**Interfaces:**
- Consumes: Task 2 modules; Task 3 `confirm_order_payment`.
- Produces: `POST razorpay-create-order {order_id}` → `{order:{id,amount,currency}, key_id}`; `POST razorpay-verify-payment {order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature}` → `{success:true}` | `{error}` with 400/403/409/502.

- [ ] **Step 1: `razorpay-create-order/index.ts`**

```ts
import { corsHeaders } from '../_shared/cors.ts';
import { getUser, json, serviceClient } from '../_shared/http.ts';
import { amountDuePaise } from '../_shared/payment-core.ts';
import { createOrder, getOrder, keyId, RazorpayError } from '../_shared/razorpay.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { order_id } = await req.json().catch(() => ({}));
    if (!order_id) return json({ error: 'order_id is required' }, 400);

    const db = serviceClient();
    const { data: order } = await db.from('orders')
      .select('id, user_id, order_number, status, payment_method, payment_status, total, cod_advance_amount, cod_advance_paid, razorpay_order_id')
      .eq('id', order_id).maybeSingle();
    if (!order || order.user_id !== user.id) return json({ error: 'Order not found' }, 403);
    if (order.status === 'CANCELLED' || order.payment_status !== 'PENDING' || order.cod_advance_paid) {
      return json({ error: 'This order is not awaiting payment' }, 400);
    }

    const amount = amountDuePaise(order);
    if (amount < 100) return json({ error: 'Amount must be at least ₹1' }, 400);

    // Reuse the Razorpay order on retry / double-click
    if (order.razorpay_order_id) {
      try {
        const existing = await getOrder(order.razorpay_order_id);
        if (existing.amount === amount && existing.status !== 'paid') {
          return json({ order: { id: existing.id, amount: existing.amount, currency: existing.currency }, key_id: keyId() });
        }
      } catch { /* fall through and create a fresh one */ }
    }

    const rz = await createOrder(amount, order.order_number, { order_id: order.id });
    const { error } = await db.from('orders').update({ razorpay_order_id: rz.id }).eq('id', order.id);
    if (error) throw error;
    return json({ order: { id: rz.id, amount: rz.amount, currency: rz.currency }, key_id: keyId() });
  } catch (e) {
    if (e instanceof RazorpayError) return json({ error: e.message }, 502);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
```

- [ ] **Step 2: `razorpay-verify-payment/index.ts`**

```ts
import { corsHeaders } from '../_shared/cors.ts';
import { getUser, json, serviceClient } from '../_shared/http.ts';
import { amountDuePaise, verifyRazorpaySignature } from '../_shared/payment-core.ts';
import { capturePayment, createRefund, getPayment, RazorpayError } from '../_shared/razorpay.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json().catch(() => ({}));
    if (!order_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ error: 'Missing fields' }, 400);
    }

    const db = serviceClient();
    const { data: order } = await db.from('orders')
      .select('id, user_id, order_number, payment_method, total, cod_advance_amount, razorpay_order_id, razorpay_payment_id')
      .eq('id', order_id).maybeSingle();
    if (!order || order.user_id !== user.id) return json({ error: 'Order not found' }, 403);

    if (order.razorpay_payment_id) {
      return order.razorpay_payment_id === razorpay_payment_id
        ? json({ success: true })
        : json({ error: 'Order is already paid with a different payment' }, 409);
    }
    if (order.razorpay_order_id !== razorpay_order_id) return json({ error: 'Payment does not belong to this order' }, 400);

    const valid = await verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, Deno.env.get('RAZORPAY_KEY_SECRET') ?? '');
    if (!valid) return json({ error: 'Invalid payment signature' }, 400);

    const expected = amountDuePaise(order);
    let payment = await getPayment(razorpay_payment_id);
    if (payment.order_id !== razorpay_order_id || payment.amount !== expected) {
      return json({ error: 'Payment amount or order mismatch' }, 400);
    }
    if (payment.status === 'authorized') payment = await capturePayment(razorpay_payment_id, expected);
    if (payment.status !== 'captured') return json({ error: `Payment not captured (status: ${payment.status})` }, 400);

    const { error } = await db.rpc('confirm_order_payment', {
      p_order_id: order.id, p_payment_id: razorpay_payment_id, p_amount_paise: expected,
    });
    if (!error) return json({ success: true });

    if (error.message.includes('OUT_OF_STOCK')) {
      const refund = await createRefund(razorpay_payment_id, expected, { order_id: order.id, reason: 'out_of_stock' });
      await db.from('orders').update({
        status: 'CANCELLED',
        payment_status: 'REFUNDED',
        razorpay_payment_id,
        payment_amount_paise: expected,
        razorpay_refund_id: refund.id,
        refund_amount: expected / 100,
        refund_status: refund.status === 'processed' ? 'REFUNDED' : 'PROCESSING',
        refunded_at: refund.status === 'processed' ? new Date().toISOString() : null,
        refund_notes: 'An item sold out before your payment completed. Your payment has been refunded automatically.',
      }).eq('id', order.id);
      return json({ error: 'An item sold out while you were paying. Your payment has been refunded.' }, 409);
    }
    if (error.message.includes('ALREADY_CONFIRMED')) return json({ error: 'Order is already paid with a different payment' }, 409);
    if (error.message.includes('NOT_PENDING')) return json({ error: 'This order is not awaiting payment' }, 409);
    throw error;
  } catch (e) {
    if (e instanceof RazorpayError) return json({ error: e.message }, 502);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
```

- [ ] **Step 3: Type-check with Deno** (if installed; otherwise skip — deploy bundling type-checks) — `npx supabase@latest functions deploy razorpay-create-order razorpay-verify-payment --project-ref yevidhicrhyidrklflvn --use-api` with `SUPABASE_ACCESS_TOKEN` exported from `.env` → "Deployed Functions".
- [ ] **Step 4: Smoke test (negative paths, no money)** — `curl -s -X POST https://yevidhicrhyidrklflvn.supabase.co/functions/v1/razorpay-create-order -H "Content-Type: application/json" -d '{}'` → 401 (gateway JWT check). Idempotency (Review Focus 1) is exercised live in Task 7.
- [ ] **Step 5: Commit** — `git add supabase/functions/razorpay-create-order supabase/functions/razorpay-verify-payment && git commit -m "feat(payments): server-derived amounts and Razorpay-confirmed verification"`

---

### Task 5: `razorpay-refund` edge function

**Files:**
- Create: `supabase/functions/razorpay-refund/index.ts`

**Interfaces:**
- Produces: `POST razorpay-refund {action:'refund', order_id, amount}` → `{refund_status, refund_id}`; `{action:'sync', order_id}` → `{refund_status}`. Admin only (403 otherwise).

- [ ] **Step 1: Implement**

```ts
import { corsHeaders } from '../_shared/cors.ts';
import { getUser, isAdmin, json, serviceClient } from '../_shared/http.ts';
import { validateRefund } from '../_shared/payment-core.ts';
import { createRefund, getPayment, getRefund, RazorpayError } from '../_shared/razorpay.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const db = serviceClient();
    if (!(await isAdmin(db, user.id))) return json({ error: 'Admins only' }, 403);

    const { action, order_id, amount } = await req.json().catch(() => ({}));
    if (!order_id || (action !== 'refund' && action !== 'sync')) return json({ error: 'action and order_id are required' }, 400);

    const { data: order } = await db.from('orders')
      .select('id, order_number, razorpay_payment_id, razorpay_refund_id, refund_status')
      .eq('id', order_id).maybeSingle();
    if (!order) return json({ error: 'Order not found' }, 404);

    if (action === 'sync') {
      if (!order.razorpay_refund_id) return json({ error: 'No Razorpay refund on this order' }, 400);
      const r = await getRefund(order.razorpay_refund_id);
      if (r.status === 'processed' && order.refund_status !== 'REFUNDED') {
        await db.from('orders').update({ refund_status: 'REFUNDED', refunded_at: new Date().toISOString() }).eq('id', order.id);
      }
      return json({ refund_status: r.status === 'processed' ? 'REFUNDED' : r.status === 'failed' ? 'FAILED' : 'PROCESSING' });
    }

    if (!order.razorpay_payment_id) return json({ error: 'Nothing was charged online for this order' }, 400);
    if (order.razorpay_refund_id) return json({ error: 'This order already has a Razorpay refund' }, 409);

    // Read the paid amount from Razorpay itself — also covers orders placed before payment_amount_paise existed.
    const payment = await getPayment(order.razorpay_payment_id);
    const check = validateRefund(Number(amount), payment.amount - (payment.amount_refunded ?? 0));
    if ('error' in check) return json({ error: check.error }, 400);

    const refund = await createRefund(order.razorpay_payment_id, check.paise, { order_id: order.id, order_number: order.order_number });
    const processed = refund.status === 'processed';
    const full = check.paise === payment.amount;
    const { error } = await db.from('orders').update({
      razorpay_refund_id: refund.id,
      refund_amount: check.paise / 100,
      refund_status: processed ? 'REFUNDED' : 'PROCESSING',
      ...(processed ? { refunded_at: new Date().toISOString() } : {}),
      ...(full ? { payment_status: 'REFUNDED' } : {}),
    }).eq('id', order.id);
    if (error) throw error;
    return json({ refund_status: processed ? 'REFUNDED' : 'PROCESSING', refund_id: refund.id });
  } catch (e) {
    if (e instanceof RazorpayError) return json({ error: e.message }, 502);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
```

- [ ] **Step 2: Deploy** — `npx supabase@latest functions deploy razorpay-refund --project-ref yevidhicrhyidrklflvn --use-api` → deployed.
- [ ] **Step 3: Smoke** — unauthenticated POST → 401.
- [ ] **Step 4: Commit** — `git add supabase/functions/razorpay-refund && git commit -m "feat(payments): admin refunds through Razorpay"`

---

### Task 6: Frontend wiring

**Files:**
- Modify: `src/pages/Checkout.tsx` (settings load ~L35-48, advance calc ~L86, `payWithRazorpay` ~L97-122, `placeOrder` ~L141-145, COD button ~L246-262)
- Modify: `src/pages/admin/AdminMisc.tsx:96`
- Modify: `src/pages/admin/AdminRefunds.tsx` (dialog)
- Modify: `src/pages/Orders.tsx:214`, `src/pages/Invoice.tsx:131-138`, `src/pages/admin/AdminOrders.tsx:51`

**Interfaces:**
- Consumes: Task 1 helpers; Task 4/5 endpoints.

- [ ] **Step 1: Checkout settings + calc.** Replace `codThreshold` state with `const [codMinOrder, setCodMinOrder] = useState(0);`; in the settings loop replace the `cod_threshold` line with `if (s.key === 'cod_min_order') setCodMinOrder(Number(s.value));`. Replace the advance line with:

```ts
  const codAdvance = codAdvanceAmount(total, codAdvancePct);
  const codAllowed = isCodAllowed(total, codMinOrder);
  useEffect(() => { if (!codAllowed && payment === 'COD') setPayment('RAZORPAY'); }, [codAllowed, payment]);
```
and add `import { codAdvanceAmount, isCodAllowed, readFunctionError } from '@/lib/payment';`.

- [ ] **Step 2: `payWithRazorpay`** — replace with:

```ts
  const payWithRazorpay = (order: { id: string; order_number: string }) => new Promise<void>(async (resolve, reject) => {
    const ok = await loadRazorpay();
    if (!ok) return reject(new Error('Razorpay failed to load'));
    const { data, error } = await supabase.functions.invoke('razorpay-create-order', { body: { order_id: order.id } });
    if (error || !data?.order) return reject(new Error(error ? await readFunctionError(error) : 'Could not create payment'));
    const rzp = new (window as any).Razorpay({
      key: data.key_id,
      amount: data.order.amount,
      currency: data.order.currency,
      order_id: data.order.id,
      name: 'Vault 26',
      description: `Order ${order.order_number}`,
      prefill: { name: addr.full_name, email: addr.email, contact: addr.phone },
      theme: { color: '#BB0006' },
      handler: async (resp: any) => {
        const { data: v, error: ve } = await supabase.functions.invoke('razorpay-verify-payment', {
          body: { ...resp, order_id: order.id },
        });
        if (ve || !v?.success) return reject(new Error(ve ? await readFunctionError(ve) : 'Payment verification failed'));
        resolve();
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    });
    // The modal stays open after a failed attempt so the customer can retry; just tell them why.
    rzp.on('payment.failed', (r: any) => toast.error(r?.error?.description || 'Payment failed. Try again or use another method.'));
    rzp.open();
  });
```

- [ ] **Step 3: `placeOrder`** — the two branches become:

```ts
      if (payment === 'RAZORPAY' || Number(order.cod_advance_amount) > 0) {
        await payWithRazorpay(order);
      }
```

- [ ] **Step 4: COD button** — on the payment-method button add `disabled={p === 'COD' && !codAllowed}` and `disabled:opacity-40 disabled:cursor-not-allowed` to its class list; COD subtitle becomes:

```tsx
{p === 'RAZORPAY'
  ? 'Secure encrypted transaction via cards/UPI.'
  : !codAllowed
    ? `COD available on orders of ${inr(codMinOrder)} or more.`
    : codAdvance > 0 ? `Requires ${inr(codAdvance)} advance · rest on delivery.` : 'Direct physical exchange on arrival.'}
```

- [ ] **Step 5: Settings** — in `AdminMisc.tsx` replace `{ k: 'cod_threshold', l: 'COD pre-payment threshold (₹)', t: 'number' },` with `{ k: 'cod_min_order', l: 'COD minimum order (₹, 0 = no minimum)', t: 'number' },`.

- [ ] **Step 6: Labels** — import `paymentLabel` from `@/lib/payment` in each file:
  - `Orders.tsx:214` → `Method: {o.payment_method} // {paymentLabel(o)}`
  - `AdminOrders.tsx:51` → `{o.payment_method} · {paymentLabel(o)}`
  - `Invoice.tsx:137` → `{paymentLabel(order)}` (colour rule unchanged: green when `PAID`).

- [ ] **Step 7: AdminRefunds dialog** — add state `const [busy, setBusy] = useState(false);`; in `openEdit` prefill `refund_amount` with `o.payment_amount_paise ? o.payment_amount_paise / 100 : Number(o.refund_amount) || Number(o.total)`. Add:

```ts
  const refundViaRazorpay = async () => {
    if (!editing) return;
    if (!confirm(`Send ${inr(form.refund_amount)} back to the customer through Razorpay? This moves real money and cannot be undone.`)) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('razorpay-refund', {
      body: { action: 'refund', order_id: editing.id, amount: form.refund_amount },
    });
    setBusy(false);
    if (error) return toast.error(await readFunctionError(error));
    toast.success(data.refund_status === 'REFUNDED' ? 'Refunded' : 'Refund initiated — Razorpay is processing it');
    setEditing(null);
    load();
  };

  const syncRefund = async () => {
    if (!editing) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('razorpay-refund', { body: { action: 'sync', order_id: editing.id } });
    setBusy(false);
    if (error) return toast.error(await readFunctionError(error));
    toast.success(`Razorpay refund status: ${data.refund_status}`);
    setEditing(null);
    load();
  };
```
In the dialog, under the Payment ID line add `{editing.razorpay_refund_id && <div className="text-xs mt-1">Razorpay refund: {editing.razorpay_refund_id}</div>}`. In `DialogFooter`, before Save:

```tsx
{editing?.razorpay_payment_id && !editing?.razorpay_refund_id && (
  <Button variant="destructive" disabled={busy} onClick={refundViaRazorpay}>Refund via Razorpay</Button>
)}
{editing?.razorpay_refund_id && editing?.refund_status === 'PROCESSING' && (
  <Button variant="outline" disabled={busy} onClick={syncRefund}>Refresh status</Button>
)}
```
Import `inr` (already), `readFunctionError` from `@/lib/payment`.

- [ ] **Step 7b: DB types** — add `razorpay_refund_id: string | null` and `payment_amount_paise: number | null` to the `orders` Row/Insert/Update types in `src/integrations/supabase/types.ts` (Insert/Update as optional).

- [ ] **Step 8: Verify** — `npx tsc -p tsconfig.app.json --noEmit` → no new errors; `npx vitest run` → all pass; `npm run build` → success.
- [ ] **Step 9: Commit** — `git add src && git commit -m "feat(checkout,admin): server-priced payments, COD minimum, Razorpay refunds, payment labels"`

---

### Task 7: Live verification (test keys) + push

- [ ] **Step 1:** Start `npm run dev`. As a signed-in customer, buy one item with card `4100 2800 0000 1007`, CVV 123, expiry 12/26, OTP per Razorpay test page. Expect success page.
- [ ] **Step 2:** `node --env-file=.env scripts/db-apply.mjs --sql "select order_number, payment_status, razorpay_payment_id, payment_amount_paise from orders order by created_at desc limit 1"` → `PAID`, payment id set, amount = total×100. Stock for that variant decreased by the quantity.
- [ ] **Step 3:** Double-click "Pay" on a new order → one `razorpay_order_id` on the row; closing and reopening reuses it (Review Focus 1).
- [ ] **Step 4:** COD order → modal charges exactly the advance; DB `cod_advance_paid = true`, `payment_status = PENDING`; admin sets status DELIVERED → `PAID`, label "Paid in full".
- [ ] **Step 5:** Admin → Refunds → Manage on the prepaid order → "Refund via Razorpay" → Razorpay dashboard (test mode) shows the refund; DB has `razorpay_refund_id`.
- [ ] **Step 6:** `git push origin main`.
