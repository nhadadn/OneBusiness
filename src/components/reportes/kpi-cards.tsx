'use client';

import { Clock, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface KpiCardsProps {
  totalIngresos: number;
  totalEgresos: number;
  balance: number;
  totalPendientes: number;
  isLoading?: boolean;
}

export function KpiCards({ totalIngresos, totalEgresos, balance, totalPendientes, isLoading }: KpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx} className="border-border bg-card shadow-none">
            <CardHeader className="p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-8 w-36" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Card className="border-border bg-card shadow-none">
        <CardHeader className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" /> Ingresos
          </div>
          <div className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalIngresos)}
          </div>
        </CardHeader>
      </Card>

      <Card className="border-border bg-card shadow-none">
        <CardHeader className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingDown className="h-4 w-4" /> Egresos
          </div>
          <div className="mt-2 text-2xl font-semibold text-destructive">{formatCurrency(totalEgresos)}</div>
        </CardHeader>
      </Card>

      <Card className="border-border bg-card shadow-none">
        <CardHeader className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" /> Balance
          </div>
          <div className={cn('mt-2 text-2xl font-semibold', balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
            {formatCurrency(balance)}
          </div>
        </CardHeader>
      </Card>

      <Card className="border-border bg-card shadow-none">
        <CardHeader className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" /> Pendientes
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl font-semibold text-foreground">{totalPendientes}</span>
            {totalPendientes > 0 ? <Badge variant="secondary">por aprobar</Badge> : null}
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
