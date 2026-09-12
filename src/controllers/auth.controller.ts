import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { BadRequestError, ConflictError, ForbiddenError, UnauthorizedError } from '../utils/errors';
import {
  loginSchema,
  registerSchema,
  twoFactorLoginVerifySchema,
  twoFactorSetupVerifySchema,
} from '../utils/validators';
import {
  buildOtpAuthUrl,
  computeTwoFactorSetupDeadline,
  generateQrCodeDataUrl,
  generateTwoFactorSecret,
  isTwoFactorSetupOverdue,
  verifyTwoFactorToken,
} from '../services/twoFactorService';
import { issueAccessToken, issueTempTwoFactorToken, verifyTempTwoFactorToken } from '../services/authTokenService';

const PASSWORD_SALT_ROUNDS = 12;

export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: 'CONTRIBUTOR',
      twoFactorSetupDeadline: computeTwoFactorSetupDeadline(),
    },
  });

  res.status(201).json({
    id: user.id,
    email: user.email,
    role: user.role,
    twoFactorSetupDeadline: user.twoFactorSetupDeadline,
    message: 'Account created. Two-factor authentication must be set up within the grace period to keep logging in.',
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.isActive) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const passwordOk = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordOk) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (user.twoFactorEnabled) {
    const tempToken = issueTempTwoFactorToken(user.id, '2fa-login');
    return res.status(200).json({
      requiresTwoFactor: true,
      tempToken,
    });
  }

  if (isTwoFactorSetupOverdue(user.twoFactorSetupDeadline)) {
    const tempToken = issueTempTwoFactorToken(user.id, '2fa-setup');
    throw Object.assign(
      new ForbiddenError('Two-factor authentication setup grace period has expired. Set up 2FA to continue.'),
      { tempToken },
    );
  }

  const accessToken = issueAccessToken(user.id, user.role, user.twoFactorEnabled);
  return res.status(200).json({
    requiresTwoFactor: false,
    accessToken,
    twoFactorSetupDeadline: user.twoFactorSetupDeadline,
  });
});

export const verifyTwoFactorLogin = asyncHandler(async (req: Request, res: Response) => {
  const input = twoFactorLoginVerifySchema.parse(req.body);
  const payload = verifyTempTwoFactorToken(input.tempToken);
  if (payload.purpose !== '2fa-login') {
    throw new BadRequestError('Invalid token for this operation');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.twoFactorSecret) {
    throw new UnauthorizedError('Two-factor authentication is not configured');
  }

  const ok = verifyTwoFactorToken(input.token, user.twoFactorSecret);
  if (!ok) {
    throw new UnauthorizedError('Invalid authentication code');
  }

  const accessToken = issueAccessToken(user.id, user.role, user.twoFactorEnabled);
  res.status(200).json({ accessToken });
});

// Begins (or restarts) 2FA setup. Accepts either a normal access token (user
// setting up 2FA voluntarily/within grace period) or the temp "2fa-setup"
// token issued when login is blocked pending mandatory setup.
export const startTwoFactorSetup = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.twoFactorSetupUserId ?? req.user?.sub;
  if (!userId) {
    throw new UnauthorizedError('Authentication required');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new UnauthorizedError('Account not found');
  }

  const secret = generateTwoFactorSecret();
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorTempSecret: secret } });

  const otpAuthUrl = buildOtpAuthUrl(user.email, secret);
  const qrCodeDataUrl = await generateQrCodeDataUrl(otpAuthUrl);

  res.status(200).json({ secret, otpAuthUrl, qrCodeDataUrl });
});

export const confirmTwoFactorSetup = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.twoFactorSetupUserId ?? req.user?.sub;
  if (!userId) {
    throw new UnauthorizedError('Authentication required');
  }
  const input = twoFactorSetupVerifySchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.twoFactorTempSecret) {
    throw new BadRequestError('Two-factor setup has not been started');
  }

  const ok = verifyTwoFactorToken(input.token, user.twoFactorTempSecret);
  if (!ok) {
    throw new UnauthorizedError('Invalid authentication code');
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorSecret: user.twoFactorTempSecret,
      twoFactorTempSecret: null,
      twoFactorEnabled: true,
    },
  });

  const accessToken = issueAccessToken(updated.id, updated.role, updated.twoFactorEnabled);
  res.status(200).json({ accessToken, twoFactorEnabled: true });
});
