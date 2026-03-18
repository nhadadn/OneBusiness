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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/use-auth';
import { useAprobarMovimiento, useDeleteMovimiento, useMovimientos, useRechazarMovimiento, type MovimientosFilters } from '@/hooks/use-movimientos';
import type { MovimientoListItem } from '@/hooks/use-movimientos';
import type { EstadoMovimiento, TipoMovimiento } from '@/types/movimiento.types';

export type MovimientosTableProps = {
  filters: MovimientosFilters;
  search?: string;
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

function getTraspasoBadge(traspasoId: number) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Badge className="border-slate-200 bg-white text-slate-700">Traspaso</Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent>Traspaso vinculado con movimiento #{traspasoId}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function parseMoney(raw: string) {
  const num = Number(raw);
  return Number.isFinite(num) && !Number.isNaN(num) ? num : 0;
}

function getFiltersKey(filters: MovimientosFilters, search: string | undefined) {
  return [
    filters.negocioId ?? 'none',
    filters.estado ?? 'all',
    filters.tipo ?? 'all',
    filters.fechaDesde ?? '',
    filters.fechaHasta ?? '',
    filters.cuentaBancoId ?? '',
    search ?? '',
  ].join('|');
}

export function useMovimientoInlineModeration({
  negocioId,
  onAprobar,
  onRechazar,
}: {
  negocioId: number | undefined;
  onAprobar?: (id: number) => void;
  onRechazar?: (id: number) => void;
}) {
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
      setOptimisticEstado((prev) => ({
        ...prev,
        [mov.id]: 'APROBADO',
        ...(typeof mov.traspasoRefId === 'number' ? { [mov.traspasoRefId]: 'APROBADO' } : {}),
      }));
      window.dispatchEvent(new CustomEvent('onebusiness:pending-count-refresh'));
      if (typeof mov.traspasoRefId === 'number') {
        toast.success('Traspaso aprobado — 2 movimientos actualizados', { duration: 2500 });
      } else {
        toast.success('Movimiento aprobado', { duration: 2500 });
      }
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

  const dialogs = (
    <>
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
            setOptimisticEstado((prev) => ({
              ...prev,
              [id]: 'RECHAZADO',
              ...(typeof rechazoTarget.traspasoRefId === 'number' ? { [rechazoTarget.traspasoRefId]: 'RECHAZADO' } : {}),
            }));
            window.dispatchEvent(new CustomEvent('onebusiness:pending-count-refresh'));
            if (typeof rechazoTarget.traspasoRefId === 'number') {
              toast.success('Traspaso rechazado — 2 movimientos actualizados', { duration: 2500 });
            } else {
              toast.success('Movimiento rechazado', { duration: 2500 });
            }
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
    </>
  );

  return {
    aprobar,
    rechazar,
    eliminar,
    action,
    actionError,
    optimisticEstado,
    handleApprove,
    handleReject,
    handleDelete,
    dialogs,
  };
}

