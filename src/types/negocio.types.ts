import type { ArqueoNegocio } from '@/types/cuenta_banco.types';
import type { EstadoMovimiento, TipoMovimiento } from '@/types/movimiento.types';

export interface NegocioListItem {
  id: number;
  nombre: string;
  rubro: string | null;
  modeloIngreso: string | null;
  tieneSocios: boolean | null;
  activo: boolean | null;
}

export interface ConsolidadoFilters {
  fechaDesde: string;
  fechaHasta: string;
  tipo?: TipoMovimiento;
  estado?: EstadoMovimiento;
}

export interface ConsolidadoResumenGlobal {
  totalIngresos: number;
  totalEgresos: number;
  saldoNeto: number;
  negociosActivos: number;
  movimientosPendientes: number;
}

export interface ConsolidadoNegocioItem {
  negocioId: number;
  nombre: string;
  totalIngresos: number;
  totalEgresos: number;
  saldoNeto: number;
  movimientosPendientes: number;
  arqueo: ArqueoNegocio | null;
}

export interface ConsolidadoFiltersDisponibles {
  estados: EstadoMovimiento[];
  tipos: TipoMovimiento[];
}

export interface ConsolidadoData {
  resumenGlobal: ConsolidadoResumenGlobal;
  negocios: ConsolidadoNegocioItem[];
  filters: ConsolidadoFilters;
  filtersDisponibles: ConsolidadoFiltersDisponibles;
}

export interface ConsolidadoApiResponse {
  success: boolean;
  data: ConsolidadoData;
}

