import { test, expect } from '@playwright/test';

// All public routes should load without React errors / blank screens
const PUBLIC_ROUTES = [
  { path: '/', name: 'Homepage', mustContain: null },
  { path: '/shop', name: 'Shop', mustContain: null },
  { path: '/login', name: 'Login', mustContain: 'login' },
  { path: '/register', name: 'Register', mustContain: 'register' },
  { path: '/wishlist', name: 'Wishlist', mustContain: null },
];

test.describe('Public route navigation', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.name} (${route.path}) loads without crash`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      const res = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      expect(res?.status(), `HTTP status for ${route.path}`).toBeLessThan(400);

      // Wait for React to hydrate - no blank white screen (body should have children)
      await expect(page.locator('body')).not.toBeEmpty();
      await page.waitForTimeout(2000);

      // Should not show React error overlay
      const errorOverlay = page.locator('#react-error-boundary, [data-testid="error-boundary"]');
      if (await errorOverlay.count() > 0) {
        throw new Error(`React error boundary triggered on ${route.path}`);
      }

      // No critical JS errors
      const criticalErrors = errors.filter(e =>
        e.includes('Cannot read') || e.includes('is not a function') || e.includes('is undefined')
      );
      expect(criticalErrors, `JS errors on ${route.path}: ${criticalErrors.join(', ')}`).toHaveLength(0);
    });
  }

  test('404 page shows NotFound', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-at-all');
    await page.waitForTimeout(1500);
    const body = await page.textContent('body');
    expect(body?.toLowerCase()).toMatch(/not found|404|page.*exist|no.*exist/i);
  });

  test('SPA routing — browser back/forward works', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    await page.goto('/shop');
    await page.waitForTimeout(1000);
    await page.goBack();
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('localhost:5173/');
    await page.goForward();
    expect(page.url()).toContain('/shop');
  });

  test('Navbar renders on store pages', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    // Navbar should exist (it's inside StoreLayout)
    const nav = page.locator('nav, header').first();
    await expect(nav).toBeVisible();
  });

  test('Footer renders on store pages', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });
});
