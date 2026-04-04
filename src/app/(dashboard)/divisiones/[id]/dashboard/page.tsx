'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';

import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useDivisionResumen } from '@/hooks/use-division-resumen';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { periodoToFechas } from '@/components/reportes/reporte-filters';

type Periodo = 'este_mes' | 'mes_anterior' | 'ultimos_3_meses' | 'este_anio';

export default function DivisionDashboardPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  const [periodo, setPeriodo] = useState<Periodo>('este_mes');
  const { fechaDesde, fechaHasta } = periodoToFechas(periodo);

  const centroCostoId = useMemo(() => {
    const n = Number(params.id);
    return Number.isFinite(n) ? n : null;
  }, [params.id]);

  const { data, isLoading, isError } = useDivisionResumen({
    centroCostoId,
    fechaDesde,
    fechaHasta,
  });

  const resumenData = data?.data;

  return (
    <div className="container mx-auto space-y-6 py-6">
      <PageHeader
        title={resumenData?.centro.nombre ?? 'División'}
        description={
          resumenData?.centro.tipo === 'DIVISION'
            ? `División · ${resumenData.hijos.length} sub-divisiones`
            : resumenData?.centro.tipo === 'SUBDIVISION'
              ? 'Sub-división'
              : undefined
        }
        action={
          <div className="flex items-center gap-2">
            <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
              <SelectTrigger className="w-[160px] bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="este_mes">Este mes</SelectItem>
                <SelectItem value="mes_anterior">Mes anterior</SelectItem>
                <SelectItem value="ultimos_3_meses">Últimos 3 meses</SelectItem>
                <SelectItem value="este_anio">Este año</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              ← Volver
            </Button>
          </div>
        }
      />

      {isLoading ? <LoadingSkeleton variant="card" rows={3} /> : null}

      {isError ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Error al cargar los datos de la división.
        </div>
      ) : null}

      {resumenData ? (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="border-border bg-card shadow-none">
              <CardHeader className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" /> Ingresos
                </div>
                <div className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(resumenData.resumen.totalIngresos)}
                </div>
              </CardHeader>
            </Card>

            <Card className="border-border bg-card shadow-none">
              <CardHeader className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingDown className="h-4 w-4" /> Egresos
                </div>
                <div className="mt-2 text-2xl font-semibold text-destructive">
                  {formatCurrency(resumenData.resumen.totalEgresos)}
                </div>
              </CardHeader>
            </Card>

            <Card className="border-border bg-card shadow-none">
              <CardHeader className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" /> Balance
                </div>
                <div
                  className={cn('mt-2 text-2xl font-semibold', {
                    'text-emerald-600 dark:text-emerald-400': resumenData.resumen.balance >= 0,
                    'text-destructive': resumenData.resumen.balance < 0,
                  })}
                >
                  {formatCurrency(resumenData.resumen.balance)}
                </div>
              </CardHeader>
            </Card>

            <Card className="border-border bg-card shadow-none">
              <CardHeader className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" /> Pendientes
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground">{resumenData.resumen.cantidadPendientes}</div>
              </CardHeader>
            </Card>
          </div>

          {resumenData.hijos.length > 0 ? (
            <Card className="border-border bg-card shadow-none">
              <CardHeader className="p-4 pb-0">
                <div className="text-base font-semibold text-foreground">Desglose por Sub-división</div>
                <p className="text-sm text-muted-foreground">Comparativa financiera en el período seleccionado</p>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Sub-división</TableHead>
                      <TableHead scope="col" className="text-right">
                        Ingresos
                      </TableHead>
                      <TableHead scope="col" className="text-right">
                        Egresos
                      </TableHead>
                      <TableHead scope="col" className="text-right">
                        Balance
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumenData.hijos.map((hijo) => (
                      <TableRow key={hijo.id}>
                        <TableCell className="font-medium text-foreground">{hijo.nombre}</TableCell>
                        <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(hijo.totalIngresos)}
                        </TableCell>
                        <TableCell className="text-right text-destructive">{formatCurrency(hijo.totalEgresos)}</TableCell>
                        <TableCell
                          className={cn('text-right font-semibold', {
                            'text-emerald-600 dark:text-emerald-400': hijo.balance >= 0,
                            'text-destructive': hijo.balance < 0,
                          })}
                        >
                          {formatCurrency(hijo.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
