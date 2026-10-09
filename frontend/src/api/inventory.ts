import { apiRequest } from './client';
import type { Paginated, ResaleInventory } from '../types';

export interface InventoryListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  customerType?: string;
  search?: string;
  [key: string]: string | number | undefined;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function listInventory(params: InventoryListParams = {}): Promise<Paginated<ResaleInventory>> {
  return apiRequest(`/inventory${buildQuery(params)}`);
}

export function getInventory(id: string): Promise<ResaleInventory> {
  return apiRequest(`/inventory/${id}`);
}

export type InventoryInput = Omit<
  ResaleInventory,
  'id' | 'pricePerSqFt' | 'targetSaleDate' | 'status' | 'submittedById' | 'createdAt' | 'updatedAt'
>;

export function createInventory(input: InventoryInput): Promise<ResaleInventory> {
  return apiRequest('/inventory', { method: 'POST', body: input });
}

export function updateInventory(id: string, input: Partial<InventoryInput>): Promise<ResaleInventory> {
  return apiRequest(`/inventory/${id}`, { method: 'PATCH', body: input });
}

export function updateInventoryStatus(id: string, status: string): Promise<ResaleInventory> {
  return apiRequest(`/inventory/${id}/status`, { method: 'PATCH', body: { status } });
}

export function deleteInventory(id: string): Promise<void> {
  return apiRequest(`/inventory/${id}`, { method: 'DELETE' });
}
