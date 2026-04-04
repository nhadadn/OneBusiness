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
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base text-primary">
          {title} • {scope}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-[260px] items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
          Gráficos pendientes de integrar con API de métricas
        </div>
      </CardContent>
    </Card>
  );
}

