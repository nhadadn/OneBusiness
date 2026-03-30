'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { ArqueoNegocio, EstadoArqueo } from '@/types/cuenta_banco.types';

type ArqueoCuentaItem = ArqueoNegocio['cuentas'][number];

function formatCurrencyMXN(value: number | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
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
      return { label: 'Sin saldo real', className: 'bg-slate-50 text-slate-700 hover:bg-slate-50' };
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
                <TableHead>Cuenta</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Saldo inicial</TableHead>
                <TableHead className="text-right">Ingreso</TableHead>
                <TableHead className="text-right">Trasp. ent.</TableHead>
                <TableHead className="text-right">Egreso</TableHead>
                <TableHead className="text-right">Trasp. sal.</TableHead>
                <TableHead className="text-right">Saldo calculado</TableHead>
                <TableHead className="text-right">Saldo real</TableHead>
                <TableHead className="text-right">Diferencia</TableHead>
                <TableHead className="text-right">Pendientes</TableHead>
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
                    <TableCell className="text-right font-mono">{formatCurrencyMXN(c.saldoInicial)}</TableCell>
                    <TableCell className="text-right font-mono text-emerald-700">{formatCurrencyMXN(c.ingreso)}</TableCell>
                    <TableCell className="text-right font-mono text-emerald-700">{formatCurrencyMXN(c.traspasoEntrada)}</TableCell>
                    <TableCell className="text-right font-mono text-red-700">{formatCurrencyMXN(c.egreso)}</TableCell>
                    <TableCell className="text-right font-mono text-red-700">{formatCurrencyMXN(c.traspasoSalida)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrencyMXN(c.saldoCalculado)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrencyMXN(c.saldoReal)}</TableCell>
                    <TableCell className={cn('text-right font-mono', diffClassName)}>
                      {formatCurrencyMXN(c.diferencia)}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.movimientosPendientes > 0 ? (
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 hover:bg-slate-50">
                          {c.movimientosPendientes}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
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

