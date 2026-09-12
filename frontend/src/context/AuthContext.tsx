import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getAccessToken, loadStoredAccessToken, setAccessToken } from '../api/client';
import { getCurrentUser } from '../api/auth';
import type { CurrentUser } from '../types';

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      return;
    }
    try {
      const current = await getCurrentUser();
      setUser(current);
    } catch {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    loadStoredAccessToken();
    refreshUser().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(
    async (token: string) => {
      setAccessToken(token);
      await refreshUser();
    },
    [refreshUser],
  );

  const signOut = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshUser }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
