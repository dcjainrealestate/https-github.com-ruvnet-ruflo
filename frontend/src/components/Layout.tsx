import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

export function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  function handleSignOut() {
    signOut();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/inventory" className="brand">
            Ruflo Resale Inventory
          </Link>
          {user && (
            <nav className="nav-links">
              <Link to="/inventory">Inventory</Link>
              {ADMIN_ROLES.includes(user.role) && (
                <>
                  <Link to="/admin/users">Users</Link>
                  <Link to="/admin/field-options">Field Options</Link>
                  <Link to="/admin/dependent-fields">Dependent Fields</Link>
                  <Link to="/admin/field-visibility">Masking Rules</Link>
                  <Link to="/admin/audit-log">Audit Log</Link>
                </>
              )}
            </nav>
          )}
          {user && (
            <div className="user-menu">
              <span className="user-name">
                {user.name} <span className="role-badge">{user.role}</span>
              </span>
              <button type="button" className="btn-link" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
