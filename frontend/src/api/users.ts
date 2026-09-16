import { apiRequest } from './client';
import type { Role, UserSummary } from '../types';

export function listUsers(): Promise<UserSummary[]> {
  return apiRequest('/users');
}

export function updateUserRole(id: string, role: Role): Promise<UserSummary> {
  return apiRequest(`/users/${id}/role`, { method: 'PATCH', body: { role } });
}

export function updateFieldVisibilityRights(id: string, canManageFieldVisibility: boolean): Promise<UserSummary> {
  return apiRequest(`/users/${id}/field-visibility-rights`, {
    method: 'PATCH',
    body: { canManageFieldVisibility },
  });
}

export function updateUserStatus(id: string, isActive: boolean): Promise<UserSummary> {
  return apiRequest(`/users/${id}/status`, { method: 'PATCH', body: { isActive } });
}
