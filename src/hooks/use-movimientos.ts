'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useApiClient } from '@/hooks/use-api-client';
import { useAuth } from '@/hooks/use-auth';
import type { EstadoMovimiento, TipoMovimiento } from '@/types/movimiento.types';

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

export type MovimientoListItem = {
  id: number;
  negocioId: number;
  tipo: TipoMovimiento;
  fecha: string;
  concepto: string;
  tercero: string | null;
  monto: string;
  estado: EstadoMovimiento;
  traspasoRefId?: number | null;
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
  categoriaId?: number;
  tercero?: string;
  monto: number;
  cuentaBancoId: number;
  cuentaBancoDestinoId?: number;
  negocioDestinoId?: number;
  centroCostoId?: number;
  efectuado?: boolean;
};

export type MovimientosFilters = {
  negocioId?: number;
  estado?: EstadoMovimiento;
  tipo?: TipoMovimiento;
  fechaDesde?: string;
  fechaHasta?: string;
  cuentaBancoId?: number;
  centroCostoId?: number | null;
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
  traspasoRefId?: number | null;
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
    traspasoRefId: item.traspasoRefId ?? null,
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
  const { apiFetch } = useApiClient();

  return useQuery({
    queryKey: ['movimiento', id, negocioId],
    enabled: id !== null,
    queryFn: async () => {
      const raw = await apiJson<MovimientoDetalleApiResponse>(apiFetch, `/api/movimientos/${id}`, {
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
  const { apiFetch } = useApiClient();

  return useQuery({
    queryKey: ['movimientos', filters, filters.centroCostoId ?? null],
    enabled: typeof filters.negocioId === 'number',
    queryFn: async (): Promise<PaginatedResult<MovimientoListItem>> => {
      const searchParams = new URLSearchParams();
      if (typeof filters.negocioId === 'number') searchParams.set('negocioId', String(filters.negocioId));
      if (filters.estado) searchParams.set('estado', filters.estado);
      if (filters.tipo) searchParams.set('tipo', filters.tipo);
      if (filters.fechaDesde) searchParams.set('fechaDesde', filters.fechaDesde);
      if (filters.fechaHasta) searchParams.set('fechaHasta', filters.fechaHasta);
      if (typeof filters.cuentaBancoId === 'number') searchParams.set('cuentaBancoId', String(filters.cuentaBancoId));
      if (typeof filters.centroCostoId === 'number') searchParams.set('centroCostoId', String(filters.centroCostoId));
      if (typeof filters.page === 'number') searchParams.set('page', String(filters.page));
      if (typeof filters.limit === 'number') searchParams.set('limit', String(filters.limit));

      const url = searchParams.size ? `/api/movimientos?${searchParams.toString()}` : '/api/movimientos';
      const raw = await apiJson<MovimientosListApiResponse>(apiFetch, url, { negocioId: filters.negocioId });

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
  const { apiFetch } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: number; negocioId?: number; cambios: { concepto?: string; monto?: number; fecha?: string; tercero?: string } }) => {
      return apiJson<{ success: boolean; data: unknown }>(apiFetch, `/api/movimientos/${args.id}/reenviar`, {
        method: 'PATCH',
        negocioId: args.negocioId,
        json: args.cambios,
      });
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['movimiento', variables.id] });
      await queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      await queryClient.invalidateQueries({ queryKey: ['movimientos-pendientes'] });
      await queryClient.invalidateQueries({ queryKey: ['pendingCount'] });
    },
  });
}

type PendientesApiResponse = {
  success: boolean;
  data: Array<{ negocioId: number; count: number }>;
};

export function useMovimientoPendientesCount() {
  const { user } = useAuth();
  const { apiFetch } = useApiClient();
  const canSee = user?.rol === 'Dueño' || user?.rol === 'Admin';
  const negocioId = user?.rol === 'Dueño' ? undefined : user?.negocios?.[0];

  return useQuery({
    queryKey: ['movimientos-pendientes'],
    enabled: Boolean(canSee && user),
    queryFn: async () => {
      const response = await apiJson<PendientesApiResponse>(apiFetch, '/api/movimientos/pendientes', { negocioId });
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
  const { apiFetch } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateMovimientoData) => {
      return apiJson<{ success: boolean; data: unknown }>(apiFetch, '/api/movimientos', {
        method: 'POST',
        negocioId: payload.negocioId,
        json: payload,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      await queryClient.invalidateQueries({ queryKey: ['movimientos-pendientes'] });
      await queryClient.invalidateQueries({ queryKey: ['pendingCount'] });
    },
  });
}

export function useAprobarMovimiento() {
  const { apiFetch } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: number; negocioId?: number }) => {
      return apiJson<{ success: boolean; data: unknown }>(apiFetch, `/api/movimientos/${args.id}/aprobar`, {
        method: 'PATCH',
        negocioId: args.negocioId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      await queryClient.invalidateQueries({ queryKey: ['movimientos-pendientes'] });
      await queryClient.invalidateQueries({ queryKey: ['pendingCount'] });
    },
  });
}

export function useRechazarMovimiento() {
  const { apiFetch } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: number; motivoRechazo: string; negocioId?: number }) => {
      return apiJson<{ success: boolean; data: unknown }>(apiFetch, `/api/movimientos/${args.id}/rechazar`, {
        method: 'PATCH',
        negocioId: args.negocioId,
        json: { motivoRechazo: args.motivoRechazo },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      await queryClient.invalidateQueries({ queryKey: ['movimientos-pendientes'] });
      await queryClient.invalidateQueries({ queryKey: ['pendingCount'] });
    },
  });
}

export function useDeleteMovimiento() {
  const { apiFetch } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: number; negocioId?: number }) => {
      return apiJson<{ success: boolean; data: unknown }>(apiFetch, `/api/movimientos/${args.id}`, {
        method: 'DELETE',
        negocioId: args.negocioId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      await queryClient.invalidateQueries({ queryKey: ['movimientos-pendientes'] });
      await queryClient.invalidateQueries({ queryKey: ['pendingCount'] });
    },
  });
}

export function useMarcarPagado() {
  const { apiFetch } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: number; negocioId?: number; fechaPago?: string }) => {
      return apiJson<{ success: boolean; data: unknown }>(apiFetch, `/api/movimientos/${args.id}/pagar`, {
        method: 'PATCH',
        negocioId: args.negocioId,
        json: args.fechaPago ? { fechaPago: args.fechaPago } : {},
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      await queryClient.invalidateQueries({ queryKey: ['movimientos-pendientes'] });
      await queryClient.invalidateQueries({ queryKey: ['pendingCount'] });
      toast.success('Movimiento marcado como pagado', { duration: 2500 });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No se pudo marcar como pagado', { duration: 5000 });
    },
  });
}

export function useCancelarMovimiento() {
  const { apiFetch } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: number; negocioId?: number; motivo?: string }) => {
      return apiJson<{ success: boolean; data: unknown }>(apiFetch, `/api/movimientos/${args.id}/cancelar`, {
        method: 'PATCH',
        negocioId: args.negocioId,
        json: args.motivo ? { motivo: args.motivo } : {},
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      await queryClient.invalidateQueries({ queryKey: ['movimientos-pendientes'] });
      await queryClient.invalidateQueries({ queryKey: ['pendingCount'] });
      toast.success('Movimiento cancelado', { duration: 2500 });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No se pudo cancelar el movimiento', { duration: 5000 });
    },
  });
}
