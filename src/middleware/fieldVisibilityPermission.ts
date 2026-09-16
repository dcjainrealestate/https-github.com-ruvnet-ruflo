import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

// SUPER_ADMIN always has the right to manage field masking/hiding rules.
// ADMIN only has it when SUPER_ADMIN has explicitly delegated it
// (user.canManageFieldVisibility). Looked up fresh from the DB rather than
// trusted from the JWT, since delegation can be revoked at any time.
export const requireFieldVisibilityManager = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }
    if (req.user.role === 'ADMIN') {
      const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
      if (user?.canManageFieldVisibility) {
        return next();
      }
    }
    throw new ForbiddenError('You do not have the right to manage field masking/hiding rules');
  },
);
