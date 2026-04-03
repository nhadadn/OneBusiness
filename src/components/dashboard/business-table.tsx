'use client';

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { useNegocios } from '@/hooks/use-negocios';
import { apiFetch } from '@/lib/api-client';
import type { NegocioListItem } from '@/types/negocio.types';

type NegociosResponse = {
  success: boolean;
  data: NegocioListItem[];
};

export function BusinessTable({ negocioId }: { negocioId?: number }) {
  const { user } = useAuth();
  const isDueño = user?.rol === 'Dueño';

  const singleQuery = useNegocios({
    negocioId: isDueño ? undefined : negocioId,
    enabled: Boolean(user) && (isDueño || typeof negocioId === 'number'),
  });

  const assignedIds = user?.negocios ?? [];
  const manyQueries = useQueries({
    queries: assignedIds.map((id) => ({
      queryKey: ['negocios', id],
      enabled: Boolean(user) && !isDueño && typeof negocioId !== 'number',
      queryFn: async () => apiFetch<NegociosResponse>('/api/negocios', { negocioId: id }),
    })),
  });

  const items = useMemo(() => {
    if (isDueño || typeof negocioId === 'number') {
      return singleQuery.data?.data ?? [];
    }

    const all: NegocioListItem[] = [];
    for (const q of manyQueries) {
      const rows = q.data?.data ?? [];
      for (const row of rows) {
        all.push(row);
      }
    }
    return all;
  }, [isDueño, manyQueries, negocioId, singleQuery.data]);

  const title = isDueño ? 'Negocios' : typeof negocioId === 'number' ? 'Negocio' : 'Negocios';

  const isLoading = isDueño || typeof negocioId === 'number' ? singleQuery.isLoading : manyQueries.some((q) => q.isLoading);

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Rubro</TableHead>
              <TableHead>Socios</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  {isLoading ? 'Cargando...' : 'Sin negocios'}
                </TableCell>
              </TableRow>
            ) : (
              items.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">{n.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{n.rubro ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{n.tieneSocios ? 'Sí' : 'No'}</TableCell>
                  <TableCell className="text-muted-foreground">{n.activo === false ? 'Inactivo' : 'Activo'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
