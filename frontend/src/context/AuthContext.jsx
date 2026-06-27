import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/endpoints.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tanvicrm_user') || 'null');
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // On mount, if a token exists, revalidate it against /me.
  useEffect(() => {
    const token = localStorage.getItem('tanvicrm_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(({ user: u }) => {
        setUser(u);
        localStorage.setItem('tanvicrm_user', JSON.stringify(u));
      })
      .catch(() => {
        localStorage.removeItem('tanvicrm_token');
        localStorage.removeItem('tanvicrm_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user: u } = await authApi.login({ email, password });
    localStorage.setItem('tanvicrm_token', token);
    localStorage.setItem('tanvicrm_user', JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('tanvicrm_token');
    localStorage.removeItem('tanvicrm_user');
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
