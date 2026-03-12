'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type DashboardChartsProps = {
  negocios: 'all' | number[];
  selectedNegocio: number | null;
  rol: string;
  negocioId?: number;
};

export function DashboardCharts({ rol, selectedNegocio, negocioId }: DashboardChartsProps) {
  const isDueño = rol === 'Dueño';

  const title = isDueño ? 'Gráfico Consolidado' : 'Gráfico del Negocio';
  const scope = isDueño ? (selectedNegocio ? `Negocio ${selectedNegocio}` : 'Holding') : negocioId ? `Negocio ${negocioId}` : 'Negocio';

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-base text-[#1e3a5f]">
          {title} • {scope}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-[260px] items-center justify-center rounded-md border border-dashed border-slate-200 text-sm text-slate-500">
          Gráficos pendientes de integrar con API de métricas
        </div>
      </CardContent>
    </Card>
  );
}

