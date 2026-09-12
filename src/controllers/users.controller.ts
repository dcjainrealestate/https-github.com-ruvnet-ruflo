import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { BadRequestError, NotFoundError } from '../utils/errors';
import {
  updateFieldVisibilityRightsSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from '../utils/validators.users';

const USER_LIST_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  twoFactorEnabled: true,
  twoFactorSetupDeadline: true,
  canManageFieldVisibility: true,
  createdAt: true,
} as const;

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({ select: USER_LIST_SELECT, orderBy: { createdAt: 'desc' } });
  res.status(200).json(users);
});

// Only SUPER_ADMIN may call this (enforced at the route level). Grants or
// changes a user's role, including promoting to ADMIN or SUPER_ADMIN.
export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const input = updateUserRoleSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      role: input.role,
      // Losing ADMIN status also revokes any delegated masking/hiding rights.
      canManageFieldVisibility: input.role === 'ADMIN' ? user.canManageFieldVisibility : false,
    },
    select: USER_LIST_SELECT,
  });

  res.status(200).json(updated);
});

// SUPER_ADMIN delegates (or revokes) the right to manage field masking/hiding
// rules. Only meaningful for ADMIN-role users.
export const updateFieldVisibilityRights = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const input = updateFieldVisibilityRightsSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundError('User not found');
  }
  if (input.canManageFieldVisibility && user.role !== 'ADMIN') {
    throw new BadRequestError('Field visibility management rights can only be delegated to ADMIN users');
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { canManageFieldVisibility: input.canManageFieldVisibility },
    select: USER_LIST_SELECT,
  });

  res.status(200).json(updated);
});

export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const input = updateUserStatusSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: input.isActive },
    select: USER_LIST_SELECT,
  });

  res.status(200).json(updated);
});
