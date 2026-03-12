'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';
import type { TipoCuenta } from '@/types/cuenta_banco.types';

export type CuentaBancoListItem = {
  id: number;
  nombre: string;
  tipo: TipoCuenta;
  bancoInstitucion: string | null;
  titular: string | null;
  negocioId: number;
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
  saldoInicial?: number;
};

export type UpdateCuentaBancoData = {
  nombre?: string;
  tipo?: TipoCuenta;
  bancoInstitucion?: string;
  titular?: string;
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
  return useQuery({
    queryKey: ['cuentas-banco', params.negocioId],
    enabled: typeof params.negocioId === 'number',
    queryFn: async () => {
      return apiFetch<ListResponse>('/api/cuentas-banco', { negocioId: params.negocioId ?? undefined });
    },
  });
}

export function useCuentaBancoDetail(params: { id: number | null; negocioId: number | null }) {
  return useQuery({
    queryKey: ['cuentas-banco', params.id],
    enabled: typeof params.id === 'number' && typeof params.negocioId === 'number',
    queryFn: async () => {
      return apiFetch<DetailResponse>(`/api/cuentas-banco/${params.id}`, { negocioId: params.negocioId ?? undefined });
    },
  });
}

export function useCreateCuentaBanco(params: { negocioId: number | null }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateCuentaBancoData) => {
      if (typeof params.negocioId !== 'number') {
        throw new Error('Negocio requerido');
      }

      return apiFetch<DetailResponse>('/api/cuentas-banco', {
        method: 'POST',
        negocioId: params.negocioId,
        body: {
          ...payload,
          negocioId: params.negocioId,
        },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cuentas-banco'] });
    },
  });
}

export function useUpdateCuentaBanco(params: { negocioId: number | null }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: number; data: UpdateCuentaBancoData }) => {
      if (typeof params.negocioId !== 'number') {
        throw new Error('Negocio requerido');
      }

      return apiFetch<DetailResponse>(`/api/cuentas-banco/${args.id}`, {
        method: 'PATCH',
        negocioId: params.negocioId,
        body: args.data,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cuentas-banco'] });
    },
  });
}

export function useDeleteCuentaBanco(params: { negocioId: number | null }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      if (typeof params.negocioId !== 'number') {
        throw new Error('Negocio requerido');
      }

      return apiFetch<{ success: boolean; data: { id: number } }>(`/api/cuentas-banco/${id}`, {
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: number; saldoReal: number }) => {
      if (typeof params.negocioId !== 'number') {
        throw new Error('Negocio requerido');
      }

      return apiFetch<DetailResponse>(`/api/cuentas-banco/${args.id}/saldo`, {
        method: 'PATCH',
        negocioId: params.negocioId,
        body: { saldoReal: args.saldoReal },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cuentas-banco'] });
    },
  });
}

