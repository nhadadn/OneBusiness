'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';

interface ApiClientOptions extends RequestInit {
  negocioId?: number | null;
}

interface UseApiClientReturn {
  apiFetch: (url: string, options?: ApiClientOptions) => Promise<Response>;
}

export function useApiClient(): UseApiClientReturn {
  const { accessToken, refreshSession, logout } = useAuth();
  const router = useRouter();

  const apiFetch = useCallback(
    async (url: string, options: ApiClientOptions = {}): Promise<Response> => {
      const { negocioId, headers: extraHeaders, ...restOptions } = options;

      const headers: Record<string, string> = {
        ...(extraHeaders as Record<string, string> | undefined),
      };

      if (!headers['Content-Type'] && restOptions.body !== undefined) {
        headers['Content-Type'] = 'application/json';
      }

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      if (negocioId != null) {
        headers['X-Negocio-Id'] = String(negocioId);
      }

      let res = await fetch(url, {
        ...restOptions,
        headers,
        credentials: 'include',
      });

      if (res.status === 401) {
        const newToken = await refreshSession();

        if (!newToken) {
          router.push('/login');
          return res;
        }

        headers.Authorization = `Bearer ${newToken}`;
        res = await fetch(url, {
          ...restOptions,
          headers,
          credentials: 'include',
        });

        if (res.status === 401) {
          await logout();
          return res;
        }
      }

      return res;
    },
    [accessToken, refreshSession, logout, router]
  );

  return { apiFetch };
}

