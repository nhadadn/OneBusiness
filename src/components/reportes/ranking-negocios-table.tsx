'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface RankingNegociosTableProps {
  data: {
    negocioId: number;
    nombre: string;
    ingresos: number;
    egresos: number;
    balance: number;
    pendientes: number;
    semaforo: 'verde' | 'amarillo' | 'rojo';
  }[];
  isLoading?: boolean;
}

export function RankingNegociosTable({ data, isLoading }: RankingNegociosTableProps) {
  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader className="p-4 pb-0">
        <CardTitle className="text-base text-foreground">Ranking de Negocios</CardTitle>
        <p className="text-sm text-muted-foreground">Comparativa financiera por negocio en el período</p>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4">
            <Skeleton className="h-[200px] w-full" />
          </div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Sin datos para el período seleccionado</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="w-8">
                  #
                </TableHead>
                <TableHead scope="col">Negocio</TableHead>
                <TableHead scope="col" className="w-8">
                  Estado
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Ingresos
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Egresos
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Balance
                </TableHead>
                <TableHead scope="col" className="text-center">
                  Pendientes
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((negocio, index) => (
                <TableRow key={negocio.negocioId}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium text-foreground">{negocio.nombre}</TableCell>
                  <TableCell>
                    <span
                      className={cn('inline-flex h-2.5 w-2.5 rounded-full', {
                        'bg-emerald-500': negocio.semaforo === 'verde',
                        'bg-amber-500': negocio.semaforo === 'amarillo',
                        'bg-destructive': negocio.semaforo === 'rojo',
                      })}
                      title={negocio.semaforo}
                    />
                  </TableCell>
                  <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(negocio.ingresos)}</TableCell>
                  <TableCell className="text-right text-destructive">{formatCurrency(negocio.egresos)}</TableCell>
                  <TableCell
                    className={cn('text-right font-semibold', {
                      'text-emerald-600 dark:text-emerald-400': negocio.balance >= 0,
                      'text-destructive': negocio.balance < 0,
                    })}
                  >
                    {formatCurrency(negocio.balance)}
                  </TableCell>
                  <TableCell className="text-center">
                    {negocio.pendientes > 0 ? <Badge variant="secondary">{negocio.pendientes}</Badge> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
