import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, tokenStore, refreshAccessToken } from './api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setPermissions(data.permissions || []);
    } catch {
      tokenStore.set(null);
      setUser(null);
      setPermissions([]);
    }
  }, []);

  useEffect(() => {
    // The access token lives only in memory, so a fresh page load has none —
    // silently redeem the httpOnly refresh cookie for a new one before
    // deciding whether anyone's logged in. No cookie (or an expired/used-up
    // one) just means "logged out", which is the normal signed-out state.
    (async () => {
      try {
        await refreshAccessToken();
        await loadMe();
      } catch {
        tokenStore.set(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadMe]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    tokenStore.set(data.accessToken);
    setUser(data.user);
    await loadMe();
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    tokenStore.set(data.accessToken);
    setUser(data.user);
    await loadMe();
    return data.user;
  };

  const logout = () => {
    // Revoke the refresh token server-side too, not just locally — otherwise
    // the cookie is still a live credential until it expires on its own.
    api.post('/auth/logout').catch(() => {});
    tokenStore.set(null);
    setUser(null);
    setPermissions([]);
  };

  return (
    <AuthCtx.Provider
      value={{
        user,
        role: user?.role,
        permissions,
        can: (code) => permissions.includes(code),
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
