import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

export type AuditAction =
  | 'USER_ROLE_CHANGED'
  | 'USER_FIELD_VISIBILITY_RIGHTS_CHANGED'
  | 'USER_STATUS_CHANGED'
  | 'FIELD_OPTION_CREATED'
  | 'FIELD_OPTION_DELETED'
  | 'DEPENDENT_FIELD_DEFINITION_CREATED'
  | 'DEPENDENT_FIELD_DEFINITION_DELETED'
  | 'FIELD_VISIBILITY_RULE_UPSERTED'
  | 'FIELD_VISIBILITY_RULE_DELETED';

export interface RecordAuditLogInput {
  actorId: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}

export async function recordAuditLog({ actorId, action, targetType, targetId, metadata }: RecordAuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      targetType,
      targetId,
      ...(metadata ? { metadata: metadata as Prisma.InputJsonValue } : {}),
    },
  });
}
