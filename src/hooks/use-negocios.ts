'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useApiClient } from '@/hooks/use-api-client';

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

export function useNegocios(params: { negocioId?: number; enabled?: boolean }) {
  const { apiFetch } = useApiClient();

  return useQuery({
    queryKey: ['negocios', params.negocioId],
    enabled: params.enabled ?? true,
    queryFn: async () => {
      return apiJson<{ success: boolean; data: NegocioCrudItem[] }>(apiFetch, '/api/negocios', { negocioId: params.negocioId });
    },
  });
}

export type NegocioCrudItem = {
  id: number;
  nombre: string;
  rubro: string | null;
  modeloIngreso: string | null;
  tieneSocios: boolean | null;
  umbralAlerta: string | null;
  umbralCritico: string | null;
  rfc: string | null;
  direccion: string | null;
  telefono: string | null;
  activo: boolean | null;
};

type NegocioDetailResponse = {
  success: boolean;
  data: NegocioCrudItem;
};

type CreateNegocioData = {
  nombre: string;
  rubro?: string;
  modeloIngreso?: string;
  tieneSocios?: boolean;
  umbralAlerta?: number | null;
  umbralCritico?: number | null;
  rfc?: string;
  direccion?: string;
  telefono?: string;
};

type UpdateNegocioData = Partial<CreateNegocioData> & { activo?: boolean };

export function useNegocioDetail(params: { id: number | null; enabled?: boolean; negocioId?: number }) {
  const { apiFetch } = useApiClient();

  return useQuery({
    queryKey: ['negocios', params.id],
    enabled: (params.enabled ?? true) && typeof params.id === 'number',
    queryFn: async () => {
      return apiJson<NegocioDetailResponse>(apiFetch, `/api/negocios/${params.id}`, {
        negocioId: params.negocioId,
      });
    },
  });
}

export function useCrearNegocio() {
  const { apiFetch } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateNegocioData) => {
      return apiJson<NegocioDetailResponse>(apiFetch, '/api/negocios', {
        method: 'POST',
        json: payload,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['negocios'] });
      toast.success('Negocio creado', { duration: 2500 });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear el negocio', { duration: 5000 });
    },
  });
}

export function useActualizarNegocio() {
  const { apiFetch } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: number; data: UpdateNegocioData }) => {
      return apiJson<NegocioDetailResponse>(apiFetch, `/api/negocios/${args.id}`, {
        method: 'PUT',
        json: args.data,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['negocios'] });
      toast.success('Negocio actualizado', { duration: 2500 });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el negocio', { duration: 5000 });
    },
  });
}

export function useEliminarNegocio() {
  const { apiFetch } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return apiJson<{ success: boolean; data: { id: number } }>(apiFetch, `/api/negocios/${id}`, { method: 'DELETE' });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['negocios'] });
      toast.success('Negocio eliminado', { duration: 2500 });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el negocio', { duration: 5000 });
    },
  });
}
