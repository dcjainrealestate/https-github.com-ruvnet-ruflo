import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(10).max(200),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const twoFactorSetupVerifySchema = z.object({
  token: z.string().min(6).max(10),
});

export const twoFactorLoginVerifySchema = z.object({
  tempToken: z.string().min(1),
  token: z.string().min(6).max(10),
});
