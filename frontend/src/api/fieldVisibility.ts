import { apiRequest } from './client';
import type { FieldVisibilityMode, FieldVisibilityRule, Role } from '../types';

export function listVisibilityRules(): Promise<FieldVisibilityRule[]> {
  return apiRequest('/field-visibility-rules');
}

export function upsertVisibilityRule(
  fieldKey: string,
  role: Role,
  mode: FieldVisibilityMode,
): Promise<FieldVisibilityRule> {
  return apiRequest('/field-visibility-rules', { method: 'PUT', body: { fieldKey, role, mode } });
}

export function deleteVisibilityRule(id: string): Promise<void> {
  return apiRequest(`/field-visibility-rules/${id}`, { method: 'DELETE' });
}
