import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User } from '../services/authService';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('fossflow-token'));
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const t = localStorage.getItem('fossflow-token');
    if (!t) { setUser(null); setLoading(false); return; }
    try {
      const u = await authService.me();
      setUser(u);
    } catch {
      localStorage.removeItem('fossflow-token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshUser(); }, []);

  const login = async (username: string, password: string) => {
    const { token: t, user: u } = await authService.login(username, password);
    localStorage.setItem('fossflow-token', t);
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('fossflow-token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, logout,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
