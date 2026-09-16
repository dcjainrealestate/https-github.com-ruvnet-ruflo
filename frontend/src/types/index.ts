export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'SALES_MEMBER' | 'CONTRIBUTOR';

export type CustomerType = 'SELLER' | 'LESSOR';

export type InventoryStatus = 'ACTIVE' | 'SOLD' | 'EXPIRED' | 'WITHDRAWN';

export type FieldVisibilityMode = 'VISIBLE' | 'MASKED' | 'HIDDEN';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  twoFactorEnabled: boolean;
  twoFactorSetupDeadline: string;
  canManageFieldVisibility: boolean;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  twoFactorEnabled: boolean;
  twoFactorSetupDeadline: string;
  canManageFieldVisibility: boolean;
  createdAt: string;
}

export interface FieldOption {
  id: string;
  fieldKey: string;
  value: string;
  createdAt: string;
}

export interface DependentFieldDefinition {
  id: string;
  parentFieldKey: string;
  childFieldKey: string;
  createdAt: string;
}

export interface FieldVisibilityRule {
  id: string;
  fieldKey: string;
  role: Role;
  mode: FieldVisibilityMode;
  createdAt: string;
  updatedAt: string;
}

export interface ResaleInventory {
  id: string;
  propertyCategory: string;
  propertySubCategory: string;
  developerName: string;
  projectName: string;
  sector: string;
  microMarket: string;

  customerType: CustomerType;
  customerName: string;
  mobileNo: string;
  alternateMobileNo?: string | null;
  emailId?: string | null;
  alternateEmailId?: string | null;

  towerNameNo: string;
  flatNo: string;
  floor: string;
  accommodation: string;
  area: number;
  facing: string;
  furnishingStatus: string;

  askingPrice?: number | null;
  expectedRent?: number | null;
  pricePerSqFt?: number | null;

  propertyAgeYears: number;
  holdingDurationYears: number;

  targetSaleTimeframeDays: number;
  targetSaleDate: string;
  status: InventoryStatus;

  submittedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; name: string; email: string; role: Role };
}

export const OPTION_BACKED_FIELD_KEYS = [
  'propertyCategory',
  'propertySubCategory',
  'developerName',
  'projectName',
  'sector',
  'microMarket',
  'accommodation',
  'facing',
  'furnishingStatus',
] as const;

export type OptionBackedFieldKey = (typeof OPTION_BACKED_FIELD_KEYS)[number];

export const INVENTORY_FIELD_KEYS = [
  ...OPTION_BACKED_FIELD_KEYS,
  'customerType',
  'customerName',
  'mobileNo',
  'alternateMobileNo',
  'emailId',
  'alternateEmailId',
  'towerNameNo',
  'flatNo',
  'floor',
  'area',
  'askingPrice',
  'expectedRent',
  'pricePerSqFt',
  'propertyAgeYears',
  'holdingDurationYears',
  'targetSaleTimeframeDays',
  'targetSaleDate',
] as const;
