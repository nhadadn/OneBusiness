'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ArqueoNegocio, EstadoArqueo } from '@/types/cuenta_banco.types';

function formatInteger(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(value);
}

function parseMoney(value: string | null | undefined): number {
  const parsed = Number.parseFloat(value ?? '0');
  return Number.isFinite(parsed) ? parsed : 0;
}

function getStatusVariant(estadoArqueo: EstadoArqueo) {
  switch (estadoArqueo) {
    case 'CUADRADO':
      return { label: 'Cuadrado', className: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50' };
    case 'SOBRANTE':
      return { label: 'Sobrante', className: 'bg-amber-50 text-amber-800 hover:bg-amber-50' };
    case 'FALTANTE':
      return { label: 'Faltante', className: 'bg-red-50 text-red-700 hover:bg-red-50' };
    case 'SIN_SALDO_REAL':
      return { label: 'Sin saldo real', className: 'bg-slate-50 text-slate-700 hover:bg-slate-50' };
  }
}

export type ArqueoSummaryProps = {
  arqueo: ArqueoNegocio;
  className?: string;
};

export function ArqueoSummary({ arqueo, className }: ArqueoSummaryProps) {
  const status = React.useMemo(() => getStatusVariant(arqueo.totales.estadoArqueo), [arqueo.totales.estadoArqueo]);
  const diffClassName =
    arqueo.totales.estadoArqueo === 'FALTANTE'
      ? 'text-red-700'
      : arqueo.totales.estadoArqueo === 'SOBRANTE'
        ? 'text-amber-800'
        : 'text-foreground';

  const totalComprometido = React.useMemo(() => {
    return arqueo.cuentas.reduce((acc, c) => acc + parseMoney(c.totalAprobadoNoPagado), 0);
  }, [arqueo.cuentas]);

  return (
    <Card className={cn('border-border bg-card shadow-none', className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Resumen de arqueo</CardTitle>
            <div className="text-sm text-muted-foreground">Fecha de corte: {arqueo.fechaCorte}</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
            {arqueo.totales.cuentasSinSaldoReal > 0 ? (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50">
                {formatInteger(arqueo.totales.cuentasSinSaldoReal)} sin saldo real
              </Badge>
            ) : null}
            {arqueo.totales.movimientosPendientes > 0 ? (
              <Badge variant="outline" className="bg-slate-50 text-slate-700 hover:bg-slate-50">
                {formatInteger(arqueo.totales.movimientosPendientes)} pendientes
              </Badge>
            ) : null}
            {Math.abs(totalComprometido) > 0.000001 ? (
              <Badge variant="outline" className="bg-amber-50 text-amber-800 hover:bg-amber-50">
                {formatCurrency(totalComprometido)} comprometido
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-md border border-border p-3">
            <div className="text-xs text-muted-foreground">Saldo inicial</div>
            <div className="mt-1 font-mono text-base">
              {typeof arqueo.totales.saldoInicial === 'number' && Number.isFinite(arqueo.totales.saldoInicial)
                ? formatCurrency(arqueo.totales.saldoInicial)
                : '—'}
            </div>
          </div>
          <div className="rounded-md border border-border p-3">
            <div className="text-xs text-muted-foreground">Ingreso (aprobado)</div>
            <div className="mt-1 font-mono text-base text-emerald-700">
              {typeof arqueo.totales.ingreso === 'number' && Number.isFinite(arqueo.totales.ingreso)
                ? formatCurrency(arqueo.totales.ingreso)
                : '—'}
            </div>
          </div>
          <div className="rounded-md border border-border p-3">
            <div className="text-xs text-muted-foreground">Traspaso entrada (aprobado)</div>
            <div className="mt-1 font-mono text-base text-emerald-700">
              {typeof arqueo.totales.traspasoEntrada === 'number' && Number.isFinite(arqueo.totales.traspasoEntrada)
                ? formatCurrency(arqueo.totales.traspasoEntrada)
                : '—'}
            </div>
          </div>
          <div className="rounded-md border border-border p-3">
            <div className="text-xs text-muted-foreground">Egreso (aprobado)</div>
            <div className="mt-1 font-mono text-base text-red-700">
              {typeof arqueo.totales.egreso === 'number' && Number.isFinite(arqueo.totales.egreso)
                ? formatCurrency(arqueo.totales.egreso)
                : '—'}
            </div>
          </div>
          <div className="rounded-md border border-border p-3">
            <div className="text-xs text-muted-foreground">Traspaso salida (aprobado)</div>
            <div className="mt-1 font-mono text-base text-red-700">
              {typeof arqueo.totales.traspasoSalida === 'number' && Number.isFinite(arqueo.totales.traspasoSalida)
                ? formatCurrency(arqueo.totales.traspasoSalida)
                : '—'}
            </div>
          </div>
          <div className="rounded-md border border-border p-3">
            <div className="text-xs text-muted-foreground">Saldo calculado</div>
            <div className="mt-1 font-mono text-base">
              {typeof arqueo.totales.saldoCalculado === 'number' && Number.isFinite(arqueo.totales.saldoCalculado)
                ? formatCurrency(arqueo.totales.saldoCalculado)
                : '—'}
            </div>
          </div>
          <div className="rounded-md border border-border p-3">
            <div className="text-xs text-muted-foreground">Saldo real</div>
            <div className="mt-1 font-mono text-base">
              {typeof arqueo.totales.saldoReal === 'number' && Number.isFinite(arqueo.totales.saldoReal)
                ? formatCurrency(arqueo.totales.saldoReal)
                : '—'}
            </div>
          </div>
          <div className="rounded-md border border-border p-3">
            <div className="text-xs text-muted-foreground">Diferencia</div>
            <div className={cn('mt-1 font-mono text-base', diffClassName)}>
              {typeof arqueo.totales.diferencia === 'number' && Number.isFinite(arqueo.totales.diferencia)
                ? formatCurrency(arqueo.totales.diferencia)
                : '—'}
            </div>
          </div>
          {Math.abs(totalComprometido) > 0.000001 ? (
            <div className="rounded-md border border-border p-3">
              <div className="text-xs text-muted-foreground">Comprometido (aprobado no pagado)</div>
              <div className="mt-1 font-mono text-base text-amber-800">{formatCurrency(totalComprometido)}</div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

