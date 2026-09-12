import { apiRequest } from './client';
import type { CurrentUser } from '../types';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResult {
  id: string;
  email: string;
  role: string;
  twoFactorSetupDeadline: string;
  message: string;
}

export function register(input: RegisterInput): Promise<RegisterResult> {
  return apiRequest('/auth/register', { method: 'POST', body: input, auth: false });
}

export interface LoginResult {
  requiresTwoFactor: boolean;
  accessToken?: string;
  tempToken?: string;
  twoFactorSetupDeadline?: string;
}

export function login(email: string, password: string): Promise<LoginResult> {
  return apiRequest('/auth/login', { method: 'POST', body: { email, password }, auth: false });
}

export function verifyTwoFactorLogin(tempToken: string, token: string): Promise<{ accessToken: string }> {
  return apiRequest('/auth/2fa/verify-login', { method: 'POST', body: { tempToken, token }, auth: false });
}

export interface TwoFactorSetupResult {
  secret: string;
  otpAuthUrl: string;
  qrCodeDataUrl: string;
}

export function startTwoFactorSetup(setupToken?: string): Promise<TwoFactorSetupResult> {
  return apiRequest('/auth/2fa/setup', {
    method: 'POST',
    auth: !setupToken,
    extraHeaders: setupToken ? { 'X-2FA-Setup-Token': setupToken } : undefined,
  });
}

export function confirmTwoFactorSetup(
  token: string,
  setupToken?: string,
): Promise<{ accessToken: string; twoFactorEnabled: boolean }> {
  return apiRequest('/auth/2fa/setup/confirm', {
    method: 'POST',
    body: { token },
    auth: !setupToken,
    extraHeaders: setupToken ? { 'X-2FA-Setup-Token': setupToken } : undefined,
  });
}

export function forgotPassword(email: string): Promise<{ message: string }> {
  return apiRequest('/auth/forgot-password', { method: 'POST', body: { email }, auth: false });
}

export function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return apiRequest('/auth/reset-password', { method: 'POST', body: { token, newPassword }, auth: false });
}

export function getCurrentUser(): Promise<CurrentUser> {
  return apiRequest('/auth/me');
}
