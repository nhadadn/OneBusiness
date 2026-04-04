'use client';

import * as React from 'react';
import { Check, CircleCheck, HandCoins, X } from 'lucide-react';
import { toast } from 'sonner';

import { EstadoBadge } from '@/components/movimientos/estado-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { MovimientosLoader } from '@/components/shared/page-loader';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import { useCancelarMovimiento, useMarcarPagado, useMovimientos, type MovimientoListItem } from '@/hooks/use-movimientos';
import type { TipoMovimiento } from '@/types/movimiento.types';

export type AprobacionTableProps = {
  negocioId: number | null;
  onNegocioChange: (id: number) => void;
  negocioOptions: { id: number; label: string }[];
  onSelectMovimiento?: (mov: MovimientoListItem) => void;
  onAprobar?: (mov: MovimientoListItem) => void;
  onRechazar?: (mov: MovimientoListItem) => void;
};

function parseMoney(raw: string) {
  const num = Number(raw);
  return Number.isFinite(num) && !Number.isNaN(num) ? num : 0;
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

export function AprobacionTable({
  negocioId,
  onNegocioChange,
  negocioOptions,
  onSelectMovimiento,
  onAprobar,
  onRechazar,
}: AprobacionTableProps) {
  const [page, setPage] = React.useState(1);
  const limit = 50;

  const [cancelarOpen, setCancelarOpen] = React.useState(false);
  const [cancelarTarget, setCancelarTarget] = React.useState<MovimientoListItem | null>(null);

  React.useEffect(() => {
    setPage(1);
  }, [negocioId]);

  const pendientesQuery = useMovimientos({
    negocioId: typeof negocioId === 'number' ? negocioId : undefined,
    estado: 'PENDIENTE',
    page,
    limit,
  });

  const aprobadosQuery = useMovimientos({
    negocioId: typeof negocioId === 'number' ? negocioId : undefined,
    estado: 'APROBADO',
    page,
    limit,
  });

  const marcarPagado = useMarcarPagado();
  const cancelarMovimiento = useCancelarMovimiento();

  const items = React.useMemo(() => {
    const all = [...(pendientesQuery.data?.items ?? []), ...(aprobadosQuery.data?.items ?? [])];
    all.sort((a, b) => b.fecha.localeCompare(a.fecha));
    return all;
  }, [aprobadosQuery.data?.items, pendientesQuery.data?.items]);

  const total = (pendientesQuery.data?.total ?? 0) + (aprobadosQuery.data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const canPrev = page > 1;
  const canNext = page < totalPages;

  if (typeof negocioId !== 'number') {
    return (
      <EmptyState
        icon={<CircleCheck className="h-12 w-12 text-muted-foreground" />}
        title="Sin negocio seleccionado"
        description="Selecciona un negocio para ver pendientes."
      />
    );
  }

  if (pendientesQuery.isLoading || aprobadosQuery.isLoading) {
    return <MovimientosLoader />;
  }

  if (pendientesQuery.error instanceof Error) {
    return <ErrorState message={pendientesQuery.error.message} onRetry={() => pendientesQuery.refetch()} />;
  }

  if (aprobadosQuery.error instanceof Error) {
    return <ErrorState message={aprobadosQuery.error.message} onRetry={() => aprobadosQuery.refetch()} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<CircleCheck className="h-12 w-12 text-muted-foreground" />}
        title="Todo al día"
        description="No hay movimientos pendientes ni aprobados por pagar."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Select value={String(negocioId)} onValueChange={(val) => onNegocioChange(Number(val))}>
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="Seleccionar negocio" />
          </SelectTrigger>
          <SelectContent>
            {negocioOptions.map((opt) => (
              <SelectItem key={opt.id} value={String(opt.id)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="text-sm text-muted-foreground">{`Página ${page} de ${totalPages}`}</div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Negocio</TableHead>
              <TableHead scope="col">Fecha</TableHead>
              <TableHead scope="col">Concepto</TableHead>
              <TableHead scope="col">Tipo</TableHead>
              <TableHead scope="col">Cuenta</TableHead>
              <TableHead scope="col" className="text-right">
                Monto
              </TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col" className="w-[120px]">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((mov) => {
              const monto = formatCurrency(parseMoney(mov.monto));
              const negocioLabel = negocioOptions.find((n) => n.id === mov.negocioId)?.label ?? `Negocio ${mov.negocioId}`;
              const isApproving = false;
              const isRejecting = false;
              const isPaying = marcarPagado.isPending;
              const isCanceling = cancelarMovimiento.isPending;
              const isBusy = isApproving || isRejecting || isPaying || isCanceling;
              return (
                <TableRow
                  key={mov.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => onSelectMovimiento?.(mov)}
                >
                  <TableCell className="whitespace-nowrap">{negocioLabel}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateDMY(mov.fecha)}</TableCell>
                  <TableCell className="font-medium">{mov.concepto}</TableCell>
                  <TableCell>{getTipoBadge(mov.tipo)}</TableCell>
                  <TableCell>{mov.cuentaBanco?.nombre ?? '—'}</TableCell>
                  <TableCell className="text-right font-mono">{monto}</TableCell>
                  <TableCell>
                    <EstadoBadge estado={mov.estado} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {mov.estado === 'PENDIENTE' ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => onAprobar?.(mov)} disabled={isBusy} aria-label="Aprobar">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => onRechazar?.(mov)} disabled={isBusy} aria-label="Rechazar">
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}

                      {mov.estado === 'APROBADO' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isBusy || typeof negocioId !== 'number'}
                          onClick={async () => {
                            if (typeof negocioId !== 'number') return;
                            try {
                              await marcarPagado.mutateAsync({ id: mov.id, negocioId });
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : 'No se pudo marcar como pagado', { duration: 5000 });
                            }
                          }}
                        >
                          <HandCoins className="mr-2 h-4 w-4" />
                          Marcar pagado
                        </Button>
                      ) : null}

                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isBusy}
                        onClick={() => {
                          setCancelarTarget(mov);
                          setCancelarOpen(true);
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={cancelarOpen} onOpenChange={setCancelarOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar movimiento</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelarTarget
                ? `Se cancelará "${cancelarTarget.concepto}". Si está PAGADO, se registrará una reversión para revertir el saldo.`
                : 'Selecciona un movimiento'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelarOpen(false)} disabled={cancelarMovimiento.isPending}>
              Volver
            </Button>
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-600/90"
              disabled={cancelarMovimiento.isPending || !cancelarTarget || typeof negocioId !== 'number'}
              onClick={async () => {
                if (!cancelarTarget) return;
                if (typeof negocioId !== 'number') return;
                try {
                  await cancelarMovimiento.mutateAsync({ id: cancelarTarget.id, negocioId });
                  setCancelarOpen(false);
                  setCancelarTarget(null);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'No se pudo cancelar el movimiento', { duration: 5000 });
                }
              }}
            >
              Confirmar cancelación
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!canPrev}>
          Anterior
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!canNext}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}
