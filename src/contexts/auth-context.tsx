'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { LoginResponse } from '@/types/auth.types';
import { setApiClientAccessToken } from '@/lib/api-client';

const SESSION_COOKIE_NAME = 'onebusiness_session';

export type User = LoginResponse['user'];

export type AuthContextValue = {
  accessToken: string | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

function setSessionCookie(authenticated: boolean) {
  if (typeof document === 'undefined') return;
  if (authenticated) {
    document.cookie = `${SESSION_COOKIE_NAME}=1; Path=/; SameSite=Lax`;
  } else {
    document.cookie = `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}

type RefreshResponse = {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: User;
  usuario?: User;
  error?: string;
};

type LoginApiResponse = {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: User;
  usuario?: User;
  error?: string;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isRefreshing = useRef(false);
  const refreshPromise = useRef<Promise<string | null> | null>(null);

  const refreshSession = useCallback(async (): Promise<string | null> => {
    if (isRefreshing.current && refreshPromise.current) {
      return refreshPromise.current;
    }

    isRefreshing.current = true;
    refreshPromise.current = (async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        if (!res.ok) {
          setAccessToken(null);
          setUser(null);
          setApiClientAccessToken(null);
          setSessionCookie(false);
          return null;
        }

        const data = (await res.json()) as RefreshResponse;
        const nextToken = data.accessToken ?? null;
        const nextUser = (data.user ?? data.usuario) ?? null;

        if (!nextToken || !nextUser) {
          setAccessToken(null);
          setUser(null);
          setApiClientAccessToken(null);
          setSessionCookie(false);
          return null;
        }

        setAccessToken(nextToken);
        setUser(nextUser);
        setApiClientAccessToken(nextToken);
        setSessionCookie(true);
        return nextToken;
      } catch {
        setAccessToken(null);
        setUser(null);
        setApiClientAccessToken(null);
        setSessionCookie(false);
        return null;
      } finally {
        isRefreshing.current = false;
        refreshPromise.current = null;
      }
    })();

    return refreshPromise.current;
  }, []);

  useEffect(() => {
    refreshSession().finally(() => setIsLoading(false));
  }, [refreshSession]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        return { success: false, error: data.error ?? 'Error al iniciar sesión' };
      }

      const data = (await res.json()) as LoginApiResponse;
      const nextToken = data.accessToken ?? null;
      const nextUser = (data.user ?? data.usuario) ?? null;

      if (!nextToken || !nextUser) {
        return { success: false, error: 'Respuesta inválida del servidor' };
      }

      setAccessToken(nextToken);
      setUser(nextUser);
      setApiClientAccessToken(nextToken);
      setSessionCookie(true);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Error de conexión' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
    } finally {
      setAccessToken(null);
      setUser(null);
      setApiClientAccessToken(null);
      setSessionCookie(false);
    }
  }, [accessToken]);

  const value: AuthContextValue = {
    accessToken,
    user,
    isLoading,
    isAuthenticated: accessToken !== null && user !== null,
    login,
    logout,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}
