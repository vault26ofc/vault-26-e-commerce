import { test, expect } from '@playwright/test';

test.describe('Auth guards', () => {
  test('/account shows login gate when not authenticated', async ({ page }) => {
    await page.goto('/account');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    // Should either redirect to /login or show "login" / "sign in" prompt
    const isLoginPage = page.url().includes('/login');
    const hasLoginContent = body?.toLowerCase().match(/sign.?in|log.?in|authorize/i);
    expect(isLoginPage || hasLoginContent, 'Account page should gate unauthenticated users').toBeTruthy();
  });

  test('/orders shows access denied when not authenticated', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    // Shows "Access Denied" or redirects
    const hasAccessDenied = body?.toLowerCase().match(/access.?denied|authorize|sign.?in|log.?in/i);
    expect(hasAccessDenied, 'Orders page should deny unauthenticated access').toBeTruthy();
  });

  test('/checkout with empty cart shows empty state, not crash', async ({ page }) => {
    // Clear any cart state
    await page.context().clearCookies();
    await page.goto('/checkout');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    // Should show empty cart UI, not a crash / blank screen
    const showsContent = body && body.length > 100;
    expect(showsContent, 'Checkout should render something (empty cart message)').toBeTruthy();
  });

  test('/admin redirects non-admin users', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    // Should either redirect to /login or show "admin access required"
    const isLoginPage = page.url().includes('/login');
    const body = await page.textContent('body');
    const hasAdminGate = body?.toLowerCase().match(/admin.*access|access.*required|sign.?in|log.?in/i);
    expect(isLoginPage || hasAdminGate, 'Admin should gate unauthenticated users').toBeTruthy();
  });

  test('/admin/cms is protected behind admin check', async ({ page }) => {
    await page.goto('/admin/cms');
    await page.waitForTimeout(2000);
    const isLoginPage = page.url().includes('/login');
    const body = await page.textContent('body');
    const hasAdminGate = body?.toLowerCase().match(/admin.*access|access.*required|sign.?in|log.?in/i);
    expect(isLoginPage || hasAdminGate, 'CMS admin should be gated').toBeTruthy();
  });

  test('Login page has form elements', async ({ page }) => {
    await page.goto('/login');
    await page.waitForTimeout(2000);
    // Email input
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    await expect(emailInput).toBeVisible();
    // Password input
    const passInput = page.locator('input[type="password"]').first();
    await expect(passInput).toBeVisible();
    // Submit button
    const submitBtn = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Login"), button:has-text("Enter")').first();
    await expect(submitBtn).toBeVisible();
  });

  test('Register page has form elements', async ({ page }) => {
    await page.goto('/register');
    await page.waitForTimeout(2000);
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible();
  });

  test('Order detail with random UUID shows not found', async ({ page }) => {
    await page.goto('/orders/00000000-0000-0000-0000-000000000000');
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    // Should show not found / access denied, not actual order data
    const hasOrderContent = body?.match(/order.{0,30}number|shipping.{0,30}address/i);
    expect(hasOrderContent, 'Random order UUID should NOT show order details').toBeFalsy();
  });

  test('Order success with random UUID shows not found', async ({ page }) => {
    await page.goto('/order-success/00000000-0000-0000-0000-000000000000');
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    const hasOrderData = body?.match(/order.{0,5}#\d+/i);
    expect(hasOrderData, 'Random order success UUID should NOT show order data').toBeFalsy();
  });
});
