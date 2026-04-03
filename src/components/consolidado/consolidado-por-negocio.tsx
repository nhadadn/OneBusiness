'use client';

import * as React from 'react';
import { ChevronDown, ChevronRight, Landmark } from 'lucide-react';

import { ArqueoSummary } from '@/components/arqueo/arqueo-summary';
import { ArqueoTable } from '@/components/arqueo/arqueo-table';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ArqueoNegocio } from '@/types/cuenta_banco.types';
import type { ConsolidadoNegocioItem } from '@/types/negocio.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isArqueoNegocio(value: unknown): value is ArqueoNegocio {
  if (!isRecord(value)) return false;
  if (typeof value.negocioId !== 'number') return false;
  if (typeof value.fechaCorte !== 'string') return false;
  if (!Array.isArray(value.cuentas)) return false;
  if (!isRecord(value.totales)) return false;
  return true;
}

export type ConsolidadoPorNegocioProps = {
  negocios: ConsolidadoNegocioItem[];
  className?: string;
};

export function ConsolidadoPorNegocio({ negocios, className }: ConsolidadoPorNegocioProps) {
  const [expanded, setExpanded] = React.useState<Record<number, boolean>>({});

  const toggle = React.useCallback((negocioId: number) => {
    setExpanded((prev) => ({ ...prev, [negocioId]: !prev[negocioId] }));
  }, []);

  return (
    <Card className={cn('border-border bg-card shadow-none', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Consolidado por negocio</CardTitle>
      </CardHeader>
      <CardContent>
        {negocios.length === 0 ? (
          <EmptyState
            icon={<Landmark className="h-12 w-12 text-muted-foreground" />}
            title="Sin negocios para mostrar"
            description="No hay negocios activos o no hay información para el periodo seleccionado."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Negocio</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                  <TableHead className="text-right">Egresos</TableHead>
                  <TableHead className="text-right">Saldo neto</TableHead>
                  <TableHead className="text-right">Pendientes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {negocios.map((n) => {
                  const arqueo = isArqueoNegocio(n.arqueo) ? n.arqueo : null;
                  const isOpen = Boolean(expanded[n.negocioId]);

                  return (
                    <React.Fragment key={n.negocioId}>
                      <TableRow>
                        <TableCell className="align-top">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => toggle(n.negocioId)}
                            aria-label={isOpen ? 'Colapsar detalle' : 'Expandir detalle'}
                          >
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell className="min-w-[240px]">
                          <div className="font-medium">{n.nombre}</div>
                          <div className="text-xs text-muted-foreground">ID: {n.negocioId}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-emerald-700">
                          {typeof n.totalIngresos === 'number' && Number.isFinite(n.totalIngresos) ? formatCurrency(n.totalIngresos) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-700">
                          {typeof n.totalEgresos === 'number' && Number.isFinite(n.totalEgresos) ? formatCurrency(n.totalEgresos) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {typeof n.saldoNeto === 'number' && Number.isFinite(n.saldoNeto) ? formatCurrency(n.saldoNeto) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {n.movimientosPendientes > 0 ? (
                            <Badge variant="outline" className="bg-muted text-foreground hover:bg-muted">
                              {n.movimientosPendientes}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>

                      {isOpen ? (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/30 p-4">
                            {arqueo ? (
                              <div className="space-y-4">
                                <ArqueoSummary arqueo={arqueo} />
                                {arqueo.cuentas.length > 0 ? (
                                  <ArqueoTable cuentas={arqueo.cuentas} />
                                ) : (
                                  <EmptyState
                                    icon={<Landmark className="h-12 w-12 text-muted-foreground" />}
                                    title="Sin cuentas bancarias"
                                    description="Este negocio no tiene cuentas activas para calcular arqueo."
                                  />
                                )}
                              </div>
                            ) : (
                              <EmptyState
                                icon={<Landmark className="h-12 w-12 text-muted-foreground" />}
                                title="Sin arqueo disponible"
                                description="No se pudo calcular arqueo para este negocio."
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

