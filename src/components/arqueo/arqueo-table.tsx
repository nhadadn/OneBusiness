'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ArqueoNegocio, EstadoArqueo } from '@/types/cuenta_banco.types';

type ArqueoCuentaItem = ArqueoNegocio['cuentas'][number];

function parseMoney(value: string | null | undefined): number {
  const parsed = Number.parseFloat(value ?? '0');
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateLabel(value: string | null): string | null {
  if (!value) return null;
  const onlyDate = value.includes('T') ? value.split('T')[0] : value;
  return onlyDate || null;
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
      return { label: 'Sin saldo real', className: 'bg-muted text-foreground hover:bg-muted' };
  }
}

export type ArqueoTableProps = {
  cuentas: ArqueoCuentaItem[];
  className?: string;
};

export function ArqueoTable({ cuentas, className }: ArqueoTableProps) {
  return (
    <Card className={cn('border-border bg-card shadow-none', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Detalle por cuenta</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Cuenta</TableHead>
                <TableHead scope="col">Tipo</TableHead>
                <TableHead scope="col">Estado</TableHead>
                <TableHead scope="col" className="text-right">
                  Saldo inicial
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Ingreso
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Trasp. ent.
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Egreso
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Trasp. sal.
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Saldo calculado
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Saldo real
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Diferencia
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Pendientes
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Comprometidos
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cuentas.map((c) => {
                const status = getStatusVariant(c.estadoArqueo);
                const diffClassName =
                  c.estadoArqueo === 'FALTANTE'
                    ? 'text-red-700'
                    : c.estadoArqueo === 'SOBRANTE'
                      ? 'text-amber-800'
                      : 'text-foreground';
                const fechaSaldoRealLabel = formatDateLabel(c.fechaSaldoReal);
                const totalAprobadoNoPagado = parseMoney(c.totalAprobadoNoPagado);

                return (
                  <TableRow key={c.cuentaBancoId}>
                    <TableCell className="min-w-[220px]">
                      <div className="font-medium">{c.nombre}</div>
                      {fechaSaldoRealLabel ? (
                        <div className="mt-0.5 text-xs text-muted-foreground">Saldo real al: {fechaSaldoRealLabel}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{c.tipo}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="outline" className={status.className}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {typeof c.saldoInicial === 'number' && Number.isFinite(c.saldoInicial) ? formatCurrency(c.saldoInicial) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-emerald-700">
                      {typeof c.ingreso === 'number' && Number.isFinite(c.ingreso) ? formatCurrency(c.ingreso) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-emerald-700">
                      {typeof c.traspasoEntrada === 'number' && Number.isFinite(c.traspasoEntrada)
                        ? formatCurrency(c.traspasoEntrada)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-700">
                      {typeof c.egreso === 'number' && Number.isFinite(c.egreso) ? formatCurrency(c.egreso) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-700">
                      {typeof c.traspasoSalida === 'number' && Number.isFinite(c.traspasoSalida)
                        ? formatCurrency(c.traspasoSalida)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {typeof c.saldoCalculado === 'number' && Number.isFinite(c.saldoCalculado) ? formatCurrency(c.saldoCalculado) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {typeof c.saldoReal === 'number' && Number.isFinite(c.saldoReal) ? formatCurrency(c.saldoReal) : '—'}
                    </TableCell>
                    <TableCell className={cn('text-right font-mono', diffClassName)}>
                      {typeof c.diferencia === 'number' && Number.isFinite(c.diferencia) ? formatCurrency(c.diferencia) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.movimientosPendientes > 0 ? (
                        <Badge variant="outline" className="bg-muted text-foreground hover:bg-muted">
                          {c.movimientosPendientes}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.movimientosAprobadosNoPagados > 0 ? (
                        <span className="text-sm font-medium text-warning-foreground">{`${c.movimientosAprobadosNoPagados} comprometidos (${formatCurrency(totalAprobadoNoPagado)})`}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

