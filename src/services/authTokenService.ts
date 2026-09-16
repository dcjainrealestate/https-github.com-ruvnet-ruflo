import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { AccessTokenPayload, TempTwoFactorTokenPayload } from '../types';

export function issueAccessToken(userId: string, role: Role, twoFactorEnabled: boolean): string {
  const payload: AccessTokenPayload = { sub: userId, role, twoFactorEnabled };
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessExpiresIn as jwt.SignOptions['expiresIn'] });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}

export function issueTempTwoFactorToken(userId: string, purpose: TempTwoFactorTokenPayload['purpose']): string {
  const payload: TempTwoFactorTokenPayload = { sub: userId, purpose };
  return jwt.sign(payload, env.jwtTemp2faSecret, {
    expiresIn: env.jwtTemp2faExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyTempTwoFactorToken(token: string): TempTwoFactorTokenPayload {
  return jwt.verify(token, env.jwtTemp2faSecret) as TempTwoFactorTokenPayload;
}
