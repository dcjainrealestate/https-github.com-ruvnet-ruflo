import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getStoredTheme, setTheme, type ThemeChoice } from '../utils/theme';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

const THEME_OPTIONS: { value: ThemeChoice; label: string; title: string }[] = [
  { value: 'light', label: '☀️', title: 'Light mode' },
  { value: 'dark', label: '🌙', title: 'Dark mode' },
  { value: 'system', label: '🖥️', title: 'Match system' },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>(getStoredTheme());

  function handleSignOut() {
    signOut();
    navigate('/login');
  }

  function handleThemeChange(choice: ThemeChoice) {
    setTheme(choice);
    setThemeChoice(choice);
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
          <div className="theme-toggle">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                title={option.title}
                aria-label={option.title}
                className={themeChoice === option.value ? 'active' : ''}
                onClick={() => handleThemeChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
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
