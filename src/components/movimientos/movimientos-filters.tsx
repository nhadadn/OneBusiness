'use client';

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { useMovimientoPendientesCount, type MovimientosFilters } from '@/hooks/use-movimientos';
import type { EstadoMovimiento, TipoMovimiento } from '@/types/movimiento.types';

export type MovimientosFiltersProps = {
  filters: MovimientosFilters;
  onChange: (filters: MovimientosFilters) => void;
  negocioOptions: { id: number; label: string }[];
};

function formatTabLabel(label: string, count: number | null) {
  if (count === null) return label;
  return `${label} ${count}`;
}

function getDefaultRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const toIso = (d: Date) => d.toISOString().split('T')[0]!;
  return { fechaDesde: toIso(start), fechaHasta: toIso(now) };
}

export function MovimientosFilters({ filters, onChange, negocioOptions }: MovimientosFiltersProps) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const pendientesQuery = useMovimientoPendientesCount();

  const canSeePendientes = user?.rol === 'Dueño' || user?.rol === 'Admin';
  const pendientesCount = canSeePendientes ? (pendientesQuery.data?.total ?? null) : null;

  const activeEstado: EstadoMovimiento | undefined = filters.estado;

  const estadoTabs = useMemo(() => {
    return [
      { key: 'all', label: 'Todos', value: undefined as EstadoMovimiento | undefined },
      { key: 'pendiente', label: formatTabLabel('Pendientes', pendientesCount), value: 'PENDIENTE' as const },
      { key: 'aprobado', label: 'Aprobados', value: 'APROBADO' as const },
      { key: 'rechazado', label: 'Rechazados', value: 'RECHAZADO' as const },
    ];
  }, [pendientesCount]);

  const handleEstadoChange = (next: EstadoMovimiento | undefined) => {
    onChange({ ...filters, estado: next, page: 1 });
  };

  const handleNegocioChange = (next: number) => {
    onChange({ ...filters, negocioId: next, page: 1 });
  };

  const handleTipoChange = (next: TipoMovimiento | undefined) => {
    onChange({ ...filters, tipo: next, page: 1 });
  };

  const handleFechaDesdeChange = (next: string) => {
    onChange({ ...filters, fechaDesde: next, page: 1 });
  };

  const handleFechaHastaChange = (next: string) => {
    onChange({ ...filters, fechaHasta: next, page: 1 });
  };

  const handleClear = () => {
    const range = getDefaultRange();
    onChange({
      ...filters,
      estado: undefined,
      tipo: undefined,
      fechaDesde: range.fechaDesde,
      fechaHasta: range.fechaHasta,
      cuentaBancoId: undefined,
      page: 1,
      limit: 50,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {estadoTabs.map((tab) => {
            const isActive = tab.value === activeEstado || (tab.key === 'all' && activeEstado === undefined);
            return (
              <Button
                key={tab.key}
                type="button"
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleEstadoChange(tab.value)}
              >
                {tab.label}
              </Button>
            );
          })}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={() => setExpanded((v) => !v)}>
          Filtros
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {expanded && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Negocio</div>
              <Select value={filters.negocioId ? String(filters.negocioId) : ''} onValueChange={(val) => handleNegocioChange(Number(val))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar negocio" />
                </SelectTrigger>
                <SelectContent>
                  {negocioOptions.map((opt) => (
                    <SelectItem key={opt.id} value={String(opt.id)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Tipo</div>
              <Select value={filters.tipo ?? 'all'} onValueChange={(val) => handleTipoChange(val === 'all' ? undefined : (val as TipoMovimiento))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="INGRESO">Ingreso</SelectItem>
                  <SelectItem value="EGRESO">Egreso</SelectItem>
                  <SelectItem value="TRASPASO_SALIDA">Traspaso (salida)</SelectItem>
                  <SelectItem value="TRASPASO_ENTRADA">Traspaso (entrada)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Fecha desde</div>
              <input
                type="date"
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={filters.fechaDesde ?? ''}
                onChange={(e) => handleFechaDesdeChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Fecha hasta</div>
              <input
                type="date"
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={filters.fechaHasta ?? ''}
                onChange={(e) => handleFechaHastaChange(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button type="button" variant="outline" className="w-full" onClick={handleClear}>
                Limpiar filtros
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

