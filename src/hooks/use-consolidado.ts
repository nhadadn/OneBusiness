'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';
import type { ConsolidadoApiResponse, ConsolidadoFilters } from '@/types/negocio.types';

function formatLocalDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultFilters(): ConsolidadoFilters {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    fechaDesde: formatLocalDateYYYYMMDD(start),
    fechaHasta: formatLocalDateYYYYMMDD(now),
    estado: 'APROBADO',
    tipo: undefined,
  };
}

export type UseConsolidadoReturn = {
  filters: ConsolidadoFilters;
  setFechaDesde: (value: string) => void;
  setFechaHasta: (value: string) => void;
  setTipo: (value: ConsolidadoFilters['tipo'] | undefined) => void;
  setEstado: (value: ConsolidadoFilters['estado']) => void;
  resetFilters: () => void;
  query: UseQueryResult<ConsolidadoApiResponse, Error>;
};

export function useConsolidado(options?: { enabled?: boolean }): UseConsolidadoReturn {
  const [filters, setFilters] = useState<ConsolidadoFilters>(() => getDefaultFilters());

  const setFechaDesde = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, fechaDesde: value }));
  }, []);

  const setFechaHasta = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, fechaHasta: value }));
  }, []);

  const setTipo = useCallback((value: ConsolidadoFilters['tipo'] | undefined) => {
    setFilters((prev) => ({ ...prev, tipo: value }));
  }, []);

  const setEstado = useCallback((value: ConsolidadoFilters['estado']) => {
    setFilters((prev) => ({ ...prev, estado: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(getDefaultFilters());
  }, []);

  const queryParams = useMemo(() => {
    const searchParams = new URLSearchParams();
    if (filters.fechaDesde) searchParams.set('fechaDesde', filters.fechaDesde);
    if (filters.fechaHasta) searchParams.set('fechaHasta', filters.fechaHasta);
    if (filters.tipo) searchParams.set('tipo', filters.tipo);
    if (filters.estado) searchParams.set('estado', filters.estado);
    return searchParams;
  }, [filters.estado, filters.fechaDesde, filters.fechaHasta, filters.tipo]);

  const query = useQuery({
    queryKey: ['consolidado', filters],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const url = queryParams.size ? `/api/consolidado?${queryParams.toString()}` : '/api/consolidado';
      return apiFetch<ConsolidadoApiResponse>(url);
    },
  });

  return {
    filters,
    setFechaDesde,
    setFechaHasta,
    setTipo,
    setEstado,
    resetFilters,
    query,
  };
}

