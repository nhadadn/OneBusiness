'use client';

import * as React from 'react';

import type { LoginResponse } from '@/types/auth.types';
import { apiFetch, REFRESH_TOKEN_KEY, TOKEN_KEY, USER_KEY } from '@/lib/api-client';

const SESSION_COOKIE_NAME = 'onebusiness_session';

export type User = LoginResponse['user'];

export type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshAuth: () => Promise<boolean>;
};

export const AuthContext = React.createContext<AuthContextValue | null>(null);

function setSessionCookie(authenticated: boolean) {
  if (typeof document === 'undefined') return;
  if (authenticated) {
    document.cookie = `${SESSION_COOKIE_NAME}=1; Path=/; SameSite=Lax`;
  } else {
    document.cookie = `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}

function safeParseUser(raw: string | null): User | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const storedUser = safeParseUser(localStorage.getItem(USER_KEY));
    const token = localStorage.getItem(TOKEN_KEY);
    const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (storedUser && token && refresh) {
      setUser(storedUser);
      setSessionCookie(true);
    } else {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      setSessionCookie(false);
    }

    setIsLoading(false);
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    try {
      const data = await apiFetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        skipAuth: true,
        body: { email, password },
      });

      localStorage.setItem(TOKEN_KEY, data.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);
      setSessionCookie(true);

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Error de conexión' };
    }
  }, []);

  const logout = React.useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setSessionCookie(false);
  }, []);

  const refreshAuth = React.useCallback(async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return false;

    try {
      const data = await apiFetch<{ success: boolean; accessToken: string }>('/api/auth/refresh', {
        method: 'POST',
        skipAuth: true,
        body: { refreshToken },
      });

      localStorage.setItem(TOKEN_KEY, data.accessToken);
      return true;
    } catch {
      logout();
      return false;
    }
  }, [logout]);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
