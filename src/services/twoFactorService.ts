import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { env } from '../config/env';

export function computeTwoFactorSetupDeadline(from: Date = new Date()): Date {
  const deadline = new Date(from);
  deadline.setUTCDate(deadline.getUTCDate() + env.twoFactorSetupGraceDays);
  return deadline;
}

export function isTwoFactorSetupOverdue(deadline: Date, now: Date = new Date()): boolean {
  return now.getTime() > deadline.getTime();
}

export function generateTwoFactorSecret(): string {
  return authenticator.generateSecret();
}

export function buildOtpAuthUrl(email: string, secret: string): string {
  return authenticator.keyuri(email, env.twoFactorIssuer, secret);
}

export async function generateQrCodeDataUrl(otpAuthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpAuthUrl);
}

export function verifyTwoFactorToken(token: string, secret: string): boolean {
  return authenticator.verify({ token, secret });
}
