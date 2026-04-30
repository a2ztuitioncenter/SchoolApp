import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authStorage } from '../utils/storage';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hydrate = async () => {
      const saved = await authStorage.get();
      if (saved?.isLoggedIn) {
        setAuth(saved);
      }
      setReady(true);
    };
    hydrate();
  }, []);

  const login = async (payload) => {
    const result = await authService.login(payload);
    if (!result.success) return result;

    const session = { ...result.data, timestamp: Date.now() };
    await authStorage.set(session);
    setAuth(session);
    return { success: true };
  };

  const logout = async () => {
    await authService.logout();
    await authStorage.clear();
    setAuth(null);
  };

  const value = useMemo(
    () => ({
      auth,
      ready,
      isLoggedIn: Boolean(auth?.isLoggedIn),
      login,
      logout
    }),
    [auth, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
