import { apiRequest } from './client';
import type { DependentFieldDefinition, OptionBackedFieldKey } from '../types';

export function listDependentFieldDefinitions(): Promise<DependentFieldDefinition[]> {
  return apiRequest('/dependent-fields');
}

export function createDependentFieldDefinition(
  parentFieldKey: OptionBackedFieldKey,
  childFieldKey: OptionBackedFieldKey,
): Promise<DependentFieldDefinition> {
  return apiRequest('/dependent-fields', { method: 'POST', body: { parentFieldKey, childFieldKey } });
}

export function deleteDependentFieldDefinition(id: string): Promise<void> {
  return apiRequest(`/dependent-fields/${id}`, { method: 'DELETE' });
}

export function addDependentFieldOption(
  definitionId: string,
  parentValue: string,
  childValue: string,
): Promise<{ id: string }> {
  return apiRequest(`/dependent-fields/${definitionId}/options`, {
    method: 'POST',
    body: { parentValue, childValue },
  });
}

export function removeDependentFieldOption(definitionId: string, optionId: string): Promise<void> {
  return apiRequest(`/dependent-fields/${definitionId}/options/${optionId}`, { method: 'DELETE' });
}

export function getChildValuesForParent(definitionId: string, parentValue: string): Promise<string[]> {
  return apiRequest(`/dependent-fields/${definitionId}/child-values?parentValue=${encodeURIComponent(parentValue)}`);
}
