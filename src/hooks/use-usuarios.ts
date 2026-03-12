'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';
import type { CreateUsuarioData, UpdateUsuarioData, UsuarioDetail, UsuarioListItem } from '@/types/usuario.types';
import type { RoleName } from '@/types/permissions.types';

type UsuariosListResponse = {
  success: boolean;
  data: {
    usuarios: UsuarioListItem[];
    total: number;
  };
};

type UsuarioDetailResponse = {
  success: boolean;
  data: UsuarioDetail;
};

type RolesResponse = {
  success: boolean;
  data: Array<{ id: number; nombre: RoleName }>;
};

export function useUsuarios(params: { negocioId?: number; rol?: RoleName; activo?: boolean }) {
  return useQuery({
    queryKey: ['usuarios', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.rol) searchParams.set('rol', params.rol);
      if (typeof params.activo === 'boolean') searchParams.set('activo', String(params.activo));
      const url = searchParams.size ? `/api/usuarios?${searchParams.toString()}` : '/api/usuarios';
      return apiFetch<UsuariosListResponse>(url, { negocioId: params.negocioId });
    },
  });
}

export function useUsuarioDetail(params: { id: number | null; negocioId?: number }) {
  return useQuery({
    queryKey: ['usuarios', params.id],
    enabled: typeof params.id === 'number',
    queryFn: async () => {
      return apiFetch<UsuarioDetailResponse>(`/api/usuarios/${params.id}`, { negocioId: params.negocioId });
    },
  });
}

export function useRoles(params: { negocioId?: number }) {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      return apiFetch<RolesResponse>('/api/roles', { negocioId: params.negocioId });
    },
  });
}

export function useCreateUsuario(params: { negocioId?: number }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateUsuarioData) => {
      return apiFetch<{ success: boolean; data: UsuarioDetail }>('/api/usuarios', {
        method: 'POST',
        negocioId: params.negocioId,
        body: {
          nombreCompleto: payload.nombreCompleto,
          email: payload.email,
          password: payload.password,
          rolId: payload.rolId,
          negocios: payload.negocios,
        },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
}

export function useUpdateUsuario(params: { negocioId?: number }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: number; data: UpdateUsuarioData }) => {
      return apiFetch<{ success: boolean; data: UsuarioDetail }>(`/api/usuarios/${args.id}`, {
        method: 'PUT',
        negocioId: params.negocioId,
        body: {
          nombreCompleto: args.data.nombreCompleto,
          email: args.data.email,
          password: args.data.password,
          rolId: args.data.rolId,
          activo: args.data.activo,
        },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
}

export function useDeleteUsuario(params: { negocioId?: number }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return apiFetch<{ success: boolean; data: { success: true } }>(`/api/usuarios/${id}`, {
        method: 'DELETE',
        negocioId: params.negocioId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
}
