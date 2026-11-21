// The OCR engine is now a plain REST call to a self-hosted service
// (src/handwriting-ocr-space/), not a client-side library loaded from a
// CDN — so unlike the old Tesseract.js version, this can be fully tested
// with a mocked response, no real network or model inference needed.
const { test, expect } = require('@playwright/test');
const { buildInitScript } = require('./fixtures/mock-supabase');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(buildInitScript({ ocrLines: ['Buy milk', 'Call John Smith', 'Finish quarterly report'] }));
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof state !== 'undefined' && typeof render === 'function');
  await page.evaluate(() => { state.currentUserId = 'E2'; state.locked = false; state.page = 'myDay'; render(); });
});

async function uploadSyntheticPhoto(page, context) {
  const imgPage = await context.newPage();
  await imgPage.setContent('<canvas id="c" width="300" height="150"></canvas>');
  const dataUrl = await imgPage.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 300, 150);
    ctx.fillStyle = '#000'; ctx.fillRect(10, 10, 100, 20);
    return c.toDataURL('image/png');
  });
  await imgPage.close();
  const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
  await page.setInputFiles('#pi-file', { name: 'list.png', mimeType: 'image/png', buffer });
}

test('full pipeline: upload -> scan -> review -> create tasks', async ({ page, context }) => {
  await page.locator('button:has-text("Add from Photo")').first().click();
  expect(await page.evaluate(() => state.modal.stage)).toBe('pick');

  await uploadSyntheticPhoto(page, context);
  expect(await page.evaluate(() => state.modal.stage)).toBe('preview');

  await page.locator('button:has-text("Scan Handwriting")').click();
  await page.waitForFunction(() => state.modal.stage === 'review', null, { timeout: 10_000 });

  // Confirms the request actually went to our OCR endpoint, not jsdelivr.
  const calls = await page.evaluate(() => window.__fetchCalls);
  expect(calls.some((c) => c.url.indexOf('/scan') !== -1)).toBe(true);

  const lines = await page.evaluate(() => state.modal.lines);
  expect(lines.map((l) => l.text)).toEqual(['Buy milk', 'Call John Smith', 'Finish quarterly report']);
  const today = await page.evaluate(() => todayISO());
  expect(lines[0].dueDate).toBe(await page.evaluate((t) => addDaysISO(t, 1), today));
  expect(lines[1].dueDate).toBe(await page.evaluate((t) => addDaysISO(t, 2), today));
  expect(lines.every((l) => l.included)).toBe(true);

  await page.locator('#pi-add-btn').click();
  await page.waitForFunction(() => !state.modal, null, { timeout: 5_000 });

  const createdTasks = await page.evaluate(() => DB.tasks.filter((t) => t.assignedTo === 'E2'));
  expect(createdTasks).toHaveLength(3);
  expect(createdTasks.map((t) => t.name).sort()).toEqual(
    ['Buy milk', 'Call John Smith', 'Finish quarterly report'].sort(),
  );
});

test('no readable lines lands on the empty stage, not an error', async ({ page, context }) => {
  // Override the default mock with an empty OCR response for this test.
  await page.addInitScript(() => {
    const origFetch = window.fetch;
    window.fetch = function (url, opts) {
      if (typeof url === 'string' && url.indexOf('/scan') !== -1) {
        window.__fetchCalls = window.__fetchCalls || [];
        window.__fetchCalls.push({ url, opts });
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ lines: [] }) });
      }
      return origFetch(url, opts);
    };
  });
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof state !== 'undefined' && typeof render === 'function');
  await page.evaluate(() => { state.currentUserId = 'E2'; state.locked = false; state.page = 'myDay'; render(); });

  await page.locator('button:has-text("Add from Photo")').first().click();
  await uploadSyntheticPhoto(page, context);
  await page.locator('button:has-text("Scan Handwriting")').click();
  await page.waitForFunction(() => state.modal.stage === 'empty', null, { timeout: 10_000 });
  await expect(page.locator('text=Try Another Photo')).toBeVisible();
});

test('a failed request to the OCR endpoint lands on the error stage', async ({ page, context }) => {
  await page.addInitScript(() => {
    const origFetch = window.fetch;
    window.fetch = function (url, opts) {
      if (typeof url === 'string' && url.indexOf('/scan') !== -1) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return origFetch(url, opts);
    };
  });
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof state !== 'undefined' && typeof render === 'function');
  await page.evaluate(() => { state.currentUserId = 'E2'; state.locked = false; state.page = 'myDay'; render(); });

  await page.locator('button:has-text("Add from Photo")').first().click();
  await uploadSyntheticPhoto(page, context);
  await page.locator('button:has-text("Scan Handwriting")').click();
  await page.waitForFunction(() => state.modal.stage === 'error', null, { timeout: 10_000 });
  await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
});
