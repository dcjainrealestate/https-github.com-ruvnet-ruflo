import { useEffect, useState, type FormEvent } from 'react';
import { createFieldOption, deleteFieldOption, listFieldOptions } from '../../api/fieldOptions';
import { ApiError } from '../../api/client';
import { OPTION_BACKED_FIELD_KEYS, type FieldOption, type OptionBackedFieldKey } from '../../types';

const FIELD_LABELS: Record<OptionBackedFieldKey, string> = {
  propertyCategory: 'Property Category',
  propertySubCategory: 'Property Sub Category',
  developerName: 'Developer Name',
  projectName: 'Project Name',
  sector: 'Sector',
  microMarket: 'Micro Market',
  accommodation: 'Accommodation',
  facing: 'Facing',
  furnishingStatus: 'Furnishing Status',
};

export function FieldOptionsAdminPage() {
  const [fieldKey, setFieldKey] = useState<OptionBackedFieldKey>('propertyCategory');
  const [options, setOptions] = useState<FieldOption[]>([]);
  const [newValue, setNewValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setOptions(await listFieldOptions(fieldKey));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load options.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldKey]);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createFieldOption(fieldKey, newValue.trim());
      setNewValue('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add value.');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteFieldOption(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove value.');
    }
  }

  return (
    <div className="container">
      <h1>Field Options</h1>
      <p className="muted">Super Admin and Admin can add or delete values for any of these fields.</p>

      <div className="field-key-picker">
        {OPTION_BACKED_FIELD_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={key === fieldKey ? 'chip chip-active' : 'chip'}
            onClick={() => setFieldKey(key)}
          >
            {FIELD_LABELS[key]}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="inline-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder={`Add a new ${FIELD_LABELS[fieldKey]} value`}
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          required
        />
        <button type="submit">Add</button>
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <ul className="value-list">
          {options.map((o) => (
            <li key={o.id}>
              <span>{o.value}</span>
              <button type="button" className="btn-link danger" onClick={() => handleDelete(o.id)}>
                Remove
              </button>
            </li>
          ))}
          {options.length === 0 && <li className="muted">No values yet.</li>}
        </ul>
      )}
    </div>
  );
}
