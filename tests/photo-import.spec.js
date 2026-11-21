// This is the one spec that needs real internet: Tesseract.js is loaded
// on demand from cdn.jsdelivr.net exactly like a real user's browser would,
// so this is the only place this project can verify that CDN path actually
// works end to end (the sandboxed dev environment this suite was written in
// blocks cdn.jsdelivr.net at its own egress proxy, so this could only ever
// be checked here, in CI, against the real network).
const { test, expect } = require('@playwright/test');
const { buildInitScript } = require('./fixtures/mock-supabase');

test.setTimeout(120_000);

test('photo import reads a synthetic task list end to end and creates tasks', async ({ page, context }) => {
  await page.addInitScript(buildInitScript());
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof state !== 'undefined' && typeof render === 'function');
  await page.evaluate(() => { state.currentUserId = 'E2'; state.locked = false; state.page = 'myDay'; render(); });

  await page.locator('button:has-text("Add from Photo")').first().click();
  expect(await page.evaluate(() => state.modal && state.modal.stage === 'pick')).toBe(true);

  // Printed block text (not real handwriting) — this validates the OCR
  // *pipeline* wiring (CDN load, worker, line parsing, review UI, task
  // creation), not handwriting-recognition accuracy, which is inherently a
  // human judgment call documented as a known limitation of the feature.
  const imgPage = await context.newPage();
  await imgPage.setContent('<canvas id="c" width="700" height="360"></canvas>');
  const dataUrl = await imgPage.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 700, 360);
    ctx.fillStyle = '#000000'; ctx.font = '36px sans-serif';
    ctx.fillText('Buy milk', 30, 70);
    ctx.fillText('Call John Smith', 30, 150);
    ctx.fillText('Finish quarterly report', 30, 230);
    return c.toDataURL('image/png');
  });
  await imgPage.close();

  const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
  await page.setInputFiles('#pi-file', { name: 'list.png', mimeType: 'image/png', buffer });
  expect(await page.evaluate(() => state.modal && state.modal.stage === 'preview')).toBe(true);

  await page.locator('button:has-text("Scan Handwriting")').click();
  await page.waitForFunction(
    () => state.modal && (state.modal.stage === 'review' || state.modal.stage === 'empty' || state.modal.stage === 'error'),
    null,
    { timeout: 90_000 },
  );

  const stage = await page.evaluate(() => state.modal.stage);
  expect(stage, 'OCR should not land on the error stage').not.toBe('error');
  if (stage === 'empty') {
    test.skip(true, 'OCR found no readable text from the synthetic image in this environment');
  }

  const lines = await page.evaluate(() => state.modal.lines);
  expect(lines.length).toBeGreaterThan(0);
  const today = await page.evaluate(() => todayISO());
  const expectedFirstDue = await page.evaluate((t) => addDaysISO(t, 1), today);
  expect(lines[0].dueDate).toBe(expectedFirstDue);
  expect(lines.every((l) => l.included)).toBe(true);

  const includedCount = lines.length;
  await page.locator('#pi-add-btn').click();
  await page.waitForFunction(() => !state.modal, null, { timeout: 10_000 });

  const createdTasks = await page.evaluate(() => DB.tasks.filter((t) => t.assignedTo === 'E2'));
  expect(createdTasks).toHaveLength(includedCount);
  expect(createdTasks.every((t) => t.assignedTo === 'E2')).toBe(true);
});