function getVisiblePages(page: number, totalPages: number) {
  const maxButtons = 5;
  if (totalPages <= maxButtons) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const half = Math.floor(maxButtons / 2);
  let start = Math.max(1, page - half);
  const end = Math.min(totalPages, start + maxButtons - 1);
  start = Math.max(1, end - maxButtons + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function MovimientosTable({ filters, search, onAprobar, onRechazar }: MovimientosTableProps) {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = user?.rol === 'Dueño' || user?.rol === 'Admin';
  const negocioId = filters.negocioId;

  const [page, setPage] = React.useState(filters.page ?? 1);
  const limit = typeof filters.limit === 'number' ? filters.limit : 20;

  const filtersKey = React.useMemo(() => getFiltersKey(filters, search), [filters, search]);
  React.useEffect(() => {
    setPage(1);
  }, [filtersKey]);

  const query = useMovimientos({ ...filters, page, limit });
  const moderation = useMovimientoInlineModeration({
    negocioId: typeof negocioId === 'number' ? negocioId : undefined,
    onAprobar,
    onRechazar,
  });

  const data = query.data;
  const items = React.useMemo(() => {
    const base = data?.items ?? [];
    const normalized = base
      .map((mov) => {
        const nextEstado = moderation.optimisticEstado[mov.id];
        return nextEstado ? { ...mov, estado: nextEstado } : mov;
      })
      .filter((mov) => (filters.estado ? mov.estado === filters.estado : true));
    if (!search?.trim()) return normalized;
    const needle = search.trim().toLowerCase();
    return normalized.filter((mov) => mov.concepto.toLowerCase().includes(needle));
  }, [data?.items, filters.estado, moderation.optimisticEstado, search]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const resumen = React.useMemo(() => {
    return items.reduce(
      (acc, mov) => {
        const amount = parseMoney(mov.monto);
        if (mov.tipo === 'INGRESO') acc.ingresos += amount;
        if (mov.tipo === 'EGRESO') acc.egresos += amount;
        acc.balance = acc.ingresos - acc.egresos;
        return acc;
      },
      { ingresos: 0, egresos: 0, balance: 0 }
    );
  }, [items]);

  React.useEffect(() => {
    const handler = () => {
      query.refetch();
    };
    window.addEventListener('onebusiness:movimientos-refresh', handler as EventListener);
    return () => window.removeEventListener('onebusiness:movimientos-refresh', handler as EventListener);
  }, [query]);

  React.useEffect(() => {
    query.refetch();
  }, [query, search]);

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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-xs text-muted-foreground">Total ingresos</div>
          <div className="mt-1 font-mono text-base text-emerald-700">{formatCurrencyMXN(resumen.ingresos)}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-xs text-muted-foreground">Total egresos</div>
          <div className="mt-1 font-mono text-base text-red-700">{formatCurrencyMXN(resumen.egresos)}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-xs text-muted-foreground">Balance</div>
          <div className="mt-1 font-mono text-base">{formatCurrencyMXN(resumen.balance)}</div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Cuenta bancaria</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[220px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((mov) => {
              const monto = formatCurrencyMXN(parseMoney(mov.monto));
              const canApproveReject = canManage && mov.estado === 'PENDIENTE';
              const isApproving = moderation.action?.type === 'aprobar' && moderation.action.id === mov.id;
              const isRejecting = moderation.action?.type === 'rechazar' && moderation.action.id === mov.id;
              const isDeleting = moderation.action?.type === 'eliminar' && moderation.action.id === mov.id;
              const error = moderation.actionError[mov.id];
              return (
                <TableRow key={mov.id}>
                  <TableCell className="whitespace-nowrap">{formatDateDMY(mov.fecha)}</TableCell>
                  <TableCell className="font-medium">{mov.concepto}</TableCell>
                  <TableCell className="text-slate-700">{mov.tercero ?? '—'}</TableCell>
                  <TableCell className="text-slate-700">{mov.cuentaBanco?.nombre ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      {getTipoBadge(mov.tipo)}
                      {typeof mov.traspasoRefId === 'number' ? getTraspasoBadge(mov.traspasoRefId) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">{monto}</TableCell>
                  <TableCell>
                    <EstadoBadge estado={mov.estado} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {canApproveReject && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moderation.handleApprove(mov)}
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
                          onClick={() => moderation.handleReject(mov)}
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
                          onClick={() => moderation.handleDelete(mov)}
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">
          {total > 0 ? `Mostrando ${(page - 1) * limit + 1}-${Math.min(page * limit, total)} de ${total} movimientos` : 'Mostrando 0 movimientos'}
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!canPrev}>
            Anterior
          </Button>
          {getVisiblePages(page, totalPages).map((p) => (
            <Button key={p} type="button" variant={p === page ? 'default' : 'outline'} size="sm" onClick={() => setPage(p)}>
              {p}
            </Button>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!canNext}>
            Siguiente
          </Button>
        </div>

        <div className="text-sm text-slate-600">{`Página ${page} de ${totalPages}`}</div>
      </div>

      {moderation.dialogs}
    </div>
  );
}
