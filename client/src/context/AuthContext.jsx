/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../api/client.js';

const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check existing session on boot
  useEffect(() => {
    let mounted = true;
    async function loadCurrentUser() {
      try {
        const data = await apiFetch('/api/auth/me');
        if (mounted && data?.user) {
          setUser(data.user);
        }
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadCurrentUser();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email, password) => {
    const data = await apiFetch('/api/auth/login', {
      body: { email, password },
    });
    setUser(data.user);
    return data.user;
  };

  const register = async (email, password, displayName) => {
    const data = await apiFetch('/api/auth/register', {
      body: { email, password, displayName },
    });
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST', body: {} });
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
