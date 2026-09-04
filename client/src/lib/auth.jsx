import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await api.me();
      if (res?.success) {
        setUser(res.user);
        setProfile(res.profile);
        return true;
      }
    } catch (e) {
      // not authenticated
    }
    setUser(null);
    setProfile(null);
    return false;
  };

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, []);

  const login = async (email, password) => {
    await api.login({ email, password });
    await refresh();
  };
  const register = async (email, password, displayName) => {
    await api.register({ email, password, displayName });
    await refresh();
    return true;
  };
  const demo = async () => {
    await api.demo();
    await refresh();
    return true;
  };
  const logout = async () => {
    try { await api.logout(); } catch (e) {}
    setUser(null);
    setProfile(null);
  };
  const updateProfile = (p) => setProfile(p);

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, demo, logout, refresh, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
