export type TipoMovimiento = 'INGRESO' | 'EGRESO' | 'TRASPASO_SALIDA' | 'TRASPASO_ENTRADA';
export type EstadoMovimiento = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'PAGADO' | 'CANCELADO';

export interface Movimiento {
  id: number;
  negocioId: number;
  centroCostoId: number | null;
  tipo: TipoMovimiento;
  fecha: string;
  concepto: string;
  tercero: string | null;
  monto: string;
  cuentaBancoId: number;
  traspasoRefId: number | null;
  estado: EstadoMovimiento;
  creadoPor: number;
  aprobadoPor: number | null;
  fechaAprobacion: Date | null;
  efectuado: boolean;
  fechaPago: Date | null;
  pagadoPor: number | null;
  motivoRechazo: string | null;
  version: number;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMovimientoInput {
  negocioId: number;
  centroCostoId?: number;
  tipo: TipoMovimiento;
  fecha: string;
  concepto: string;
  tercero?: string;
  monto: number;
  cuentaBancoId: number;
  cuentaBancoDestinoId?: number;
  negocioDestinoId?: number;
  efectuado?: boolean;
}

export interface UpdateMovimientoInput {
  concepto?: string;
  tercero?: string;
  monto?: number;
  fecha?: string;
  centroCostoId?: number;
}

export interface AprobarMovimientoInput {
  movimientoId: number;
  aprobadoPor: number;
}

export interface RechazarMovimientoInput {
  movimientoId: number;
  aprobadoPor: number;
  motivoRechazo: string;
}

export interface ReenviarMovimientoInput {
  movimientoId: number;
  cambios: UpdateMovimientoInput;
}

export interface MarcarPagadoInput {
  fechaPago?: string;
}

export interface MovimientosPendientesCount {
  total: number;
  porNegocio: { negocioId: number; nombre: string; count: number }[];
}
