import { Role } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  twoFactorEnabled: boolean;
}

export interface TempTwoFactorTokenPayload {
  sub: string;
  purpose: '2fa-login' | '2fa-setup';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
      twoFactorSetupUserId?: string;
    }
  }
}
