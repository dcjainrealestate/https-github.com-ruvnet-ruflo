import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFoundError, UnauthorizedError } from '../utils/errors';
import { createFieldOptionSchema, fieldKeySchema } from '../utils/validators.fields';
import { recordAuditLog } from '../services/auditLogService';

export const listFieldOptions = asyncHandler(async (req: Request, res: Response) => {
  const fieldKey = fieldKeySchema.parse(req.params.fieldKey);
  const options = await prisma.fieldOption.findMany({
    where: { fieldKey, isActive: true },
    orderBy: { value: 'asc' },
    select: { id: true, fieldKey: true, value: true, createdAt: true },
  });
  res.status(200).json(options);
});

export const createFieldOption = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  const input = createFieldOptionSchema.parse(req.body);

  const option = await prisma.fieldOption.upsert({
    where: { fieldKey_value: { fieldKey: input.fieldKey, value: input.value } },
    update: { isActive: true },
    create: { fieldKey: input.fieldKey, value: input.value, createdById: req.user.sub },
  });

  await recordAuditLog({
    actorId: req.user.sub,
    action: 'FIELD_OPTION_CREATED',
    targetType: 'FieldOption',
    targetId: option.id,
    metadata: { fieldKey: input.fieldKey, value: input.value },
  });

  res.status(201).json(option);
});

// Soft-delete: keeps history/audit trail and avoids breaking existing
// inventory rows that already reference this value.
export const deleteFieldOption = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  const { id } = req.params;
  const option = await prisma.fieldOption.findUnique({ where: { id } });
  if (!option) {
    throw new NotFoundError('Field option not found');
  }
  await prisma.fieldOption.update({ where: { id }, data: { isActive: false } });

  await recordAuditLog({
    actorId: req.user.sub,
    action: 'FIELD_OPTION_DELETED',
    targetType: 'FieldOption',
    targetId: id,
    metadata: { fieldKey: option.fieldKey, value: option.value },
  });

  res.status(204).send();
});
