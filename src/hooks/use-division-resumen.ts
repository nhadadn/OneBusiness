'use client';

import { useQuery } from '@tanstack/react-query';

import { useApiClient } from '@/hooks/use-api-client';
import type { CentroCostoListItem } from '@/types/centro_costo.types';

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

export type DivisionResumenResponse = {
  success: boolean;
  data: {
    centro: CentroCostoListItem;
    resumen: {
      totalIngresos: number;
      totalEgresos: number;
      balance: number;
      cantidadMovimientos: number;
      cantidadPendientes: number;
    };
    hijos: { id: number; nombre: string; totalIngresos: number; totalEgresos: number; balance: number }[];
  };
};

export function useDivisionResumen({
  centroCostoId,
  fechaDesde,
  fechaHasta,
  enabled = true,
}: {
  centroCostoId: number | null;
  fechaDesde: string;
  fechaHasta: string;
  enabled?: boolean;
}) {
  const { apiFetch } = useApiClient();

  return useQuery({
    queryKey: ['divisionResumen', centroCostoId, fechaDesde, fechaHasta],
    staleTime: 30_000,
    enabled: enabled && !!centroCostoId && !!fechaDesde && !!fechaHasta,
    queryFn: async () => {
      const id = centroCostoId!;
      const url = `/api/centros-costo/${id}/resumen?fechaDesde=${encodeURIComponent(fechaDesde)}&fechaHasta=${encodeURIComponent(fechaHasta)}`;
      return apiJson<DivisionResumenResponse>(apiFetch, url, { negocioId: null });
    },
  });
}
