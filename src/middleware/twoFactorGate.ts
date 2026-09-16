import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../utils/errors';
import { verifyAccessToken, verifyTempTwoFactorToken } from '../services/authTokenService';

// Lets a user who is locked out of normal login (2FA setup overdue) still
// reach the 2FA setup endpoints, scoped strictly to that purpose via a
// short-lived temp token rather than a full access token.
export function acceptTwoFactorSetupToken(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers['x-2fa-setup-token'];
  if (typeof header === 'string' && header.length > 0) {
    try {
      const payload = verifyTempTwoFactorToken(header);
      if (payload.purpose === '2fa-setup') {
        req.twoFactorSetupUserId = payload.sub;
      }
    } catch {
      throw new UnauthorizedError('Invalid or expired two-factor setup token');
    }
  }
  next();
}

// 2FA setup endpoints are reachable either by a normal signed-in user
// (voluntary/early setup) or by the scoped setup token issued when login is
// blocked pending mandatory 2FA (grace period expired).
export function requireAuthOrTwoFactorSetupToken(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = verifyAccessToken(header.slice('Bearer '.length));
      return next();
    } catch {
      // fall through to setup-token check below
    }
  }
  if (req.twoFactorSetupUserId) {
    return next();
  }
  throw new UnauthorizedError('Authentication or a valid two-factor setup token is required');
}
