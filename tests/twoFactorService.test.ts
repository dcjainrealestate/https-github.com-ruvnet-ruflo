import { computeTwoFactorSetupDeadline, isTwoFactorSetupOverdue } from '../src/services/twoFactorService';

describe('twoFactorService', () => {
  it('computes a deadline 7 days (default grace) after account creation', () => {
    const created = new Date('2026-01-01T00:00:00.000Z');
    const deadline = computeTwoFactorSetupDeadline(created);
    expect(deadline.toISOString()).toBe('2026-01-08T00:00:00.000Z');
  });

  it('is not overdue before the deadline', () => {
    const deadline = new Date('2026-01-08T00:00:00.000Z');
    const now = new Date('2026-01-07T23:59:59.000Z');
    expect(isTwoFactorSetupOverdue(deadline, now)).toBe(false);
  });

  it('is overdue after the deadline', () => {
    const deadline = new Date('2026-01-08T00:00:00.000Z');
    const now = new Date('2026-01-08T00:00:01.000Z');
    expect(isTwoFactorSetupOverdue(deadline, now)).toBe(true);
  });
});
