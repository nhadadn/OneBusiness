'use client';

import * as React from 'react';
import { Check, CircleCheck, X } from 'lucide-react';

import { EstadoBadge } from '@/components/movimientos/estado-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { MovimientosLoader } from '@/components/shared/page-loader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMovimientos, type MovimientoListItem } from '@/hooks/use-movimientos';
import type { TipoMovimiento } from '@/types/movimiento.types';

export type AprobacionTableProps = {
  negocioId: number | null;
  onNegocioChange: (id: number) => void;
  negocioOptions: { id: number; label: string }[];
  onSelectMovimiento?: (mov: MovimientoListItem) => void;
  onAprobar?: (mov: MovimientoListItem) => void;
  onRechazar?: (mov: MovimientoListItem) => void;
};

function formatCurrencyMXN(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

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

  React.useEffect(() => {
    setPage(1);
  }, [negocioId]);

  const query = useMovimientos({
    negocioId: typeof negocioId === 'number' ? negocioId : undefined,
    estado: 'PENDIENTE',
    page,
    limit,
  });

  const data = query.data;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const canPrev = page > 1;
  const canNext = page < totalPages;

  if (typeof negocioId !== 'number') {
    return (
      <EmptyState icon={CircleCheck} title="Sin negocio seleccionado" description="Selecciona un negocio para ver pendientes." />
    );
  }

  if (query.isLoading) {
    return <MovimientosLoader />;
  }

  if (query.error instanceof Error) {
    return <ErrorState message={query.error.message} onRetry={() => query.refetch()} />;
  }

  if (items.length === 0) {
    return <EmptyState icon={CircleCheck} title="Todo al día" description="No hay movimientos pendientes de aprobación." />;
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

        <div className="text-sm text-slate-600">{`Página ${page} de ${totalPages}`}</div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Negocio</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cuenta</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((mov) => {
              const monto = formatCurrencyMXN(parseMoney(mov.monto));
              const negocioLabel = negocioOptions.find((n) => n.id === mov.negocioId)?.label ?? `Negocio ${mov.negocioId}`;
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
                      <Button size="sm" variant="ghost" onClick={() => onAprobar?.(mov)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onRechazar?.(mov)}>
                        <X className="h-4 w-4" />
                      </Button>
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
        <Button type="button" variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!canNext}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}
