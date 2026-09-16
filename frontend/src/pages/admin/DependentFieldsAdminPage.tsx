import { useEffect, useState, type FormEvent } from 'react';
import {
  addDependentFieldOption,
  createDependentFieldDefinition,
  deleteDependentFieldDefinition,
  getChildValuesForParent,
  listDependentFieldDefinitions,
} from '../../api/dependentFields';
import { listFieldOptions } from '../../api/fieldOptions';
import { ApiError } from '../../api/client';
import { OPTION_BACKED_FIELD_KEYS, type DependentFieldDefinition, type OptionBackedFieldKey } from '../../types';

export function DependentFieldsAdminPage() {
  const [definitions, setDefinitions] = useState<DependentFieldDefinition[]>([]);
  const [parentFieldKey, setParentFieldKey] = useState<OptionBackedFieldKey>('developerName');
  const [childFieldKey, setChildFieldKey] = useState<OptionBackedFieldKey>('projectName');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setDefinitions(await listDependentFieldDefinitions());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load dependent fields.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createDependentFieldDefinition(parentFieldKey, childFieldKey);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create dependent field.');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDependentFieldDefinition(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete dependent field.');
    }
  }

  return (
    <div className="container">
      <h1>Dependent Fields</h1>
      <p className="muted">
        Only Super Admin and Admin can create a parent/child field pairing (e.g. Developer Name → Project Name) and
        populate which child values are valid for each parent value.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="inline-form" onSubmit={handleCreate}>
        <select value={parentFieldKey} onChange={(e) => setParentFieldKey(e.target.value as OptionBackedFieldKey)}>
          {OPTION_BACKED_FIELD_KEYS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <span>→</span>
        <select value={childFieldKey} onChange={(e) => setChildFieldKey(e.target.value as OptionBackedFieldKey)}>
          {OPTION_BACKED_FIELD_KEYS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <button type="submit" disabled={parentFieldKey === childFieldKey}>
          Create pairing
        </button>
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="dependent-definitions">
          {definitions.length === 0 && <p className="muted">No dependent field pairings configured yet.</p>}
          {definitions.map((def) => (
            <DependentDefinitionCard key={def.id} definition={def} onDelete={() => handleDelete(def.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function DependentDefinitionCard({
  definition,
  onDelete,
}: {
  definition: DependentFieldDefinition;
  onDelete: () => void;
}) {
  const [parentValues, setParentValues] = useState<string[]>([]);
  const [selectedParentValue, setSelectedParentValue] = useState('');
  const [childValues, setChildValues] = useState<string[]>([]);
  const [newChildValue, setNewChildValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listFieldOptions(definition.parentFieldKey as OptionBackedFieldKey).then((opts) =>
      setParentValues(opts.map((o) => o.value)),
    );
  }, [definition.parentFieldKey]);

  useEffect(() => {
    if (!selectedParentValue) {
      setChildValues([]);
      return;
    }
    getChildValuesForParent(definition.id, selectedParentValue).then(setChildValues);
  }, [definition.id, selectedParentValue]);

  async function handleAddChildValue(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await addDependentFieldOption(definition.id, selectedParentValue, newChildValue.trim());
      setNewChildValue('');
      const values = await getChildValuesForParent(definition.id, selectedParentValue);
      setChildValues(values);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add value.');
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <strong>
          {definition.parentFieldKey} → {definition.childFieldKey}
        </strong>
        <button type="button" className="btn-link danger" onClick={onDelete}>
          Delete pairing
        </button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <label>
        When {definition.parentFieldKey} is…
        <select value={selectedParentValue} onChange={(e) => setSelectedParentValue(e.target.value)}>
          <option value="">Select a value…</option>
          {parentValues.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>

      {selectedParentValue && (
        <>
          <p className="muted small">Allowed {definition.childFieldKey} values:</p>
          <ul className="value-list">
            {childValues.map((v) => (
              <li key={v}>{v}</li>
            ))}
            {childValues.length === 0 && <li className="muted">None yet.</li>}
          </ul>
          <form className="inline-form" onSubmit={handleAddChildValue}>
            <input
              type="text"
              placeholder={`Add allowed ${definition.childFieldKey} value`}
              value={newChildValue}
              onChange={(e) => setNewChildValue(e.target.value)}
              required
            />
            <button type="submit">Add</button>
          </form>
        </>
      )}
    </div>
  );
}
