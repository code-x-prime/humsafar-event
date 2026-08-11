"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { postJson, setAccessToken, restoreAccessToken, mergeGuestCart } from "@/lib/api";

interface CustomerUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
}

const USER_STORAGE_KEY = "humsafar_customer_user";

interface AuthContextValue {
  user: CustomerUser | null;
  isAuthenticated: boolean;
  register: (name: string, email: string, password: string, phone?: string) => Promise<{ expiresIn: number }>;
  resendRegistrationOtp: (email: string) => Promise<{ expiresIn: number }>;
  verifyRegistration: (email: string, code: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<{ expiresIn: number }>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function persistSession(data: { user: CustomerUser; accessToken: string }) {
  setAccessToken(data.accessToken);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);

  // Restore the session on page load — the token lives in localStorage
  // (lib/api.ts), the user profile alongside it so a refresh doesn't log
  // the customer out or lose their name/email from the header.
  useEffect(() => {
    const token = restoreAccessToken();
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // corrupt storage — treat as logged out
      }
    }
  }, []);

  const register = useCallback((name: string, email: string, password: string, phone?: string) => {
    return postJson<{ expiresIn: number }>("/auth/register", { name, email, password, phone });
  }, []);

  const resendRegistrationOtp = useCallback((email: string) => {
    return postJson<{ expiresIn: number }>("/auth/register/resend", { email });
  }, []);

  // Confirms the signup code and logs the customer in immediately — the
  // server returns a real session on successful verification, exactly like
  // a login response, so this works identically whether verification happens
  // right after signup or days later on a return visit.
  const verifyRegistration = useCallback(async (email: string, code: string) => {
    const data = await postJson<{ user: CustomerUser; accessToken: string }>("/auth/register/verify", { email, code });
    persistSession(data);
    setUser(data.user);
    mergeGuestCart().catch(() => {});
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await postJson<{ user: CustomerUser; accessToken: string }>("/auth/login", { email, password });
    persistSession(data);
    setUser(data.user);

    // Fold whatever was in the guest cart into this account's cart now that
    // we have a real session — best-effort, a failure here shouldn't block login.
    mergeGuestCart().catch(() => {});
  }, []);

  const forgotPassword = useCallback((email: string) => {
    return postJson<{ expiresIn: number }>("/auth/forgot-password", { email });
  }, []);

  const resetPassword = useCallback(async (email: string, code: string, newPassword: string) => {
    const data = await postJson<{ user: CustomerUser; accessToken: string }>("/auth/reset-password", { email, code, newPassword });
    persistSession(data);
    setUser(data.user);
    mergeGuestCart().catch(() => {});
  }, []);

  const logout = useCallback(() => {
    setAccessToken(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      register,
      resendRegistrationOtp,
      verifyRegistration,
      login,
      forgotPassword,
      resetPassword,
      logout,
    }),
    [user, register, resendRegistrationOtp, verifyRegistration, login, forgotPassword, resetPassword, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
