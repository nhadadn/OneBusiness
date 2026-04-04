'use client';

import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface ReporteFiltersProps {
  periodo: 'este_mes' | 'mes_anterior' | 'ultimos_3_meses' | 'este_anio';
  negocioId: number | null;
  negocios: { id: number; nombre: string }[];
  onPeriodoChange: (p: ReporteFiltersProps['periodo']) => void;
  onNegocioChange: (id: number | null) => void;
  disabled?: boolean;
}

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function periodoToFechas(periodo: ReporteFiltersProps['periodo']): { fechaDesde: string; fechaHasta: string } {
  const today = new Date();

  if (periodo === 'este_mes') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { fechaDesde: toYmd(start), fechaHasta: toYmd(today) };
  }

  if (periodo === 'mes_anterior') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { fechaDesde: toYmd(start), fechaHasta: toYmd(end) };
  }

  if (periodo === 'ultimos_3_meses') {
    const start = new Date(today);
    start.setMonth(start.getMonth() - 3);
    return { fechaDesde: toYmd(start), fechaHasta: toYmd(today) };
  }

  const start = new Date(today.getFullYear(), 0, 1);
  return { fechaDesde: toYmd(start), fechaHasta: toYmd(today) };
}

export function ReporteFilters({
  periodo,
  negocioId,
  negocios,
  onPeriodoChange,
  onNegocioChange,
  disabled,
}: ReporteFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={periodo} onValueChange={onPeriodoChange} disabled={disabled}>
        <SelectTrigger className="w-[180px] bg-background border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="este_mes">Este mes</SelectItem>
          <SelectItem value="mes_anterior">Mes anterior</SelectItem>
          <SelectItem value="ultimos_3_meses">Últimos 3 meses</SelectItem>
          <SelectItem value="este_anio">Este año</SelectItem>
        </SelectContent>
      </Select>

      {negocios.length > 1 ? (
        <Select
          value={negocioId ? String(negocioId) : 'todos'}
          onValueChange={(v) => onNegocioChange(v === 'todos' ? null : Number(v))}
          disabled={disabled}
        >
          <SelectTrigger className="w-[200px] bg-background border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los negocios</SelectItem>
            {negocios.map((n) => (
              <SelectItem key={n.id} value={String(n.id)}>
                {n.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <Button variant="outline" size="sm" disabled aria-label="Exportar CSV">
        <Download className="mr-2 h-4 w-4" /> Exportar CSV
      </Button>
    </div>
  );
}
