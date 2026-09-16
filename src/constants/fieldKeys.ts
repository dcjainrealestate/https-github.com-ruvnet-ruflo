// Canonical keys for every inventory field whose allowed values are managed
// as admin-editable FieldOption rows rather than hardcoded enums, per the
// requirement that SUPER_ADMIN/ADMIN can add or delete values for any field.
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

export function isOptionBackedFieldKey(value: string): value is OptionBackedFieldKey {
  return (OPTION_BACKED_FIELD_KEYS as readonly string[]).includes(value);
}

// Every field that can appear on a ResaleInventory record - used to validate
// FieldVisibilityRule targets (masking/hiding applies more broadly than just
// the option-backed fields, e.g. mobileNo, emailId, customerName).
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

export type InventoryFieldKey = (typeof INVENTORY_FIELD_KEYS)[number];

export function isInventoryFieldKey(value: string): value is InventoryFieldKey {
  return (INVENTORY_FIELD_KEYS as readonly string[]).includes(value);
}
