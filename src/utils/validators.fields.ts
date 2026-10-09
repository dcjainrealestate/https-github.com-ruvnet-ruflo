import { z } from 'zod';
import { OPTION_BACKED_FIELD_KEYS } from '../constants/fieldKeys';

export const fieldKeySchema = z.enum(OPTION_BACKED_FIELD_KEYS);

export const createFieldOptionSchema = z.object({
  fieldKey: fieldKeySchema,
  value: z.string().min(1).max(200),
});

export const createDependentFieldDefinitionSchema = z.object({
  parentFieldKey: fieldKeySchema,
  childFieldKey: fieldKeySchema,
}).refine((data) => data.parentFieldKey !== data.childFieldKey, {
  message: 'parentFieldKey and childFieldKey must differ',
});

export const createDependentFieldOptionSchema = z.object({
  parentValue: z.string().min(1).max(200),
  childValue: z.string().min(1).max(200),
});
