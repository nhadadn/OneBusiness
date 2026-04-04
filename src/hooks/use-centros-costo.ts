'use client';

import { useQuery } from '@tanstack/react-query';

import { useApiClient } from '@/hooks/use-api-client';
import type { CentroCostoListItem, CentroCostoTree } from '@/types/centro_costo.types';

type ApiFetchFn = (url: string, options?: RequestInit & { negocioId?: number | null }) => Promise<Response>;

type ApiErrorPayload = {
  success?: boolean;
  error?: string;
  details?: unknown;
};

async function apiJson<T>(
  apiFetch: ApiFetchFn,
  url: string,
  options?: Omit<RequestInit, 'body'> & { negocioId?: number | null; json?: unknown }
): Promise<T> {
  const res = await apiFetch(url, {
    ...options,
    body: options?.json !== undefined ? JSON.stringify(options.json) : undefined,
  });

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    const payload = isJson ? ((await res.json()) as ApiErrorPayload) : undefined;
    const message = payload?.error ?? `Error HTTP ${res.status}`;
    throw new Error(message);
  }

  if (!isJson) {
    return (await res.text()) as unknown as T;
  }

  return (await res.json()) as T;
}

type CentrosCostoListResponse = {
  success: boolean;
  data: CentroCostoListItem[];
};

type CentrosCostoTreeResponse = {
  success: boolean;
  data: CentroCostoTree[];
};

export function useCentrosCosto(params: { negocioId?: number | null; enabled?: boolean }) {
  const { apiFetch } = useApiClient();
  const negocioId = typeof params.negocioId === 'number' ? params.negocioId : null;
  const url = negocioId ? `/api/centros-costo?negocioId=${negocioId}` : null;

  return useQuery({
    queryKey: ['centrosCosto', negocioId],
    enabled: !!negocioId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!url || !negocioId) {
        return { success: true, data: [] } satisfies CentrosCostoListResponse;
      }
      return apiJson<CentrosCostoListResponse>(apiFetch, url, { negocioId });
    },
  });
}

export function useCentrosCostoTree(params: { negocioId?: number | null; enabled?: boolean }) {
  const { apiFetch } = useApiClient();
  const negocioId = typeof params.negocioId === 'number' ? params.negocioId : null;
  const url = negocioId ? `/api/centros-costo/tree?negocioId=${negocioId}` : null;

  return useQuery({
    queryKey: ['centrosCostoTree', negocioId],
    enabled: !!negocioId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!url || !negocioId) {
        return { success: true, data: [] } satisfies CentrosCostoTreeResponse;
      }
      return apiJson<CentrosCostoTreeResponse>(apiFetch, url, { negocioId });
    },
  });
}
