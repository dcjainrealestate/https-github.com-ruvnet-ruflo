import { apiRequest } from './client';
import type { FieldOption, OptionBackedFieldKey } from '../types';

export function listFieldOptions(fieldKey: OptionBackedFieldKey): Promise<FieldOption[]> {
  return apiRequest(`/field-options/${fieldKey}`);
}

export function createFieldOption(fieldKey: OptionBackedFieldKey, value: string): Promise<FieldOption> {
  return apiRequest('/field-options', { method: 'POST', body: { fieldKey, value } });
}

export function deleteFieldOption(id: string): Promise<void> {
  return apiRequest(`/field-options/${id}`, { method: 'DELETE' });
}
