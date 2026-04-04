'use client';

import * as React from 'react';

import { EstadoBadge } from '@/components/movimientos/estado-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatCurrency } from '@/lib/format';
import { useMovimientoDetalle } from '@/hooks/use-movimientos';
import type { MovimientoDetalle } from '@/hooks/use-movimientos';
import type { TipoMovimiento } from '@/types/movimiento.types';

export type MovimientoDetalleSheetProps = {
  movimientoId: number | null;
  negocioId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAprobar?: () => void;
  onRechazar?: () => void;
  canManage: boolean;
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

function getNombreUsuario(value: { nombre?: string | null; email?: string | null } | null | undefined) {
  if (!value) return '—';
  if (value.nombre?.trim()) return value.nombre;
  if (value.email?.trim()) return value.email;
  return '—';
}

function getLine(label: string, value: React.ReactNode) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-right text-sm text-foreground">{value}</div>
    </div>
  );
}

export function MovimientoDetalleSheet({
  movimientoId,
  negocioId,
  open,
  onOpenChange,
  onAprobar,
  onRechazar,
  canManage,
}: MovimientoDetalleSheetProps) {
  const query = useMovimientoDetalle(movimientoId, negocioId);
  const movimiento: MovimientoDetalle | null = query.data?.data ?? null;

  const showActions = canManage && movimiento?.estado === 'PENDIENTE';
  const monto = movimiento ? formatCurrency(parseMoney(movimiento.monto)) : '';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="pr-8">{movimiento?.concepto ?? 'Detalle del movimiento'}</SheetTitle>
        </SheetHeader>

        {query.isLoading && <div className="mt-4 text-sm text-muted-foreground">Cargando...</div>}
        {query.error instanceof Error && <div className="mt-4 text-sm text-red-600">{query.error.message}</div>}

        {movimiento && (
          <div className="mt-4 space-y-6">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{`Negocio ${movimiento.negocioId}`}</Badge>
                {getTipoBadge(movimiento.tipo)}
                <EstadoBadge estado={movimiento.estado} />
              </div>

              <div className="mt-4 text-3xl font-bold text-foreground">{monto}</div>

              <div className="mt-4 space-y-2">
                {getLine('Fecha', formatDateDMY(movimiento.fecha))}
                {getLine('Cuenta bancaria', movimiento.cuentaBanco?.nombre ?? '—')}
                {getLine('Tercero', movimiento.tercero ?? '—')}
                {typeof movimiento.centroCostoId === 'number' ? getLine('Centro de costo', movimiento.centroCostoId) : null}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="text-sm font-semibold text-foreground">Trazabilidad</div>
              {getLine('Creado por', getNombreUsuario(movimiento.creadoPor))}
              {getLine('Creado', movimiento.createdAt)}

              {movimiento.aprobadoPor && movimiento.fechaAprobacion ? (
                <>
                  {getLine('Aprobado/Rechazado por', getNombreUsuario(movimiento.aprobadoPor))}
                  {getLine('Fecha', movimiento.fechaAprobacion)}
                </>
              ) : null}

              {movimiento.motivoRechazo ? <div className="text-sm text-red-600">{movimiento.motivoRechazo}</div> : null}
            </div>

            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              {getLine('Versión', movimiento.version)}
              {getLine('Traspaso ref', movimiento.traspasoRefId ?? '—')}
            </div>
          </div>
        )}

        {showActions && (
          <SheetFooter className="mt-6">
            <Button
              className="bg-emerald-600 hover:bg-emerald-600/90"
              onClick={() => onAprobar?.()}
              disabled={query.isLoading}
            >
              Aprobar
            </Button>
            <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => onRechazar?.()}>
              Rechazar
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
