import { test, expect, type Page } from '@playwright/test';

/**
 * Mega menu flow against the real Supabase project. Opt-in; removes the link/featured rows it adds:
 *   E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... (+ SUPABASE_PROJECT_REF / SUPABASE_ACCESS_TOKEN from .env)
 *   npx playwright test admin-megamenu.live
 */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';
test.skip(!ADMIN_EMAIL, 'set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD to run the mega menu flow');

const sql = async (query: string) => (await fetch(`https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/database/query`, {
  method: 'POST', headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }),
})).json();

let tabId = '';
let before: { links: string[]; featured: string[] } = { links: [], featured: [] };

async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('IDENTITY@EMAIL.COM').fill(ADMIN_EMAIL);
  await page.getByPlaceholder('ACCESS_KEY').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Authorize Access' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

test.beforeAll(async () => {
  [{ id: tabId }] = await sql("select t.id from mega_menu_tabs t join categories c on c.id = t.category_id where c.name = 'Shirts' limit 1");
  before.links = (await sql(`select id from mega_menu_links where tab_id = '${tabId}'`)).map((r: any) => r.id);
  before.featured = (await sql(`select id from mega_menu_featured where tab_id = '${tabId}'`)).map((r: any) => r.id);
});
test.afterAll(async () => {
  const keepLinks = before.links.map((id) => `'${id}'`).join(',') || "'00000000-0000-0000-0000-000000000000'";
  const keepFeat = before.featured.map((id) => `'${id}'`).join(',') || "'00000000-0000-0000-0000-000000000000'";
  await sql(`delete from mega_menu_links where tab_id = '${tabId}' and id not in (${keepLinks}); delete from mega_menu_featured where tab_id = '${tabId}' and id not in (${keepFeat});`);
});

test('admin sets links + 2 featured products; hovering the navbar tab shows them', async ({ page }) => {
  test.setTimeout(180_000);
  page.on('dialog', (d) => d.accept());
  const products = await sql('select slug, name from products where is_active order by name limit 2');
  await login(page);
  await page.goto('/admin/mega-menu');

  // Manage the Shirts tab
  await page.getByRole('button', { name: /^Shirts (→|✓)$/ }).click();

  // Step 2: add "Trousers" as a link, via search
  await page.getByRole('button', { name: '— search a category to add —' }).click();
  await page.getByPlaceholder('Search…').fill('trou');
  await page.getByRole('option', { name: 'Trousers' }).click();
  await page.getByRole('button', { name: /Add link/ }).click();
  await expect(page.getByText('Link added')).toBeVisible();

  // Step 3: feature 2 products via search
  for (const p of products) {
    await page.getByPlaceholder('Search products to add…').fill(p.name);
    await page.getByRole('button', { name: new RegExp(p.name) }).first().click();
    await expect(page.getByText('Featured products saved').first()).toBeVisible();
  }
  await page.screenshot({ path: 'test-results/admin-megamenu.png', fullPage: true });
  expect((await sql(`select count(*)::int n from mega_menu_featured where tab_id = '${tabId}'`))[0].n).toBe(2);

  // Storefront: hover the tab (the navbar is hidden on the home hero, so use /shop)
  await page.goto('/shop');
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: /shirts/i }).hover();
  const dropdown = page.locator('header').getByRole('link', { name: 'Trousers', exact: true });
  await expect(dropdown).toBeVisible({ timeout: 10_000 });
  for (const p of products) await expect(page.locator(`header a[href="/products/${p.slug}"]`)).toBeVisible();
  await page.screenshot({ path: 'test-results/storefront-megamenu.png' });
});
