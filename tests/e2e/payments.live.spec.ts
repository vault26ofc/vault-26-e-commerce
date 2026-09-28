import { test, expect, type Page, type FrameLocator } from '@playwright/test';

/**
 * Live end-to-end payment test against Razorpay TEST mode and the real Supabase project.
 * Opt-in only — creates real (test-mode) orders:
 *   E2E_LIVE_PAYMENTS=1 E2E_EMAIL=... E2E_PASSWORD=... npx playwright test payments.live
 */
const LIVE = process.env.E2E_LIVE_PAYMENTS === '1';
const EMAIL = process.env.E2E_EMAIL ?? '';
const PASSWORD = process.env.E2E_PASSWORD ?? '';
const VARIANT = {
  variantId: '2000000d-0000-0000-0000-000000000000', productId: '', name: 'Canvas Tote Bag',
  color: 'Natural', size: null, image: '', price: 999, quantity: 1, slug: 'canvas-tote-bag',
};

test.skip(!LIVE, 'set E2E_LIVE_PAYMENTS=1 to run live payment tests');
test.setTimeout(180_000);

async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('IDENTITY@EMAIL.COM').fill(EMAIL);
  await page.getByPlaceholder('ACCESS_KEY').fill(PASSWORD);
  await page.getByRole('button', { name: 'Authorize Access' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20_000 });
}

async function checkoutWith(page: Page, method: 'RAZORPAY' | 'COD') {
  await page.evaluate((line) => {
    localStorage.setItem('vault26-cart', JSON.stringify({ state: { items: [line], drawerOpen: false }, version: 0 }));
  }, VARIANT);
  await page.goto('/checkout');
  const fill = (label: string, v: string) => page.getByPlaceholder(`Enter ${label}`).fill(v);
  await fill('collector name', 'E2E Payments');
  await fill('contact number', '9812345670');
  await fill('postal zone', '530017');
  await fill('street address', '2-6-155 MVP Main Rd');
  await fill('city archive', 'Visakhapatnam');
  await fill('state territory', 'Andhra Pradesh');
  await page.getByRole('button', { name: /Continue to Archive Logistics/i }).click();
  await page.getByRole('button', { name: method === 'COD' ? /Manual Settlement/i : /Digital Asset Transfer/i }).click();
  await page.getByRole('button', { name: /Review Selection/i }).click();
  await page.getByRole('button', { name: /Commit Piece to Archive/i }).click();
}

const rzp = (page: Page): FrameLocator => page.frameLocator('iframe.razorpay-checkout-frame');

/** Runs SQL through the Supabase management API (needs SUPABASE_PROJECT_REF / SUPABASE_ACCESS_TOKEN from .env). */
async function sql<T = Record<string, unknown>>(query: string): Promise<T[]> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
const stock = async () => Number((await sql<{ stock: number }>(`select stock from product_variants where id = '${VARIANT.variantId}'`))[0].stock);
const latestOrder = async () => (await sql<any>(`select * from orders where email = '${EMAIL}' order by created_at desc limit 1`))[0];

/**
 * Pays in the open Razorpay modal via test-mode netbanking, which always opens Razorpay's demo
 * bank page (test cards sometimes switch to an in-modal OTP flow instead).
 */
async function payInModal(page: Page, outcome: 'Success' | 'Failure') {
  const f = rzp(page);
  await f.getByText('Netbanking').first().waitFor({ timeout: 30_000 });
  const contact = f.getByPlaceholder('Mobile number');
  if (await contact.isVisible().catch(() => false)) {
    await contact.fill('9812345670');
    await f.getByRole('button', { name: 'Continue' }).click();
  }
  await f.getByText('Netbanking').first().click();
  const bank = page.context().waitForEvent('page', { timeout: 45_000 });
  await f.getByText('State Bank of India').first().click();
  // Some checkout versions ask for an explicit Pay click after choosing the bank.
  await f.locator('button:visible', { hasText: /^Pay/ }).last().click({ timeout: 5_000 }).catch(() => {});
  const popup = await bank;
  await popup.getByRole('button', { name: outcome }).click();
}

