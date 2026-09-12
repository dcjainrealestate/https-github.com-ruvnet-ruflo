import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteInventory, listInventory, updateInventoryStatus } from '../api/inventory';
import { ApiError } from '../api/client';
import type { InventoryStatus, ResaleInventory } from '../types';

const STATUS_OPTIONS: InventoryStatus[] = ['ACTIVE', 'SOLD', 'EXPIRED', 'WITHDRAWN'];

function formatCurrency(value?: number | null): string {
  if (value === undefined || value === null) return '—';
  return `₹${value.toLocaleString('en-IN')}`;
}

export function DashboardPage() {
  const [records, setRecords] = useState<Partial<ResaleInventory>[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await listInventory({ page, pageSize: 10, status: status || undefined, search: search || undefined });
      setRecords(result.data);
      setTotalPages(result.pagination.totalPages || 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load inventory.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    load();
  }

  async function handleStatusChange(id: string, newStatus: string) {
    try {
      await updateInventoryStatus(id, newStatus);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update status.');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return;
    try {
      await deleteInventory(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete listing.');
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>Resale Inventory</h1>
        <Link to="/inventory/new" className="btn-primary">
          + New Listing
        </Link>
      </div>

      <form className="filters" onSubmit={handleSearchSubmit}>
        <input
          type="text"
          placeholder="Search customer, project, flat/tower no."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="submit">Search</button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p>Loading…</p>
      ) : records.length === 0 ? (
        <p className="muted">No inventory found.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Project / Sector</th>
                <th>Customer</th>
                <th>Accommodation</th>
                <th>Area</th>
                <th>Price / Rent</th>
                <th>₹/sq.ft.</th>
                <th>Status</th>
                <th>Target Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div>{r.projectName ?? '—'}</div>
                    <div className="muted small">{r.sector}</div>
                  </td>
                  <td>
                    <div>{r.customerName ?? '—'}</div>
                    <div className="muted small">{r.mobileNo ?? 'hidden'}</div>
                  </td>
                  <td>{r.accommodation}</td>
                  <td>{r.area ? `${r.area} sq.ft.` : '—'}</td>
                  <td>{r.customerType === 'SELLER' ? formatCurrency(r.askingPrice) : formatCurrency(r.expectedRent)}</td>
                  <td>{formatCurrency(r.pricePerSqFt)}</td>
                  <td>
                    <select value={r.status} onChange={(e) => r.id && handleStatusChange(r.id, e.target.value)}>
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{r.targetSaleDate ? new Date(r.targetSaleDate).toLocaleDateString() : '—'}</td>
                  <td className="row-actions">
                    <Link to={`/inventory/${r.id}/edit`}>Edit</Link>
                    <button type="button" className="btn-link danger" onClick={() => r.id && handleDelete(r.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
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
