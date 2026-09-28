import { test, expect, type Page } from '@playwright/test';

/**
 * Admin CMS flow against the real Supabase project. Opt-in; restores every section it touches:
 *   E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... (+ SUPABASE_PROJECT_REF / SUPABASE_ACCESS_TOKEN from .env)
 *   npx playwright test admin-cms.live
 */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';
test.skip(!ADMIN_EMAIL, 'set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD to run the admin CMS flow');

const sql = async (query: string) => (await fetch(`https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/database/query`, {
  method: 'POST', headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }),
})).json();

const PHOTO = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
let saved: { id: string; config: unknown; label: string }[] = [];

async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('IDENTITY@EMAIL.COM').fill(ADMIN_EMAIL);
  await page.getByPlaceholder('ACCESS_KEY').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Authorize Access' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

test.beforeAll(async () => {
  saved = await sql("select id, config, label from website_sections where page_slug = 'home' and section_type in ('best_sellers', 'hero')");
});
test.afterAll(async () => {
  for (const s of saved) {
    await sql(`update website_sections set config = '${JSON.stringify(s.config).replace(/'/g, "''")}'::jsonb, label = '${String(s.label).replace(/'/g, "''")}' where id = '${s.id}'`);
  }
});

test('admin picks products for Best Sellers and swaps the hero photo; the live home page follows', async ({ page }) => {
  test.setTimeout(180_000);
  page.on('dialog', (d) => d.accept());
  const [target] = await sql("select slug, name from products where is_active order by created_at desc limit 1");
  await login(page);
  await page.goto('/admin/cms');

  // Best sellers → pick one product
  await page.locator('aside li', { hasText: 'Best Sellers' }).first().click();
  await page.getByRole('button', { name: 'Pick products', exact: true }).click();
  await page.getByPlaceholder('Search products to add…').fill(target.name.split(' ')[0]);
  await page.getByRole('button', { name: new RegExp(target.name) }).first().click();
  await expect(page.getByText('● Unsaved changes')).toBeVisible();
  await page.screenshot({ path: 'test-results/admin-cms-editor.png', fullPage: false });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('All changes saved')).toBeVisible();
  const [bs] = await sql("select config from website_sections where page_slug = 'home' and section_type = 'best_sellers'");
  expect(bs.config.product_mode).toBe('manual');
  expect(bs.config.product_slugs).toEqual([target.slug]);

  // Hero → photo by URL
  await page.locator('aside li', { hasText: /^\d+Hero/ }).first().click();
  const photoBlock = page.locator('div', { has: page.getByText('Photo or video', { exact: true }) }).last();
  await photoBlock.getByPlaceholder(/Paste (an image|a video) URL/).fill(PHOTO);
  await photoBlock.getByPlaceholder(/Paste (an image|a video) URL/).press('Enter');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('All changes saved')).toBeVisible();

  // Live home page reflects both
  await page.goto('/');
  await expect(page.locator(`img[src="${PHOTO}"]`).first()).toBeAttached({ timeout: 20_000 });
  const bestSellerLinks = page.locator(`a[href="/products/${target.slug}"]`);
  await expect(bestSellerLinks.first()).toBeAttached({ timeout: 20_000 });
});
