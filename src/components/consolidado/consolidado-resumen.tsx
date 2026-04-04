'use client';

import * as React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ConsolidadoResumenGlobal } from '@/types/negocio.types';

export type ConsolidadoResumenProps = {
  resumen: ConsolidadoResumenGlobal;
  className?: string;
};

export function ConsolidadoResumen({ resumen, className }: ConsolidadoResumenProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      <Card className="border-border bg-card shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos (periodo)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-2xl font-semibold text-emerald-700">
            {typeof resumen.totalIngresos === 'number' && Number.isFinite(resumen.totalIngresos) ? formatCurrency(resumen.totalIngresos) : '—'}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Egresos (periodo)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-2xl font-semibold text-red-700">
            {typeof resumen.totalEgresos === 'number' && Number.isFinite(resumen.totalEgresos) ? formatCurrency(resumen.totalEgresos) : '—'}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Saldo neto (holding)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-2xl font-semibold">
            {typeof resumen.saldoNeto === 'number' && Number.isFinite(resumen.saldoNeto) ? formatCurrency(resumen.saldoNeto) : '—'}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Negocios activos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-2xl font-semibold">{resumen.negociosActivos}</div>
          <div className="mt-1 text-xs text-muted-foreground">Pendientes: {resumen.movimientosPendientes}</div>
        </CardContent>
      </Card>
    </div>
  );
}

