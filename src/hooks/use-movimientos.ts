'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import type { EstadoMovimiento, TipoMovimiento } from '@/types/movimiento.types';

function dispatchUiRefresh(eventName: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(eventName));
}

export type MovimientoListItem = {
  id: number;
  negocioId: number;
  tipo: TipoMovimiento;
  fecha: string;
  concepto: string;
  tercero: string | null;
  monto: string;
  estado: EstadoMovimiento;
  version: number;
  activo: boolean;
  cuentaBanco: { id: number; nombre: string };
  creadoPor: { id: number; nombre: string; email: string };
  aprobadoPor: { id: number; nombre: string } | null;
  fechaAprobacion: string | null;
  motivoRechazo: string | null;
  createdAt: string;
};

export type CreateMovimientoData = {
  negocioId: number;
  tipo: 'INGRESO' | 'EGRESO' | 'TRASPASO_SALIDA';
  fecha: string;
  concepto: string;
  tercero?: string;
  monto: number;
  cuentaBancoId: number;
  cuentaBancoDestinoId?: number;
  negocioDestinoId?: number;
  centroCostoId?: number;
};

export type MovimientosFilters = {
  negocioId?: number;
  estado?: EstadoMovimiento;
  tipo?: TipoMovimiento;
  fechaDesde?: string;
  fechaHasta?: string;
  cuentaBancoId?: number;
  page?: number;
  limit?: number;
};

export type MovimientoDetalle = MovimientoListItem & {
  traspasoRefId: number | null;
  centroCostoId: number | null;
};

type MovimientosListApiItem = {
  id: number;
  negocioId: number;
  fecha: string;
  concepto: string;
  tercero: string | null;
  tipo: TipoMovimiento;
  monto: string;
  estado: EstadoMovimiento;
  version: number;
  activo: boolean;
  createdAt: string;
  cuentaBanco: { id: number; nombre: string };
  creadoPor: { id: number; nombre: string; email: string };
  aprobadoPor: { id: number | null; nombre: string | null } | null;
  fechaAprobacion: string | null;
  motivoRechazo: string | null;
};

type MovimientosListApiResponse = {
  success: boolean;
  data:
    | MovimientosListApiItem[]
    | {
        items: MovimientosListApiItem[];
        total: number;
        page: number;
        limit: number;
      };
};

type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

function normalizePaginated(data: MovimientosListApiResponse['data'], fallback: { page: number; limit: number }) {
  if (Array.isArray(data)) {
    return { items: data, total: data.length, page: fallback.page, limit: fallback.limit };
  }
  return data;
}

function toMovimientoListItem(item: MovimientosListApiItem, fallbackNegocioId: number): MovimientoListItem {
  const aprobado =
    item.aprobadoPor && typeof item.aprobadoPor.id === 'number' && item.aprobadoPor.nombre
      ? { id: item.aprobadoPor.id, nombre: item.aprobadoPor.nombre }
      : null;

  return {
    id: item.id,
    negocioId: item.negocioId ?? fallbackNegocioId,
    tipo: item.tipo,
    fecha: item.fecha,
    concepto: item.concepto,
    tercero: item.tercero,
    monto: item.monto,
    estado: item.estado,
    version: item.version,
    activo: item.activo ?? true,
    cuentaBanco: item.cuentaBanco,
    creadoPor: item.creadoPor,
    aprobadoPor: aprobado,
    fechaAprobacion: item.fechaAprobacion,
    motivoRechazo: item.motivoRechazo,
    createdAt: item.createdAt,
  };
}

type MovimientoDetalleApiItem = MovimientosListApiItem & {
  traspasoRefId: number | null;
  centroCostoId: number | null;
};

type MovimientoDetalleApiResponse = {
  success: boolean;
  data: MovimientoDetalleApiItem;
};

export function useMovimientoDetalle(id: number | null, negocioId: number | null) {
  return useQuery({
    queryKey: ['movimiento', id, negocioId],
    enabled: id !== null,
    queryFn: async () => {
      const raw = await apiFetch<MovimientoDetalleApiResponse>(`/api/movimientos/${id}`, {
        negocioId: typeof negocioId === 'number' ? negocioId : undefined,
      });
      const list = toMovimientoListItem(raw.data, raw.data.negocioId);
      const detalle: MovimientoDetalle = {
        ...list,
        traspasoRefId: raw.data.traspasoRefId ?? null,
        centroCostoId: raw.data.centroCostoId ?? null,
      };
      return { success: true as const, data: detalle };
    },
  });
}

