const { test, expect } = require('@playwright/test');
const { buildInitScript } = require('./fixtures/mock-supabase');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(buildInitScript());
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof state !== 'undefined' && typeof render === 'function');
  await page.evaluate(() => { state.currentUserId = 'E1'; state.locked = false; render(); });
});

test('self-assigned task does not trigger an email', async ({ page }) => {
  await page.evaluate(async () => {
    await DB.addTask({
      name: 'My own task', description: '', assignedTo: 'E1', assignedBy: 'E1',
      department: 'Operations', project: 'Internal', createdDate: todayISO(), startDate: todayISO(), dueDate: addDaysISO(todayISO(), 1),
      priority: 'Medium', level: 1, status: 'Not Started', estimatedHours: null, actualHours: null,
      progress: 0, completionDate: null, completionNotes: ''
    });
  });
  expect(await page.evaluate(() => window.__fetchCalls.length)).toBe(0);
});

test('assigning a task to a teammate with an email fires a task-assigned email', async ({ page }) => {
  await page.evaluate(async () => {
    await DB.addTask({
      name: 'Prepare client deck', description: '', assignedTo: 'E2', assignedBy: 'E1',
      department: 'Operations', project: 'Internal', createdDate: todayISO(), startDate: todayISO(), dueDate: addDaysISO(todayISO(), 3),
      priority: 'High', level: 1, status: 'Not Started', estimatedHours: null, actualHours: null,
      progress: 0, completionDate: null, completionNotes: ''
    });
  });
  const calls = await page.evaluate(() => window.__fetchCalls);
  expect(calls).toHaveLength(1);
  expect(calls[0].body.kind).toBe('task-assigned');
  expect(calls[0].body.recipientEmail).toBe('member@example.test');
  expect(calls[0].body.taskName).toBe('Prepare client deck');
  expect(calls[0].body.assignedByName).toBe('Admin User');
  expect(calls[0].body.dueDate).toBeTruthy();
  expect(calls[0].url).toContain('/functions/v1/trigger-broadcast');
});

test('assigning to a teammate with no email on file does not crash or send anything', async ({ page }) => {
  await page.evaluate(async () => {
    await DB.addTask({
      name: 'No-email task', description: '', assignedTo: 'E3', assignedBy: 'E1',
      department: 'Operations', project: 'Internal', createdDate: todayISO(), startDate: todayISO(), dueDate: addDaysISO(todayISO(), 1),
      priority: 'Low', level: 1, status: 'Not Started', estimatedHours: null, actualHours: null,
      progress: 0, completionDate: null, completionNotes: ''
    });
  });
  expect(await page.evaluate(() => window.__fetchCalls.length)).toBe(0);
  expect(await page.evaluate(() => typeof render === 'function')).toBe(true);
});
