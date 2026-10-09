import { apiRequest } from './client';
import type { AuditLogEntry, Paginated } from '../types';

export function listAuditLogs(page = 1, pageSize = 20): Promise<Paginated<AuditLogEntry>> {
  return apiRequest(`/audit-logs?page=${page}&pageSize=${pageSize}`);
}
