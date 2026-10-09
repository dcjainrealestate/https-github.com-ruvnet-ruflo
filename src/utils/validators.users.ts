import { z } from 'zod';
import { Role } from '@prisma/client';

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

export const updateFieldVisibilityRightsSchema = z.object({
  canManageFieldVisibility: z.boolean(),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});
