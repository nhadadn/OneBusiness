'use client';

import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';
import type { NegocioListItem } from '@/types/negocio.types';

type NegociosResponse = {
  success: boolean;
  data: NegocioListItem[];
};

export function useNegocios(params: { negocioId?: number; enabled?: boolean }) {
  return useQuery({
    queryKey: ['negocios', params.negocioId],
    enabled: params.enabled ?? true,
    queryFn: async () => {
      return apiFetch<NegociosResponse>('/api/negocios', { negocioId: params.negocioId });
    },
  });
}
