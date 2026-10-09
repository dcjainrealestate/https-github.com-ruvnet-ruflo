import { useEffect, useState, type FormEvent } from 'react';
import { deleteVisibilityRule, listVisibilityRules, upsertVisibilityRule } from '../../api/fieldVisibility';
import { ApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { INVENTORY_FIELD_KEYS, type FieldVisibilityMode, type FieldVisibilityRule, type Role } from '../../types';

const ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'SALES_MEMBER', 'CONTRIBUTOR'];
const MODES: FieldVisibilityMode[] = ['VISIBLE', 'MASKED', 'HIDDEN'];

export function FieldVisibilityAdminPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'SUPER_ADMIN' || user?.canManageFieldVisibility;

  const [rules, setRules] = useState<FieldVisibilityRule[]>([]);
  const [fieldKey, setFieldKey] = useState<string>(INVENTORY_FIELD_KEYS[0]);
  const [role, setRole] = useState<Role>('SALES_MEMBER');
  const [mode, setMode] = useState<FieldVisibilityMode>('MASKED');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setRules(await listVisibilityRules());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load visibility rules.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await upsertVisibilityRule(fieldKey, role, mode);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save rule. You may not have this right yet.');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteVisibilityRule(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete rule.');
    }
  }

  return (
    <div className="container">
      <h1>Field Masking / Hiding Rules</h1>
      <p className="muted">
        Super Admin can mask or hide any field per role (e.g. hide Mobile No. from Sales Members), and can delegate
        this right to specific Admins from the Users page. The record owner and Super Admin always see full data.
      </p>
      {!canManage && (
        <div className="alert alert-warning">
          You can view existing rules, but you don't currently have the right to create or change them.
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {canManage && (
        <form className="inline-form" onSubmit={handleSubmit}>
          <select value={fieldKey} onChange={(e) => setFieldKey(e.target.value)}>
            {INVENTORY_FIELD_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select value={mode} onChange={(e) => setMode(e.target.value as FieldVisibilityMode)}>
            {MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button type="submit">Save Rule</button>
        </form>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Field</th>
                <th>Role</th>
                <th>Mode</th>
                {canManage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td>{r.fieldKey}</td>
                  <td>{r.role}</td>
                  <td>
                    <span className={`badge badge-${r.mode.toLowerCase()}`}>{r.mode}</span>
                  </td>
                  {canManage && (
                    <td>
                      <button type="button" className="btn-link danger" onClick={() => handleDelete(r.id)}>
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {rules.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 4 : 3} className="muted">
                    No rules configured - all fields are fully visible by default.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
