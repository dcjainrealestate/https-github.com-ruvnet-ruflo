const { test, expect } = require('@playwright/test');
const { buildInitScript } = require('./fixtures/mock-supabase');

test('logged-out boot shows only the email sign-in gate, no access-code option', async ({ page }) => {
  await page.addInitScript(buildInitScript());
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof state !== 'undefined' && typeof render === 'function');

  await expect(page.locator('#email-input')).toBeVisible();
  await expect(page.locator('#access-code-input')).toHaveCount(0);
  await expect(page.locator('text=Access Code')).toHaveCount(0);
  expect(await page.evaluate(() => !!currentUser())).toBe(false);
});

test('an established Supabase Auth session signs the matching employee in and links auth_user_id', async ({ page }) => {
  await page.addInitScript(
    buildInitScript({ session: { user: { email: 'member@example.test', id: 'auth-uid-123' } } }),
  );
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof state !== 'undefined' && typeof render === 'function');
  await page.waitForFunction(() => !!currentUser());

  expect(await page.evaluate(() => currentUser().id)).toBe('E2');
  expect(await page.evaluate(() => state.locked)).toBe(true); // not a super admin

  const updateCalls = await page.evaluate(() => window.__employeeUpdateCalls);
  expect(updateCalls.some((c) => c.auth_user_id === 'auth-uid-123')).toBe(true);
});

test('an auth session for an unknown email falls back to the login gate', async ({ page }) => {
  await page.addInitScript(
    buildInitScript({ session: { user: { email: 'nobody@example.test', id: 'auth-uid-999' } } }),
  );
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof state !== 'undefined' && typeof render === 'function');

  expect(await page.evaluate(() => !!currentUser())).toBe(false);
  await expect(page.locator('#email-input')).toBeVisible();
});
