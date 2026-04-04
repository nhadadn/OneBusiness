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

  return useQuery({
    queryKey: ['centrosCosto', params.negocioId],
    enabled: (params.enabled ?? true) && !!params.negocioId,
    staleTime: 30_000,
    queryFn: async () => {
      const negocioId = params.negocioId!;
      return apiJson<CentrosCostoListResponse>(apiFetch, `/api/centros-costo?negocioId=${negocioId}`, { negocioId });
    },
  });
}

export function useCentrosCostoTree(params: { negocioId?: number | null; enabled?: boolean }) {
  const { apiFetch } = useApiClient();

  return useQuery({
    queryKey: ['centrosCostoTree', params.negocioId],
    enabled: (params.enabled ?? true) && !!params.negocioId,
    staleTime: 30_000,
    queryFn: async () => {
      const negocioId = params.negocioId!;
      return apiJson<CentrosCostoTreeResponse>(apiFetch, `/api/centros-costo/tree?negocioId=${negocioId}`, { negocioId });
    },
  });
}