test.describe.serial('live payments', () => {
  test('prepaid: charged the DB total, order PAID, stock taken once', async ({ page }) => {
    const before = await stock();
    await login(page);
    await checkoutWith(page, 'RAZORPAY');
    await payInModal(page, 'Success');
    await page.waitForURL(/order-success/, { timeout: 60_000 });
    const o = await latestOrder();
    expect(o.payment_status).toBe('PAID');
    expect(o.razorpay_payment_id).toMatch(/^pay_/);
    expect(o.payment_amount_paise).toBe(Math.round(Number(o.total) * 100));
    expect(o.stock_committed).toBe(true);
    expect(await stock()).toBe(before - 1);
  });

  test('customer cancel returns stock; admin refunds through Razorpay', async ({ page }) => {
    const paid = await latestOrder();
    const before = await stock();
    await login(page);
    await page.goto(`/orders/${paid.id}`);
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: /cancel/i }).first().click();
    await expect.poll(async () => (await latestOrder()).status, { timeout: 20_000 }).toBe('CANCELLED');
    expect(await stock()).toBe(before + 1);

    // Temporarily make the test account an admin to drive the real refund UI.
    const uid = (await sql<{ id: string }>(`select id from auth.users where email = '${EMAIL}'`))[0].id;
    await sql(`insert into user_roles(user_id, role) values ('${uid}', 'admin') on conflict do nothing`);
    try {
      await page.goto('/admin/refunds');
      await page.getByText(paid.order_number).locator('xpath=ancestor::div[contains(@class,"justify-between")][1]').getByRole('button', { name: 'Start refund' }).click();
      // Only ever touch the test's own order — this page lists real customers' refunds too.
      await page.getByRole('row').filter({ hasText: paid.order_number }).getByRole('button', { name: 'Manage' }).click();
      await expect(page.getByRole('heading', { name: new RegExp(paid.order_number) })).toBeVisible();
      page.once('dialog', (d) => d.accept());
      await page.getByRole('button', { name: 'Refund via Razorpay' }).click();
      await expect.poll(async () => (await latestOrder()).razorpay_refund_id, { timeout: 30_000 }).toMatch(/^rfnd_/);
      const o = await latestOrder();
      expect(['REFUNDED', 'PROCESSING']).toContain(o.refund_status);
      expect(Number(o.refund_amount)).toBe(Number(paid.total));
    } finally {
      await sql(`delete from user_roles where user_id = '${uid}' and role = 'admin'`);
    }
  });

  test('COD: only the advance is charged; DELIVERED flips it to PAID', async ({ page }) => {
    await login(page);
    await checkoutWith(page, 'COD');
    await payInModal(page, 'Success');
    await page.waitForURL(/order-success/, { timeout: 60_000 });
    const o = await latestOrder();
    const pct = Number((await sql<{ v: string }>("select value#>>'{}' v from settings where key = 'cod_advance_percent'"))[0].v);
    expect(o.payment_method).toBe('COD');
    expect(Number(o.cod_advance_amount)).toBeCloseTo(Math.round(Number(o.total) * pct) / 100, 2);
    expect(o.payment_amount_paise).toBe(Math.round(Number(o.cod_advance_amount) * 100));
    expect(o.cod_advance_paid).toBe(true);
    expect(o.payment_status).toBe('PENDING');
    await sql(`update orders set status = 'DELIVERED' where id = '${o.id}'`);
    expect((await latestOrder()).payment_status).toBe('PAID');
  });

  test('tab closed before verify: the Razorpay webhook confirms the order', async ({ page }) => {
    const { createHmac } = await import('node:crypto');
    const before = await stock();
    await login(page);
    // Simulate the customer closing the tab: the browser never reaches razorpay-verify-payment.
    await page.route('**/functions/v1/razorpay-verify-payment', (r) => r.abort());
    await checkoutWith(page, 'RAZORPAY');
    await payInModal(page, 'Success');
    await expect.poll(async () => (await latestOrder()).razorpay_order_id, { timeout: 30_000 }).toMatch(/^order_/);
    const o = await latestOrder();
    expect(o.payment_status).toBe('PENDING');

    // Deliver the webhook Razorpay would send, built from the real captured payment.
    const auth = 'Basic ' + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
    let payment: any;
    await expect.poll(async () => {
      const list = await (await fetch(`https://api.razorpay.com/v1/orders/${o.razorpay_order_id}/payments`, { headers: { Authorization: auth } })).json();
      payment = list.items?.find((p: any) => p.status === 'captured' || p.status === 'authorized');
      return !!payment;
    }, { timeout: 60_000 }).toBe(true);
    const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: payment } } });
    const sig = createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!).update(body).digest('hex');
    const res = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/razorpay-webhook`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': sig }, body,
    });
    expect(res.status).toBe(200);

    await expect.poll(async () => (await latestOrder()).payment_status, { timeout: 20_000 }).toBe('PAID');
    expect((await latestOrder()).razorpay_payment_id).toBe(payment.id);
    expect(await stock()).toBe(before - 1);

    // A duplicate delivery is a no-op.
    const again = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/razorpay-webhook`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': sig }, body,
    });
    expect(await again.json()).toEqual({ already: true });
    expect(await stock()).toBe(before - 1);
  });

  test('failed payment: order stays unpaid and customer sees an error', async ({ page }) => {
    await login(page);
    await checkoutWith(page, 'RAZORPAY');
    await payInModal(page, 'Failure');
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 30_000 });
    const o = await latestOrder();
    expect(o.payment_status).toBe('PENDING');
    expect(o.razorpay_payment_id).toBeNull();
  });
});
