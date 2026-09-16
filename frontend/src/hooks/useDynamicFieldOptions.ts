import { useCallback, useEffect, useState } from 'react';
import { listFieldOptions } from '../api/fieldOptions';
import { getChildValuesForParent, listDependentFieldDefinitions } from '../api/dependentFields';
import { OPTION_BACKED_FIELD_KEYS, type OptionBackedFieldKey } from '../types';

interface DependentLink {
  definitionId: string;
  parentFieldKey: OptionBackedFieldKey;
}

// Loads the admin-managed value list for every option-backed inventory
// field, plus whatever parent/child dependent-field pairings have been
// configured, and exposes a single `optionsFor(fieldKey)` accessor that
// returns the cascaded (parent-filtered) list when one applies.
export function useDynamicFieldOptions() {
  const [baseOptions, setBaseOptions] = useState<Record<string, string[]>>({});
  const [dependentByChild, setDependentByChild] = useState<Record<string, DependentLink>>({});
  const [childOverrides, setChildOverrides] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [optionLists, definitions] = await Promise.all([
        Promise.all(OPTION_BACKED_FIELD_KEYS.map((key) => listFieldOptions(key))),
        listDependentFieldDefinitions(),
      ]);

      const optionsMap: Record<string, string[]> = {};
      OPTION_BACKED_FIELD_KEYS.forEach((key, index) => {
        optionsMap[key] = optionLists[index].map((o) => o.value);
      });
      setBaseOptions(optionsMap);

      const depMap: Record<string, DependentLink> = {};
      for (const def of definitions) {
        depMap[def.childFieldKey] = { definitionId: def.id, parentFieldKey: def.parentFieldKey as OptionBackedFieldKey };
      }
      setDependentByChild(depMap);
      setLoading(false);
    }
    load();
  }, []);

  const onParentValueChange = useCallback(
    async (changedFieldKey: string, newValue: string) => {
      const affectedChildren = Object.entries(dependentByChild).filter(
        ([, link]) => link.parentFieldKey === changedFieldKey,
      );
      for (const [childFieldKey, link] of affectedChildren) {
        if (!newValue) {
          setChildOverrides((prev) => ({ ...prev, [childFieldKey]: [] }));
          continue;
        }
        const values = await getChildValuesForParent(link.definitionId, newValue);
        setChildOverrides((prev) => ({ ...prev, [childFieldKey]: values }));
      }
    },
    [dependentByChild],
  );

  const optionsFor = useCallback(
    (fieldKey: string): string[] => {
      if (fieldKey in dependentByChild) {
        return childOverrides[fieldKey] ?? [];
      }
      return baseOptions[fieldKey] ?? [];
    },
    [baseOptions, childOverrides, dependentByChild],
  );

  const isDependentChild = useCallback((fieldKey: string) => fieldKey in dependentByChild, [dependentByChild]);

  // When editing an existing record, seed the cascaded child lists for
  // whatever parent values it already has so the child dropdown isn't empty.
  const primeFromRecord = useCallback(
    async (record: Record<string, unknown>) => {
      for (const [childFieldKey, link] of Object.entries(dependentByChild)) {
        const parentValue = record[link.parentFieldKey];
        if (typeof parentValue === 'string' && parentValue) {
          const values = await getChildValuesForParent(link.definitionId, parentValue);
          setChildOverrides((prev) => ({ ...prev, [childFieldKey]: values }));
        }
      }
    },
    [dependentByChild],
  );

  return { loading, optionsFor, onParentValueChange, isDependentChild, primeFromRecord };
}
