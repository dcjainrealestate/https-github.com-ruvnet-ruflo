const { test, expect } = require('@playwright/test');
const { buildInitScript } = require('./fixtures/mock-supabase');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(buildInitScript());
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof state !== 'undefined' && typeof render === 'function');
  await page.evaluate(() => { state.currentUserId = 'E1'; state.locked = false; state.page = 'dashboard'; render(); });
});

test('Send Update button opens the modal defaulted to Everyone', async ({ page }) => {
  await page.locator('button:has-text("Send Update")').first().click();
  expect(await page.evaluate(() => state.modal && state.modal.type === 'sendUpdateEmail')).toBe(true);
  expect(await page.evaluate(() => state.modal.recipient)).toBe('');
  await expect(page.locator('#su-send-btn')).toHaveText('Send');
});

test('empty subject and message both block sending', async ({ page }) => {
  await page.locator('button:has-text("Send Update")').first().click();
  await page.locator('#su-send-btn').click();
  expect(await page.evaluate(() => window.__fetchCalls.length)).toBe(0);
  expect(await page.evaluate(() => !!state.modal)).toBe(true);

  await page.fill('#su-subject', 'Subject only');
  await page.locator('#su-send-btn').click();
  expect(await page.evaluate(() => window.__fetchCalls.length)).toBe(0);
});

test('picking a specific member sends only to them', async ({ page }) => {
  await page.locator('button:has-text("Send Update")').first().click();
  await page.selectOption('#su-recipient', 'E2');
  await expect(page.locator('#su-send-btn')).toHaveText('Send to Test');

  await page.fill('#su-subject', 'Heads up');
  await page.fill('#su-body', 'Please check your task list.');
  await page.locator('#su-send-btn').click();
  await page.waitForFunction(() => !state.modal);

  const call = await page.evaluate(() => window.__fetchCalls[window.__fetchCalls.length - 1]);
  expect(call.body.recipientEmail).toBe('member@example.test');
  expect(call.body.subject).toBe('Heads up');
});

test('leaving Everyone selected sends with no recipientEmail field', async ({ page }) => {
  await page.locator('button:has-text("Send Update")').first().click();
  await page.fill('#su-subject', 'Company update');
  await page.fill('#su-body', 'All hands next week.');
  await page.locator('#su-send-btn').click();
  await page.waitForFunction(() => !state.modal);

  const call = await page.evaluate(() => window.__fetchCalls[window.__fetchCalls.length - 1]);
  expect(call.body).not.toHaveProperty('recipientEmail');
});
