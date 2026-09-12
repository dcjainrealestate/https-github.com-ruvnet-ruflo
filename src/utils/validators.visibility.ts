import { z } from 'zod';
import { Role, FieldVisibilityMode } from '@prisma/client';
import { INVENTORY_FIELD_KEYS } from '../constants/fieldKeys';

export const upsertVisibilityRuleSchema = z.object({
  fieldKey: z.enum(INVENTORY_FIELD_KEYS),
  role: z.nativeEnum(Role),
  mode: z.nativeEnum(FieldVisibilityMode),
});
