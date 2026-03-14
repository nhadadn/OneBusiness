'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, ClipboardList, Eye, Loader2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { EstadoBadge } from '@/components/movimientos/estado-badge';
import { RechazoDialog } from '@/components/movimientos/rechazo-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { MovimientosLoader } from '@/components/shared/page-loader';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { useAprobarMovimiento, useDeleteMovimiento, useMovimientos, useRechazarMovimiento, type MovimientosFilters } from '@/hooks/use-movimientos';
import type { MovimientoListItem } from '@/hooks/use-movimientos';
import type { EstadoMovimiento, TipoMovimiento } from '@/types/movimiento.types';

export type MovimientosTableProps = {
  filters: MovimientosFilters;
  onAprobar?: (id: number) => void;
  onRechazar?: (id: number) => void;
};

function formatCurrencyMXN(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

function formatDateDMY(value: string) {
  const [y, m, d] = value.split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function getTipoBadge(tipo: TipoMovimiento) {
  if (tipo === 'INGRESO') {
    return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Ingreso</Badge>;
  }
  if (tipo === 'EGRESO') {
    return <Badge className="border-red-200 bg-red-50 text-red-700">Egreso</Badge>;
  }
  return <Badge className="border-sky-200 bg-sky-50 text-sky-700">Traspaso</Badge>;
}

function parseMoney(raw: string) {
  const num = Number(raw);
  return Number.isFinite(num) && !Number.isNaN(num) ? num : 0;
}

function getFiltersKey(filters: MovimientosFilters) {
  return [
    filters.negocioId ?? 'none',
    filters.estado ?? 'all',
    filters.tipo ?? 'all',
    filters.fechaDesde ?? '',
    filters.fechaHasta ?? '',
    filters.cuentaBancoId ?? '',
  ].join('|');
}

export function MovimientosTable({ filters, onAprobar, onRechazar }: MovimientosTableProps) {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = user?.rol === 'Dueño' || user?.rol === 'Admin';
  const negocioId = filters.negocioId;

  const [page, setPage] = React.useState(filters.page ?? 1);
  const limit = 50;

  const filtersKey = React.useMemo(() => getFiltersKey(filters), [filters]);
  React.useEffect(() => {
    setPage(1);
  }, [filtersKey]);

  const query = useMovimientos({ ...filters, page, limit });
  const aprobar = useAprobarMovimiento();
  const rechazar = useRechazarMovimiento();
  const eliminar = useDeleteMovimiento();
  const [action, setAction] = React.useState<{ id: number; type: 'aprobar' | 'rechazar' | 'eliminar' } | null>(null);
  const [actionError, setActionError] = React.useState<Record<number, string | null>>({});
  const [optimisticEstado, setOptimisticEstado] = React.useState<Record<number, EstadoMovimiento>>({});
  const [rechazoOpen, setRechazoOpen] = React.useState(false);
  const [rechazoTarget, setRechazoTarget] = React.useState<MovimientoListItem | null>(null);
  const [eliminarOpen, setEliminarOpen] = React.useState(false);
  const [eliminarTarget, setEliminarTarget] = React.useState<MovimientoListItem | null>(null);

  const data = query.data;
  const items = React.useMemo(() => {
    const base = data?.items ?? [];
    return base
      .map((mov) => {
        const nextEstado = optimisticEstado[mov.id];
        return nextEstado ? { ...mov, estado: nextEstado } : mov;
      })
      .filter((mov) => (filters.estado ? mov.estado === filters.estado : true));
  }, [data?.items, filters.estado, optimisticEstado]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const canPrev = page > 1;
  const canNext = page < totalPages;

  React.useEffect(() => {
    const handler = () => {
      query.refetch();
    };
    window.addEventListener('onebusiness:movimientos-refresh', handler as EventListener);
    return () => window.removeEventListener('onebusiness:movimientos-refresh', handler as EventListener);
  }, [query]);

  const handleApprove = async (mov: MovimientoListItem) => {
    if (onAprobar) {
      onAprobar(mov.id);
      return;
    }
    if (typeof negocioId !== 'number') return;
    setAction({ id: mov.id, type: 'aprobar' });
    setActionError((prev) => ({ ...prev, [mov.id]: null }));
    try {
      await aprobar.mutateAsync({ id: mov.id, negocioId });
      setOptimisticEstado((prev) => ({ ...prev, [mov.id]: 'APROBADO' }));
      window.dispatchEvent(new CustomEvent('onebusiness:pending-count-refresh'));
      toast.success('Movimiento aprobado', { duration: 2500 });
    } catch (e) {
      setActionError((prev) => ({
        ...prev,
        [mov.id]: e instanceof Error ? e.message : 'No se pudo aprobar el movimiento',
      }));
      toast.error(e instanceof Error ? e.message : 'No se pudo aprobar el movimiento', { duration: 5000 });
    } finally {
      setAction((prev) => (prev?.id === mov.id ? null : prev));
    }
  };

  const handleReject = async (mov: MovimientoListItem) => {
    if (onRechazar) {
      onRechazar(mov.id);
      return;
    }
    setRechazoTarget(mov);
    setRechazoOpen(true);
  };

  const handleDelete = async (mov: MovimientoListItem) => {
    if (typeof negocioId !== 'number') return;
    setEliminarTarget(mov);
    setEliminarOpen(true);
  };

  if (typeof negocioId !== 'number') {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Sin negocio seleccionado"
        description="Selecciona un negocio para ver movimientos."
      />
    );
  }

  if (query.isLoading) {
    return <MovimientosLoader />;
  }

  if (query.error instanceof Error) {
    return <ErrorState message={query.error.message} onRetry={() => query.refetch()} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Sin movimientos"
        description="Crea el primer movimiento para empezar a registrar las finanzas de este negocio."
        action={{
          label: 'Nuevo movimiento',
          onClick: () => window.dispatchEvent(new CustomEvent('onebusiness:new-movimiento-open')),
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cuenta</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado por</TableHead>
              <TableHead className="w-[220px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((mov) => {
              const monto = formatCurrencyMXN(parseMoney(mov.monto));
              const canApproveReject = canManage && mov.estado === 'PENDIENTE';
              const isApproving = action?.type === 'aprobar' && action.id === mov.id;
              const isRejecting = action?.type === 'rechazar' && action.id === mov.id;
              const isDeleting = action?.type === 'eliminar' && action.id === mov.id;
              const error = actionError[mov.id];
              return (
                <TableRow key={mov.id}>
                  <TableCell className="whitespace-nowrap">{formatDateDMY(mov.fecha)}</TableCell>
                  <TableCell className="font-medium">{mov.concepto}</TableCell>
                  <TableCell>{getTipoBadge(mov.tipo)}</TableCell>
                  <TableCell className="text-slate-700">{mov.cuentaBanco?.nombre ?? '—'}</TableCell>
                  <TableCell className="text-right font-mono">{monto}</TableCell>
                  <TableCell>
                    <EstadoBadge estado={mov.estado} />
                  </TableCell>
                  <TableCell className="text-slate-700">{mov.creadoPor?.nombre ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {canApproveReject && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleApprove(mov)}
                          disabled={isApproving || isRejecting || isDeleting}
                          aria-label="Aprobar"
                          className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                      )}
                      {canApproveReject && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReject(mov)}
                          disabled={isApproving || isRejecting || isDeleting}
                          aria-label="Rechazar"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => router.push(`/movimientos/${mov.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canManage && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(mov)}
                          disabled={isApproving || isRejecting || isDeleting}
                          aria-label="Eliminar"
                          className="text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                    {error ? <div className="mt-2 text-xs text-red-600">{error}</div> : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!canPrev}>
          Anterior
        </Button>
        <div className="text-sm text-slate-600">{`Página ${page} de ${totalPages}`}</div>
        <Button type="button" variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!canNext}>
          Siguiente
        </Button>
      </div>

      <RechazoDialog
        open={rechazoOpen}
        onOpenChange={setRechazoOpen}
        movimiento={rechazoTarget}
        isPending={rechazar.isPending}
        onConfirm={async (motivoRechazo) => {
          if (!rechazoTarget) return;
          if (typeof negocioId !== 'number') return;
          const id = rechazoTarget.id;
          setAction({ id, type: 'rechazar' });
          setActionError((prev) => ({ ...prev, [id]: null }));
          try {
            await rechazar.mutateAsync({ id, motivoRechazo, negocioId });
            setRechazoOpen(false);
            setOptimisticEstado((prev) => ({ ...prev, [id]: 'RECHAZADO' }));
            window.dispatchEvent(new CustomEvent('onebusiness:pending-count-refresh'));
            toast.success('Movimiento rechazado', { duration: 2500 });
          } catch (e) {
            setActionError((prev) => ({
              ...prev,
              [id]: e instanceof Error ? e.message : 'No se pudo rechazar el movimiento',
            }));
            toast.error(e instanceof Error ? e.message : 'No se pudo rechazar el movimiento', { duration: 5000 });
          } finally {
            setAction((prev) => (prev?.id === id ? null : prev));
          }
        }}
      />

      <AlertDialog open={eliminarOpen} onOpenChange={setEliminarOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar movimiento</AlertDialogTitle>
            <AlertDialogDescription>
              {eliminarTarget ? `Se eliminará "${eliminarTarget.concepto}". Esta acción no se puede deshacer.` : 'Selecciona un movimiento'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setEliminarOpen(false)} disabled={eliminar.isPending}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-600/90"
              disabled={eliminar.isPending || !eliminarTarget}
              onClick={async () => {
                if (!eliminarTarget) return;
                if (typeof negocioId !== 'number') return;
                const id = eliminarTarget.id;
                setAction({ id, type: 'eliminar' });
                setActionError((prev) => ({ ...prev, [id]: null }));
                try {
                  await eliminar.mutateAsync({ id, negocioId });
                  setEliminarOpen(false);
                  window.dispatchEvent(new CustomEvent('onebusiness:pending-count-refresh'));
                  toast.success('Movimiento eliminado', { duration: 2500 });
                } catch (e) {
                  setActionError((prev) => ({
                    ...prev,
                    [id]: e instanceof Error ? e.message : 'No se pudo eliminar el movimiento',
                  }));
                  toast.error(e instanceof Error ? e.message : 'No se pudo eliminar el movimiento', { duration: 5000 });
                } finally {
                  setAction((prev) => (prev?.id === id ? null : prev));
                }
              }}
            >
              Eliminar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
