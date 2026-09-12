import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    if (!allowed.includes(req.user.role)) {
      throw new ForbiddenError('You do not have permission to perform this action');
    }
    next();
  };
}

export const isSuperAdmin = (role: Role): boolean => role === 'SUPER_ADMIN';
export const isAdminOrAbove = (role: Role): boolean => role === 'SUPER_ADMIN' || role === 'ADMIN';
