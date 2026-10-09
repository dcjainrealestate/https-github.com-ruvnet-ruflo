import { buildReminderEmail, computeDaysRemaining, shouldSendReminder } from '../src/services/reminderService';

describe('computeDaysRemaining', () => {
  it('returns positive days when the target date is in the future', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const target = new Date('2026-01-11T00:00:00.000Z');
    expect(computeDaysRemaining(target, now)).toBe(10);
  });

  it('returns negative days once the target date has passed', () => {
    const now = new Date('2026-01-11T00:00:00.000Z');
    const target = new Date('2026-01-01T00:00:00.000Z');
    expect(computeDaysRemaining(target, now)).toBe(-10);
  });
});

describe('shouldSendReminder', () => {
  it('sends a reminder immediately when none has been sent yet', () => {
    expect(shouldSendReminder(null)).toBe(true);
  });

  it('does not re-send within the weekly interval', () => {
    const now = new Date('2026-01-08T00:00:00.000Z');
    const lastSent = new Date('2026-01-05T00:00:00.000Z');
    expect(shouldSendReminder(lastSent, now)).toBe(false);
  });

  it('sends again once a week has passed since the last reminder', () => {
    const now = new Date('2026-01-08T00:00:00.000Z');
    const lastSent = new Date('2026-01-01T00:00:00.000Z');
    expect(shouldSendReminder(lastSent, now)).toBe(true);
  });
});

describe('buildReminderEmail', () => {
  it('describes days remaining when the target date is still ahead', () => {
    const { subject } = buildReminderEmail({
      customerName: 'Jane Doe',
      projectName: 'Skyline Heights',
      flatNo: 'B-1203',
      daysRemaining: 5,
    });
    expect(subject).toContain('5 day(s) remaining');
  });

  it('flags an overdue listing when days remaining is negative', () => {
    const { html } = buildReminderEmail({
      customerName: 'Jane Doe',
      projectName: 'Skyline Heights',
      flatNo: 'B-1203',
      daysRemaining: -3,
    });
    expect(html).toContain('3 day(s) past your target sale date');
  });
});
