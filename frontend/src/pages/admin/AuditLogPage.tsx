import { useEffect, useState } from 'react';
import { listAuditLogs } from '../../api/auditLog';
import { ApiError } from '../../api/client';
import type { AuditLogEntry } from '../../types';

export function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listAuditLogs(page, 20)
      .then((result) => {
        setEntries(result.data);
        setTotalPages(result.pagination.totalPages || 1);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load audit log.'))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="container">
      <h1>Audit Log</h1>
      <p className="muted">Every role change, masking rule change, and field/dependent-field change is recorded here.</p>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.createdAt).toLocaleString()}</td>
                  <td>
                    {e.actor.name} <span className="muted small">({e.actor.role})</span>
                  </td>
                  <td>{e.action}</td>
                  <td>
                    {e.targetType} <span className="muted small">{e.targetId}</span>
                  </td>
                  <td>
                    <code className="small">{e.metadata ? JSON.stringify(e.metadata) : '—'}</code>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No audit entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
