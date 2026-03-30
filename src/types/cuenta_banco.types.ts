export type TipoCuenta = 'EFECTIVO' | 'BANCARIA' | 'CAJA_CHICA';

export interface CuentaBanco {
  id: number;
  nombre: string;
  tipo: TipoCuenta;
  bancoInstitucion: string | null;
  titular: string | null;
  negocioId: number;
  saldoInicial: string;
  saldoReal: string | null;
  fechaSaldoReal: Date | null;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCuentaBancoInput {
  nombre: string;
  tipo: TipoCuenta;
  bancoInstitucion?: string;
  titular?: string;
  negocioId: number;
  saldoInicial?: number;
}

export interface UpdateCuentaBancoInput {
  nombre?: string;
  tipo?: TipoCuenta;
  bancoInstitucion?: string;
  titular?: string;
  saldoReal?: number;
  activo?: boolean;
}

export interface SaldoCalculado {
  cuentaBancoId: number;
  saldoInicial: number;
  ingresos: number;
  egresos: number;
  saldoCalculado: number;
  saldoReal: number | null;
  diferencia: number | null;
  movimientosPendientes: number;
}

export type EstadoArqueo = 'CUADRADO' | 'SOBRANTE' | 'FALTANTE' | 'SIN_SALDO_REAL';

export type ArqueoCuentaBanco = {
  cuentaBancoId: number;
  negocioId: number;
  fechaCorte: string;
  saldoInicial: number;
  ingreso: number;
  egreso: number;
  traspasoEntrada: number;
  traspasoSalida: number;
  saldoCalculado: number;
  saldoReal: number | null;
  fechaSaldoReal: string | null;
  diferencia: number | null;
  estadoArqueo: EstadoArqueo;
  movimientosPendientes: number;
};

export type ArqueoNegocio = {
  negocioId: number;
  fechaCorte: string;
  cuentas: Array<{
    cuentaBancoId: number;
    nombre: string;
    tipo: TipoCuenta;
    saldoInicial: number;
    ingreso: number;
    egreso: number;
    traspasoEntrada: number;
    traspasoSalida: number;
    saldoCalculado: number;
    saldoReal: number | null;
    fechaSaldoReal: string | null;
    diferencia: number | null;
    estadoArqueo: EstadoArqueo;
    movimientosPendientes: number;
  }>;
  totales: {
    saldoInicial: number;
    ingreso: number;
    egreso: number;
    traspasoEntrada: number;
    traspasoSalida: number;
    saldoCalculado: number;
    saldoReal: number | null;
    diferencia: number | null;
    estadoArqueo: EstadoArqueo;
    cuentasSinSaldoReal: number;
    movimientosPendientes: number;
  };
};