export function useMovimientos(filters: MovimientosFilters) {
  return useQuery({
    queryKey: ['movimientos', filters],
    enabled: typeof filters.negocioId === 'number',
    queryFn: async (): Promise<PaginatedResult<MovimientoListItem>> => {
      const searchParams = new URLSearchParams();
      if (typeof filters.negocioId === 'number') searchParams.set('negocioId', String(filters.negocioId));
      if (filters.estado) searchParams.set('estado', filters.estado);
      if (filters.tipo) searchParams.set('tipo', filters.tipo);
      if (filters.fechaDesde) searchParams.set('fechaDesde', filters.fechaDesde);
      if (filters.fechaHasta) searchParams.set('fechaHasta', filters.fechaHasta);
      if (typeof filters.cuentaBancoId === 'number') searchParams.set('cuentaBancoId', String(filters.cuentaBancoId));
      if (typeof filters.page === 'number') searchParams.set('page', String(filters.page));
      if (typeof filters.limit === 'number') searchParams.set('limit', String(filters.limit));

      const url = searchParams.size ? `/api/movimientos?${searchParams.toString()}` : '/api/movimientos';
      const raw = await apiFetch<MovimientosListApiResponse>(url, { negocioId: filters.negocioId });

      const page = filters.page ?? 1;
      const limit = filters.limit ?? 50;
      const normalized = normalizePaginated(raw.data, { page, limit });
      const negocioId = filters.negocioId!;

      return {
        page: normalized.page ?? page,
        limit: normalized.limit ?? limit,
        total: normalized.total ?? normalized.items.length,
        items: normalized.items.map((m) => toMovimientoListItem(m, negocioId)),
      };
    },
  });
}

export function useReenviarMovimiento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: number; negocioId?: number; cambios: { concepto?: string; monto?: number; fecha?: string; tercero?: string } }) => {
      return apiFetch<{ success: boolean; data: unknown }>(`/api/movimientos/${args.id}/reenviar`, {
        method: 'PATCH',
        negocioId: args.negocioId,
        body: args.cambios,
      });
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['movimiento', variables.id] });
      await queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      await queryClient.invalidateQueries({ queryKey: ['movimientos-pendientes'] });
      dispatchUiRefresh('onebusiness:movimientos-refresh');
      dispatchUiRefresh('onebusiness:pending-count-refresh');
    },
  });
}

type PendientesApiResponse = {
  success: boolean;
  data: Array<{ negocioId: number; count: number }>;
};

export function useMovimientoPendientesCount() {
  const { user } = useAuth();
  const canSee = user?.rol === 'Dueño' || user?.rol === 'Admin';
  const negocioId = user?.rol === 'Dueño' ? undefined : user?.negocios?.[0];

  return useQuery({
    queryKey: ['movimientos-pendientes'],
    enabled: Boolean(canSee && user),
    queryFn: async () => {
      const response = await apiFetch<PendientesApiResponse>('/api/movimientos/pendientes', { negocioId });
      const porNegocio = response.data.map((row) => ({
        negocioId: row.negocioId,
        nombre: `Negocio ${row.negocioId}`,
        count: row.count,
      }));
      const total = porNegocio.reduce((acc, row) => acc + row.count, 0);
      return { total, porNegocio };
    },
  });
}

export function useCreateMovimiento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateMovimientoData) => {
      return apiFetch<{ success: boolean; data: unknown }>('/api/movimientos', {
        method: 'POST',
        negocioId: payload.negocioId,
        body: payload,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      await queryClient.invalidateQueries({ queryKey: ['movimientos-pendientes'] });
      dispatchUiRefresh('onebusiness:movimientos-refresh');
      dispatchUiRefresh('onebusiness:pending-count-refresh');
    },
  });
}

export function useAprobarMovimiento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: number; negocioId?: number }) => {
      return apiFetch<{ success: boolean; data: unknown }>(`/api/movimientos/${args.id}/aprobar`, {
        method: 'PATCH',
        negocioId: args.negocioId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      await queryClient.invalidateQueries({ queryKey: ['movimientos-pendientes'] });
      dispatchUiRefresh('onebusiness:movimientos-refresh');
      dispatchUiRefresh('onebusiness:pending-count-refresh');
    },
  });
}

export function useRechazarMovimiento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: number; motivoRechazo: string; negocioId?: number }) => {
      return apiFetch<{ success: boolean; data: unknown }>(`/api/movimientos/${args.id}/rechazar`, {
        method: 'PATCH',
        negocioId: args.negocioId,
        body: { motivoRechazo: args.motivoRechazo },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      await queryClient.invalidateQueries({ queryKey: ['movimientos-pendientes'] });
      dispatchUiRefresh('onebusiness:movimientos-refresh');
      dispatchUiRefresh('onebusiness:pending-count-refresh');
    },
  });
}

export function useDeleteMovimiento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: number; negocioId?: number }) => {
      return apiFetch<{ success: boolean; data: unknown }>(`/api/movimientos/${args.id}`, {
        method: 'DELETE',
        negocioId: args.negocioId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      await queryClient.invalidateQueries({ queryKey: ['movimientos-pendientes'] });
      dispatchUiRefresh('onebusiness:movimientos-refresh');
      dispatchUiRefresh('onebusiness:pending-count-refresh');
    },
  });
}
