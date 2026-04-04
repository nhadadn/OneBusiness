'use client';

import { useQuery } from '@tanstack/react-query';

import { useApiClient } from '@/hooks/use-api-client';

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

type ResumenEjecutivo = {
  totalIngresos: number;
  totalEgresos: number;
  balance: number;
  totalPendientes: number;
};

type IngresosPorMesItem = { mes: string; ingresos: number; egresos: number };
type DistribucionPorNegocioItem = { name: string; value: number; negocioId: number };
type TendenciaBalanceItem = { fecha: string; ingresos: number; egresos: number; balance: number };
type TopCategoriaItem = { nombre: string; total: number; cantidad: number };
type RankingNegocioItem = {
  negocioId: number;
  nombre: string;
  ingresos: number;
  egresos: number;
  balance: number;
  pendientes: number;
  semaforo: 'verde' | 'amarillo' | 'rojo';
};

export type ReportesResponse = {
  success: boolean;
  data: {
    resumenEjecutivo: ResumenEjecutivo;
    ingresosPorMes: IngresosPorMesItem[];
    distribucionPorNegocio: DistribucionPorNegocioItem[];
    tendenciaBalance: TendenciaBalanceItem[];
    topCategoriasIngreso: TopCategoriaItem[];
    topCategoriasEgreso: TopCategoriaItem[];
    rankingNegocios: RankingNegocioItem[];
  };
};

export function useReportes({
  fechaDesde,
  fechaHasta,
  negocioId,
  enabled = true,
}: {
  fechaDesde: string;
  fechaHasta: string;
  negocioId?: number | null;
  enabled?: boolean;
}) {
  const { apiFetch } = useApiClient();

  return useQuery({
    queryKey: ['reportes', fechaDesde, fechaHasta, negocioId ?? 'todos'],
    staleTime: 60_000,
    enabled: enabled && !!fechaDesde && !!fechaHasta,
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('fechaDesde', fechaDesde);
      searchParams.set('fechaHasta', fechaHasta);
      if (typeof negocioId === 'number') {
        searchParams.set('negocioId', String(negocioId));
      }

      const url = `/api/reportes?${searchParams.toString()}`;
      return apiJson<ReportesResponse>(apiFetch, url, { negocioId: typeof negocioId === 'number' ? negocioId : undefined });
    },
  });
}
