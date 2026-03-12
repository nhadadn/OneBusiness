'use client';

import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNegocios } from '@/hooks/use-negocios';

export type DashboardStatsProps = {
  negocios: 'all' | number[];
  selectedNegocio: number | null;
  rol: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
}

export function DashboardStats({ negocios, selectedNegocio, rol }: DashboardStatsProps) {
  const isDueño = rol === 'Dueño';

  const negocioDetailQuery = useNegocios({ negocioId: selectedNegocio ?? undefined, enabled: isDueño && selectedNegocio !== null });
  const selectedNegocioName = negocioDetailQuery.data?.data?.[0]?.nombre;

  const labelNegocios = useMemo(() => {
    if (isDueño) {
      if (selectedNegocio) return selectedNegocioName?.trim() ? selectedNegocioName : `Negocio ${selectedNegocio}`;
      return 'Todos';
    }
    return Array.isArray(negocios) ? `${negocios.length}` : '—';
  }, [isDueño, negocios, selectedNegocio, selectedNegocioName]);

  const ingresos = 0;
  const gastos = 0;
  const balance = ingresos - gastos;

  const cards = isDueño
    ? [
        { title: 'Total', value: labelNegocios, kind: 'text' as const },
        { title: 'Ingresos', value: formatCurrency(ingresos), kind: 'money' as const },
        { title: 'Gastos', value: formatCurrency(gastos), kind: 'money' as const },
        { title: 'Balance', value: formatCurrency(balance), kind: 'money' as const },
      ]
    : [
        { title: 'Mis Negocios', value: labelNegocios, kind: 'text' as const },
        { title: 'Ingresos', value: formatCurrency(ingresos), kind: 'money' as const },
        { title: 'Gastos', value: formatCurrency(gastos), kind: 'money' as const },
      ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">{card.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
