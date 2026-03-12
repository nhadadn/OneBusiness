'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, Eye, Trash2, X } from 'lucide-react';

import { EstadoBadge } from '@/components/movimientos/estado-badge';
import { RechazoDialog } from '@/components/movimientos/rechazo-dialog';
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
import type { TipoMovimiento } from '@/types/movimiento.types';

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
  const [rechazoOpen, setRechazoOpen] = React.useState(false);
  const [rechazoTarget, setRechazoTarget] = React.useState<MovimientoListItem | null>(null);
  const [eliminarOpen, setEliminarOpen] = React.useState(false);
  const [eliminarTarget, setEliminarTarget] = React.useState<MovimientoListItem | null>(null);

  const data = query.data;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const handleApprove = async (mov: MovimientoListItem) => {
    if (onAprobar) {
      onAprobar(mov.id);
      return;
    }
    if (typeof negocioId !== 'number') return;
    await aprobar.mutateAsync({ id: mov.id, negocioId });
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
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Selecciona un negocio para ver movimientos.
      </div>
    );
  }

  if (query.isLoading) {
    return <div className="text-sm text-slate-600">Cargando...</div>;
  }

  if (query.error instanceof Error) {
    return <div className="text-sm text-red-600">{query.error.message}</div>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
        No hay movimientos para mostrar.
      </div>
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
                        <Button size="sm" variant="ghost" onClick={() => handleApprove(mov)} disabled={aprobar.isPending}>
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      {canApproveReject && (
                        <Button size="sm" variant="ghost" onClick={() => handleReject(mov)} disabled={rechazar.isPending}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => router.push(`/movimientos/${mov.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canManage && (
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(mov)} disabled={eliminar.isPending}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
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
          await rechazar.mutateAsync({ id: rechazoTarget.id, motivoRechazo, negocioId });
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
                await eliminar.mutateAsync({ id: eliminarTarget.id, negocioId });
                setEliminarOpen(false);
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
