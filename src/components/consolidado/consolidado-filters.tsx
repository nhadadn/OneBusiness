'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ConsolidadoFilters } from '@/types/negocio.types';

export type ConsolidadoFiltersProps = {
  filters: ConsolidadoFilters;
  setFechaDesde: (value: string) => void;
  setFechaHasta: (value: string) => void;
  setTipo: (value: ConsolidadoFilters['tipo'] | undefined) => void;
  setEstado: (value: ConsolidadoFilters['estado']) => void;
  onReset: () => void;
  disabled?: boolean;
};

export function ConsolidadoFilters({
  filters,
  setFechaDesde,
  setFechaHasta,
  setTipo,
  setEstado,
  onReset,
  disabled,
}: ConsolidadoFiltersProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">Estado</div>
          <Select value={filters.estado} onValueChange={(val) => setEstado(val as ConsolidadoFilters['estado'])} disabled={disabled}>
            <SelectTrigger aria-label="Estado">
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="APROBADO">Aprobado</SelectItem>
              <SelectItem value="PENDIENTE">Pendiente</SelectItem>
              <SelectItem value="RECHAZADO">Rechazado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">Tipo</div>
          <Select
            value={filters.tipo ?? 'all'}
            onValueChange={(val) => setTipo(val === 'all' ? undefined : (val as ConsolidadoFilters['tipo']))}
            disabled={disabled}
          >
            <SelectTrigger aria-label="Tipo">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="INGRESO">Ingreso</SelectItem>
              <SelectItem value="EGRESO">Egreso</SelectItem>
              <SelectItem value="TRASPASO_ENTRADA">Traspaso (entrada)</SelectItem>
              <SelectItem value="TRASPASO_SALIDA">Traspaso (salida)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="consolidado-fecha-desde" className="text-sm font-medium text-foreground">
            Fecha desde
          </label>
          <input
            id="consolidado-fecha-desde"
            type="date"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            value={filters.fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="consolidado-fecha-hasta" className="text-sm font-medium text-foreground">
            Fecha hasta
          </label>
          <input
            id="consolidado-fecha-hasta"
            type="date"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            value={filters.fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="flex items-end">
          <Button type="button" variant="outline" className="w-full" onClick={onReset} disabled={disabled}>
            Restablecer
          </Button>
        </div>
      </div>
    </div>
  );
}

