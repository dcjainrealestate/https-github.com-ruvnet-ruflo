import { useEffect, useState } from 'react';
import { listUsers, updateFieldVisibilityRights, updateUserRole, updateUserStatus } from '../../api/users';
import { ApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { Role, UserSummary } from '../../types';

const ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'SALES_MEMBER', 'CONTRIBUTOR'];

export function UsersAdminPage() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setUsers(await listUsers());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRoleChange(id: string, role: Role) {
    try {
      await updateUserRole(id, role);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update role.');
    }
  }

  async function handleVisibilityRightsToggle(id: string, canManage: boolean) {
    try {
      await updateFieldVisibilityRights(id, canManage);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update field visibility rights.');
    }
  }

  async function handleStatusToggle(id: string, isActive: boolean) {
    try {
      await updateUserStatus(id, isActive);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update status.');
    }
  }

  return (
    <div className="container">
      <h1>Users</h1>
      <p className="muted">
        Super Admin manages roles and can delegate the right to manage field masking/hiding rules to Admin users.
      </p>
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>2FA</th>
                <th>Masking/Hiding Rights</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    {isSuperAdmin ? (
                      <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}>
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    ) : (
                      u.role
                    )}
                  </td>
                  <td>{u.twoFactorEnabled ? '✅ enabled' : `⏳ due ${new Date(u.twoFactorSetupDeadline).toLocaleDateString()}`}</td>
                  <td>
                    {isSuperAdmin ? (
                      <input
                        type="checkbox"
                        checked={u.canManageFieldVisibility}
                        disabled={u.role !== 'ADMIN'}
                        onChange={(e) => handleVisibilityRightsToggle(u.id, e.target.checked)}
                      />
                    ) : u.canManageFieldVisibility ? (
                      'Yes'
                    ) : (
                      'No'
                    )}
                  </td>
                  <td>
                    {isSuperAdmin ? (
                      <button type="button" className="btn-link" onClick={() => handleStatusToggle(u.id, !u.isActive)}>
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    ) : u.isActive ? (
                      'Active'
                    ) : (
                      'Inactive'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
