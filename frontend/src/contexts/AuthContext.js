import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [pendingVerification, setPendingVerification] = useState(null);

  const fetchUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await authAPI.getMe();
      // Check if email verification is needed
      if (res.data.email_verified === false) {
        try {
          const vsRes = await authAPI.verificationStatus();
          if (vsRes.data.email_verification_enabled) {
            setPendingVerification({ email: res.data.email });
            setUser(null);
            setLoading(false);
            return;
          }
        } catch {}
      }
      setUser(res.data);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);

    // Check if email verification is needed
    if (userData.email_verified === false) {
      try {
        const vsRes = await authAPI.verificationStatus();
        if (vsRes.data.email_verification_enabled) {
          setPendingVerification({ email: userData.email });
          // Don't set user — keep on login/register page
          return { ...userData, email_verification_required: true };
        }
      } catch {}
    }

    setUser(userData);
    return userData;
  };

  const register = async (name, email, password, referral_code) => {
    const payload = { name, email, password };
    if (referral_code) payload.referral_code = referral_code;
    const res = await authAPI.register(payload);
    const { token: newToken, user: userData, email_verification_required } = res.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);

    if (email_verification_required) {
      setPendingVerification({ email: userData.email });
      // Don't set user — keep on register page to show verify form
      return { ...userData, email_verification_required: true };
    }

    setUser(userData);
    return userData;
  };

  const completeVerification = async () => {
    setPendingVerification(null);
    // Reload user data now that email is verified
    try {
      const res = await authAPI.getMe();
      setUser(res.data);
    } catch {}
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setPendingVerification(null);
  };

  const refreshUser = async () => {
    try {
      const res = await authAPI.getMe();
      setUser(res.data);
    } catch {
      // ignore
    }
  };

  // For OAuth providers (e.g. Google) — accept a pre-issued token + user
  const loginWithToken = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser, loginWithToken, pendingVerification, completeVerification }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
