'use client';

import { useQuery } from '@tanstack/react-query';

import { useApiClient } from '@/hooks/use-api-client';

type PendingCountResponse = {
  success: boolean;
  count: number;
};

export function usePendingCount() {
  const { apiFetch } = useApiClient();

  return useQuery({
    queryKey: ['pendingCount'],
    queryFn: async (): Promise<PendingCountResponse> => {
      const res = await apiFetch('/api/movimientos/pendientes/count', { headers: { 'Cache-Control': 'no-store' } });
      const contentType = res.headers.get('content-type') ?? '';
      const isJson = contentType.includes('application/json');

      if (!res.ok) {
        const payload = isJson ? ((await res.json().catch(() => null)) as { error?: string } | null) : null;
        throw new Error(payload?.error ?? 'No se pudo obtener el contador de pendientes');
      }

      return (await res.json()) as PendingCountResponse;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

