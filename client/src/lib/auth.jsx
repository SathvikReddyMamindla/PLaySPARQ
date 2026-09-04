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
    return false;
  };

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, []);

  // Apply auth from a register/login response as a safety net so the user is
  // never left null right after a successful signup (which would drop them on
  // the "Sign in to continue" gate).
  const applyAuth = (user, profile) => { setUser(user); setProfile(profile); };
  const fromAuthRes = (u) => ({
    id: u?.id, email: u?.email, display_name: u?.display_name, profile_id: u?.profile_id,
  });

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    const ok = await refresh();
    if (!ok && res?.success) applyAuth(fromAuthRes(res.user), null);
    return ok || !!res?.success;
  };
  const register = async (email, password, displayName) => {
    const res = await api.register({ email, password, displayName });
    const ok = await refresh();
    if (!ok && res?.success) applyAuth(fromAuthRes(res.user), null);
    return ok || !!res?.success;
  };
  const demo = async () => {
    const res = await api.demo();
    const ok = await refresh();
    if (!ok && res?.success) applyAuth(fromAuthRes(res.user), null);
    return ok || !!res?.success;
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
