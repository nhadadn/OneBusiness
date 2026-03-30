'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useApiClient } from '@/hooks/use-api-client';
import type { TipoCuenta } from '@/types/cuenta_banco.types';

type ApiErrorPayload = {
  success?: boolean;
  error?: string;
  details?: unknown;
};

type ApiFetchFn = (url: string, options?: RequestInit & { negocioId?: number | null }) => Promise<Response>;

async function apiJson<T>(
  apiFetch: ApiFetchFn,
  url: string,
  options?: Omit<RequestInit, 'body'> & { negocioId?: number | null; json?: unknown }
) {
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

export type CuentaNegocioListItem = {
  id: number;
  cuentaId: number;
  negocioId: number;
  fechaAsignacion?: string | null;
};

export type CuentaBancoListItem = {
  id: number;
  nombre: string;
  tipo: TipoCuenta;
  bancoInstitucion: string | null;
  titular: string | null;
  negocioId: number | null;
  esGlobal: boolean;
  negociosCompartidos?: CuentaNegocioListItem[];
  saldoInicial: string;
  saldoReal: string | null;
  fechaSaldoReal: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateCuentaBancoData = {
  nombre: string;
  tipo: TipoCuenta;
  bancoInstitucion?: string;
  titular?: string;
  negocioId?: number | null;
  esGlobal?: boolean;
  negociosCompartidos?: number[];
  saldoInicial?: number;
};

export type UpdateCuentaBancoData = {
  nombre?: string;
  tipo?: TipoCuenta;
  bancoInstitucion?: string;
  titular?: string;
  negocioId?: number | null;
  esGlobal?: boolean;
  negociosCompartidos?: number[];
};

type ListResponse = {
  success: boolean;
  data: CuentaBancoListItem[];
};

type DetailResponse = {
  success: boolean;
  data: CuentaBancoListItem;
};

export function useCuentasBanco(params: { negocioId: number | null }) {
  const { apiFetch } = useApiClient();

  return useQuery({
    queryKey: ['cuentas-banco', params.negocioId],
    enabled: typeof params.negocioId === 'number',
    queryFn: async () => {
      return apiJson<ListResponse>(apiFetch, '/api/cuentas-banco', { negocioId: params.negocioId ?? undefined });
    },
  });
}

export function useCuentaBancoDetail(params: { id: number | null; negocioId: number | null }) {
  const { apiFetch } = useApiClient();

  return useQuery({
    queryKey: ['cuentas-banco', params.id],
    enabled: typeof params.id === 'number' && typeof params.negocioId === 'number',
    queryFn: async () => {
      return apiJson<DetailResponse>(apiFetch, `/api/cuentas-banco/${params.id}`, { negocioId: params.negocioId ?? undefined });
    },
  });
}

export function useCreateCuentaBanco(params: { negocioId: number | null }) {
  const { apiFetch } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateCuentaBancoData) => {
      if (typeof params.negocioId !== 'number') {
        throw new Error('Negocio requerido');
      }

      const negocioIdBody = payload.negocioId === undefined ? params.negocioId : payload.negocioId;

      return apiJson<DetailResponse>(apiFetch, '/api/cuentas-banco', {
        method: 'POST',
        negocioId: params.negocioId,
        json: {
          ...payload,
          negocioId: negocioIdBody,
        },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cuentas-banco'] });
    },
  });
}

export function useUpdateCuentaBanco(params: { negocioId: number | null }) {
  const { apiFetch } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: number; data: UpdateCuentaBancoData }) => {
      if (typeof params.negocioId !== 'number') {
        throw new Error('Negocio requerido');
      }

      return apiJson<DetailResponse>(apiFetch, `/api/cuentas-banco/${args.id}`, {
        method: 'PATCH',
        negocioId: params.negocioId,
        json: args.data,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cuentas-banco'] });
    },
  });
}

export function useDeleteCuentaBanco(params: { negocioId: number | null }) {
  const { apiFetch } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      if (typeof params.negocioId !== 'number') {
        throw new Error('Negocio requerido');
      }

      return apiJson<{ success: boolean; data: { id: number } }>(apiFetch, `/api/cuentas-banco/${id}`, {
        method: 'DELETE',
        negocioId: params.negocioId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cuentas-banco'] });
    },
  });
}

export function useUpdateSaldoReal(params: { negocioId: number | null }) {
  const { apiFetch } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: number; saldoReal: number }) => {
      if (typeof params.negocioId !== 'number') {
        throw new Error('Negocio requerido');
      }

      return apiJson<DetailResponse>(apiFetch, `/api/cuentas-banco/${args.id}/saldo`, {
        method: 'PATCH',
        negocioId: params.negocioId,
        json: { saldoReal: args.saldoReal },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cuentas-banco'] });
    },
  });
}

export function useAsignarNegocio(params: { negocioId: number | null }) {
  const { apiFetch } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: number; negocioId: number }) => {
      if (typeof params.negocioId !== 'number') {
        throw new Error('Negocio requerido');
      }

      return apiJson<DetailResponse>(apiFetch, `/api/cuentas-banco/${args.id}/asignar`, {
        method: 'POST',
        negocioId: params.negocioId,
        json: { negocioId: args.negocioId },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cuentas-banco'] });
      toast.success('Cuenta asignada al negocio', { duration: 2500 });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No se pudo asignar la cuenta', { duration: 5000 });
    },
  });
}

export function useRemoverNegocio(params: { negocioId: number | null }) {
  const { apiFetch } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: number; negocioId: number }) => {
      if (typeof params.negocioId !== 'number') {
        throw new Error('Negocio requerido');
      }

      return apiJson<DetailResponse>(apiFetch, `/api/cuentas-banco/${args.id}/asignar`, {
        method: 'DELETE',
        negocioId: params.negocioId,
        json: { negocioId: args.negocioId },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cuentas-banco'] });
      toast.success('Cuenta removida del negocio', { duration: 2500 });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No se pudo remover la cuenta', { duration: 5000 });
    },
  });
}

