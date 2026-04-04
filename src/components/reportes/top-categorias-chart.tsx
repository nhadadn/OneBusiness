'use client';

import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';

export interface TopCategoriasChartProps {
  datosIngreso: { nombre: string; total: number; cantidad: number }[];
  datosEgreso: { nombre: string; total: number; cantidad: number }[];
  isLoading?: boolean;
}

type TabKey = 'ingreso' | 'egreso';

export function TopCategoriasChart({ datosIngreso, datosEgreso, isLoading }: TopCategoriasChartProps) {
  const [tab, setTab] = useState<TabKey>('ingreso');

  const data = (tab === 'ingreso' ? datosIngreso : datosEgreso).slice(0, 10);

  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base text-foreground">Top Categorías</CardTitle>
            <p className="text-sm text-muted-foreground">Por monto total en el período</p>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={tab === 'ingreso' ? 'default' : 'outline'}
              onClick={() => setTab('ingreso')}
              className="h-7 text-xs"
            >
              Ingresos
            </Button>
            <Button
              size="sm"
              variant={tab === 'egreso' ? 'default' : 'outline'}
              onClick={() => setTab('egreso')}
              className="h-7 text-xs"
            >
              Egresos
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart layout="vertical" data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                tickFormatter={(v) => {
                  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                  return String(v);
                }}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis type="category" dataKey="nombre" width={130} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                formatter={(value) => {
                  const num = typeof value === 'number' ? value : Number(value ?? 0);
                  return [formatCurrency(Number.isFinite(num) ? num : 0), 'Total'];
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Bar dataKey="total" fill={tab === 'ingreso' ? 'hsl(var(--chart-1))' : 'hsl(var(--destructive))'} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
