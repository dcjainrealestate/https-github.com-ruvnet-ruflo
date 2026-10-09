import { FieldVisibilityMode, Role } from '@prisma/client';

export interface VisibilityRule {
  fieldKey: string;
  role: Role;
  mode: FieldVisibilityMode;
}

// Generic redaction: keeps a small amount of context at each end so a
// reviewer can still recognize "which" record this is without exposing the
// full value (e.g. a phone number, email address, or name).
export function maskValue(value: unknown): string {
  if (value === null || value === undefined) {
    return value as never;
  }
  const str = String(value);
  if (str.length <= 4) {
    return '*'.repeat(str.length);
  }
  const visible = 2;
  const start = str.slice(0, visible);
  const end = str.slice(-visible);
  const middleMaskLength = Math.max(str.length - visible * 2, 3);
  return `${start}${'*'.repeat(middleMaskLength)}${end}`;
}

// Applies masking/hiding rules for a given viewing role to a plain-object
// inventory record. The submitter and SUPER_ADMIN always see the record
// unmasked; every other role goes through the configured rules.
export function applyFieldVisibility<T extends Record<string, unknown>>(
  record: T,
  viewerRole: Role,
  rules: VisibilityRule[],
  options: { isOwner?: boolean } = {},
): Partial<T> {
  if (viewerRole === 'SUPER_ADMIN' || options.isOwner) {
    return { ...record };
  }

  const rulesForRole = new Map(rules.filter((r) => r.role === viewerRole).map((r) => [r.fieldKey, r.mode]));

  const result: Partial<T> = { ...record };
  for (const [fieldKey, mode] of rulesForRole.entries()) {
    if (!(fieldKey in result)) {
      continue;
    }
    if (mode === 'HIDDEN') {
      delete result[fieldKey as keyof T];
    } else if (mode === 'MASKED') {
      (result as Record<string, unknown>)[fieldKey] = maskValue(result[fieldKey as keyof T]);
    }
  }
  return result;
}
