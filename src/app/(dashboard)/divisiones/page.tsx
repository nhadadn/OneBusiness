'use client';

import { useMemo, useState } from 'react';
import { Layers2, Loader2, Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { CentroCostoDialog } from '@/components/divisiones/centro-costo-dialog';
import { DivisionCard } from '@/components/divisiones/division-card';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { PageHeader } from '@/components/shared/page-header';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useCentrosCosto, useCentrosCostoTree } from '@/hooks/use-centros-costo';
import { useApiClient } from '@/hooks/use-api-client';
import { useAuth } from '@/hooks/use-auth';
import { useDashboardContext } from '@/app/(dashboard)/providers';
import type { CentroCostoListItem } from '@/types/centro_costo.types';

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

export default function DivisionesPage() {
  const { user, isLoading } = useAuth();
  const { negocioId } = useDashboardContext();
  const { apiFetch } = useApiClient();
  const queryClient = useQueryClient();

  const selectedNegocioId = typeof negocioId === 'number' ? negocioId : null;

  const treeQuery = useCentrosCostoTree({ negocioId: selectedNegocioId ?? null, enabled: !!selectedNegocioId });
  const listQuery = useCentrosCosto({ negocioId: selectedNegocioId ?? null, enabled: !!selectedNegocioId });

  const tree = treeQuery.data?.data ?? [];

  const divisiones = useMemo(() => {
    const items = listQuery.data?.data ?? [];
    return items.filter((c) => c.tipo === 'DIVISION');
  }, [listQuery.data?.data]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'division' | 'subdivision'>('division');
  const [editItem, setEditItem] = useState<CentroCostoListItem | null>(null);
  const [parentIdForSubdivision, setParentIdForSubdivision] = useState<number | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CentroCostoListItem | null>(null);

  const canManage = user?.rol === 'Dueño' || user?.rol === 'Admin';

  const orderedDivisiones = useMemo(() => {
    if (typeof parentIdForSubdivision !== 'number') return divisiones;
    const target = divisiones.find((d) => d.id === parentIdForSubdivision);
    if (!target) return divisiones;
    const rest = divisiones.filter((d) => d.id !== parentIdForSubdivision);
    return [target, ...rest];
  }, [divisiones, parentIdForSubdivision]);

  const deleteMutation = useMutation({
    mutationFn: async (item: CentroCostoListItem) => {
      if (typeof selectedNegocioId !== 'number') throw new Error('SIN_NEGOCIO: Negocio requerido');
      return apiJson<{ success: boolean }>(apiFetch, `/api/centros-costo/${item.id}`, {
        method: 'DELETE',
        negocioId: selectedNegocioId,
      });
    },
    onSuccess: async () => {
      if (typeof selectedNegocioId !== 'number') return;
      await queryClient.invalidateQueries({ queryKey: ['centrosCostoTree', selectedNegocioId] });
      await queryClient.invalidateQueries({ queryKey: ['centrosCosto', selectedNegocioId] });
      toast.success('Centro de costo eliminado', { duration: 2500 });
      setDeleteOpen(false);
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar', { duration: 5000 });
    },
  });

  const handleCrearDivision = () => {
    setEditItem(null);
    setParentIdForSubdivision(null);
    setDialogMode('division');
    setDialogOpen(true);
  };

  const handleEditDivision = (item: CentroCostoListItem) => {
    setEditItem(item);
    setParentIdForSubdivision(null);
    setDialogMode('division');
    setDialogOpen(true);
  };

  const handleAddSubdivision = (parentId: number) => {
    setEditItem(null);
    setParentIdForSubdivision(parentId);
    setDialogMode('subdivision');
    setDialogOpen(true);
  };

  const handleEditSubdivision = (item: CentroCostoListItem) => {
    setEditItem(item);
    setParentIdForSubdivision(item.padreId ?? null);
    setDialogMode('subdivision');
    setDialogOpen(true);
  };

  const handleDelete = (item: CentroCostoListItem) => {
    setDeleteTarget(item);
    setDeleteOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <LoadingSkeleton variant="card" rows={3} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto space-y-6 py-6">
      <PageHeader
        title="Divisiones"
        description="Gestiona las divisiones y sub-divisiones de tu negocio"
        action={
          canManage ? (
            <Button onClick={handleCrearDivision} disabled={typeof selectedNegocioId !== 'number'}>
              <Plus className="mr-2 h-4 w-4" /> Nueva División
            </Button>
          ) : null
        }
      />

      {typeof selectedNegocioId !== 'number' ? (
        <EmptyState
          icon={<Layers2 className="h-12 w-12 text-muted-foreground" />}
          title="Sin negocio seleccionado"
          description="Selecciona un negocio para gestionar sus divisiones."
        />
      ) : treeQuery.isLoading ? (
        <LoadingSkeleton variant="card" rows={3} />
      ) : treeQuery.error instanceof Error ? (
        <EmptyState
          icon={<Layers2 className="h-12 w-12 text-muted-foreground" />}
          title="No se pudieron cargar las divisiones"
          description={treeQuery.error.message}
          action={
            <Button variant="outline" onClick={() => treeQuery.refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : tree.length === 0 ? (
        <EmptyState
          icon={<Layers2 className="h-12 w-12 text-muted-foreground" />}
          title="Sin divisiones"
          description="Crea tu primera división para organizar los movimientos de este negocio."
          action={
            canManage ? (
              <Button onClick={handleCrearDivision}>
                <Plus className="mr-2 h-4 w-4" /> Nueva División
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {tree.map((division) => (
            <DivisionCard
              key={division.id}
              division={division}
              onEditDivision={handleEditDivision}
              onAddSubdivision={handleAddSubdivision}
              onEditSubdivision={handleEditSubdivision}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <CentroCostoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        editItem={editItem}
        negocioId={selectedNegocioId ?? 0}
        divisiones={orderedDivisiones}
        onSuccess={() => setDialogOpen(false)}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar centro de costo</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Se marcará como inactivo "${deleteTarget.nombre}". Esta acción no se puede deshacer.`
                : 'Selecciona un elemento'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteMutation.isPending}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending || !deleteTarget}
              onClick={async () => {
                if (!deleteTarget) return;
                await deleteMutation.mutateAsync(deleteTarget);
              }}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar eliminación'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
