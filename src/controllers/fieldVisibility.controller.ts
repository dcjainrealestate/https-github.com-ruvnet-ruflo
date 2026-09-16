import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFoundError, UnauthorizedError } from '../utils/errors';
import { upsertVisibilityRuleSchema } from '../utils/validators.visibility';
import { recordAuditLog } from '../services/auditLogService';

export const listVisibilityRules = asyncHandler(async (_req: Request, res: Response) => {
  const rules = await prisma.fieldVisibilityRule.findMany({ orderBy: [{ role: 'asc' }, { fieldKey: 'asc' }] });
  res.status(200).json(rules);
});

export const upsertVisibilityRule = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  const input = upsertVisibilityRuleSchema.parse(req.body);

  const rule = await prisma.fieldVisibilityRule.upsert({
    where: { fieldKey_role: { fieldKey: input.fieldKey, role: input.role } },
    update: { mode: input.mode, createdById: req.user.sub },
    create: { fieldKey: input.fieldKey, role: input.role, mode: input.mode, createdById: req.user.sub },
  });

  await recordAuditLog({
    actorId: req.user.sub,
    action: 'FIELD_VISIBILITY_RULE_UPSERTED',
    targetType: 'FieldVisibilityRule',
    targetId: rule.id,
    metadata: { fieldKey: input.fieldKey, role: input.role, mode: input.mode },
  });

  res.status(200).json(rule);
});

export const deleteVisibilityRule = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  const { id } = req.params;
  const rule = await prisma.fieldVisibilityRule.findUnique({ where: { id } });
  if (!rule) {
    throw new NotFoundError('Visibility rule not found');
  }
  await prisma.fieldVisibilityRule.delete({ where: { id } });

  await recordAuditLog({
    actorId: req.user.sub,
    action: 'FIELD_VISIBILITY_RULE_DELETED',
    targetType: 'FieldVisibilityRule',
    targetId: id,
    metadata: { fieldKey: rule.fieldKey, role: rule.role },
  });

  res.status(204).send();
});
