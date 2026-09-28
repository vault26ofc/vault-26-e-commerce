import { test, expect, type Page } from '@playwright/test';

/**
 * Admin catalog flow against the real Supabase project. Opt-in; creates and removes its own data:
 *   E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... (+ SUPABASE_PROJECT_REF / SUPABASE_ACCESS_TOKEN from .env)
 *   npx playwright test admin-catalog.live
 */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';
test.skip(!ADMIN_EMAIL, 'set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD to run the admin catalog flow');
const sql = async (query: string) => (await fetch(`https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/database/query`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })).json();
const CAT = 'E2E Test Cat';
const PROD = 'E2E Test Tee';
const CAT2 = 'E2E Test Cat 2';
const IMG = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('IDENTITY@EMAIL.COM').fill(ADMIN_EMAIL);
  await page.getByPlaceholder('ACCESS_KEY').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Authorize Access' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

test('admin catalog flow: category → sizes → product variants → edit keeps ids → inventory', async ({ page }) => {
  test.setTimeout(240_000);
  page.on('dialog', (d) => d.accept());
  await login(page);

  // 1. Category with image
  await page.goto('/admin/catalog');
  const catPanel = page.locator('div.border', { has: page.locator('.eyebrow', { hasText: /^Categories$/ }) });
  await catPanel.getByRole('button', { name: 'New' }).click();
  await page.getByLabel('Name').fill(CAT);
  await page.getByPlaceholder('…or paste an image / video URL').first().fill(IMG);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(catPanel.getByText(CAT)).toBeVisible();
  const [{ id: catId }] = await sql(`select id from categories where name='${CAT}'`);
  expect((await sql(`select image from categories where id='${catId}'`))[0].image).toBe(IMG);

  // 2. Sizes via preset
  await page.goto('/admin/sizes');
  await page.getByLabel('Category').selectOption({ label: CAT });
  await page.getByRole('button', { name: 'Clothing' }).click();
  await expect(page.getByRole('cell', { name: 'XXL', exact: true })).toBeVisible();
  expect((await sql(`select count(*)::int n from sizes where category_id='${catId}'`))[0].n).toBe(6);

  await sql(`insert into categories(name, slug) values ('${CAT2}', 'e2e-test-cat-2')`);

  // 3. Product with generated variants
  await page.goto('/admin/products');
  await page.getByRole('button', { name: 'New product' }).click();
  await page.getByLabel('★ Primary category *').selectOption({ label: CAT });
  await page.getByLabel('Name *').fill(PROD);
  await page.getByRole('button', { name: `+ ${CAT2}` }).click();
  await page.getByPlaceholder('Paste an image / video URL').first().fill(IMG);
  await page.getByPlaceholder('Paste an image / video URL').first().press('Enter');
  await page.getByRole('button', { name: 'S', exact: true }).click();
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await page.getByPlaceholder('Colour name, e.g. Sand').fill('Red');
  await page.getByPlaceholder('Colour name, e.g. Sand').press('Enter');
  await page.getByLabel('Default price (₹)').fill('1234');
  await page.getByLabel('Default stock').fill('5');
  await page.getByRole('button', { name: 'Generate variants' }).click();
  await expect(page.getByText('2 variants · 10 in stock')).toBeVisible();
  await page.screenshot({ path: 'test-results/admin-product-editor.png', fullPage: true });
  await page.getByRole('button', { name: 'Save product' }).click();
  await expect(page.getByText('Product saved')).toBeVisible();
  const vs1 = await sql(`select v.id, v.size, v.color, v.price, v.stock from product_variants v join products p on p.id=v.product_id where p.name='${PROD}' order by v.size desc`);
  expect(vs1.map((v: any) => `${v.size}/${v.color}/${Number(v.price)}/${v.stock}`)).toEqual(['S/Red/1234/5', 'M/Red/1234/5']);

  expect((await sql(`select count(*)::int n from product_categories pc join products p on p.id=pc.product_id join categories c on c.id=pc.category_id where p.name='${PROD}' and c.name='${CAT2}'`))[0].n).toBe(1);
  // It shows on the extra category's store page
  await page.goto('/category/e2e-test-cat-2');
  await expect(page.getByText('1 piece', { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('a[href="/products/e2e-test-tee"]').first()).toBeAttached();
  await page.goto('/admin/products');

  // 4. Edit keeps variant ids
  await page.getByRole('button', { name: PROD }).click();
  await page.locator('tbody input[type="number"]').first().fill('1500');
  await page.getByRole('button', { name: 'Save product' }).click();
  await expect(page.getByText('Product saved')).toBeVisible();
  const vs2 = await sql(`select v.id, v.price from product_variants v join products p on p.id=v.product_id where p.name='${PROD}'`);
  expect(vs2.map((v: any) => v.id).sort()).toEqual(vs1.map((v: any) => v.id).sort());
  expect(vs2.map((v: any) => Number(v.price)).sort()).toEqual([1234, 1500]);

  // 5. Inventory adjust + history
  await page.goto('/admin/inventory');
  await page.getByPlaceholder('Search product, SKU, size, colour…').fill(PROD);
  const row = page.getByRole('row').filter({ hasText: 'S · Red' });
  await row.getByRole('button', { name: 'Add stock' }).click();
  await page.getByLabel('Quantity').fill('3');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Stock is now 8')).toBeVisible();
  await row.getByTitle('Stock history').click();
  await expect(page.getByText('Restock')).toBeVisible();
  await page.screenshot({ path: 'test-results/admin-inventory.png' });
});

test.afterAll(async () => {
  await sql(`delete from products where name='${PROD}'; delete from categories where name in ('${CAT}', '${CAT2}');`);
});
