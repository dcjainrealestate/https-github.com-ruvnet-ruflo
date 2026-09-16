import {
  computeResetTokenExpiry,
  generateResetToken,
  hashResetToken,
  isResetTokenExpired,
} from '../src/services/passwordResetService';

describe('generateResetToken / hashResetToken', () => {
  it('generates a unique token each call', () => {
    expect(generateResetToken()).not.toBe(generateResetToken());
  });

  it('hashes the same token to the same value deterministically', () => {
    const token = generateResetToken();
    expect(hashResetToken(token)).toBe(hashResetToken(token));
  });

  it('hashes different tokens to different values', () => {
    expect(hashResetToken('a')).not.toBe(hashResetToken('b'));
  });
});

describe('computeResetTokenExpiry / isResetTokenExpired', () => {
  it('expires 60 minutes after creation', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    expect(computeResetTokenExpiry(from).toISOString()).toBe('2026-01-01T01:00:00.000Z');
  });

  it('is not expired before the expiry time', () => {
    const expiresAt = new Date('2026-01-01T01:00:00.000Z');
    const now = new Date('2026-01-01T00:59:00.000Z');
    expect(isResetTokenExpired(expiresAt, now)).toBe(false);
  });

  it('is expired after the expiry time', () => {
    const expiresAt = new Date('2026-01-01T01:00:00.000Z');
    const now = new Date('2026-01-01T01:00:01.000Z');
    expect(isResetTokenExpired(expiresAt, now)).toBe(true);
  });
});
