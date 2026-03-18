export type EstadoCotizacion = 'BORRADOR' | 'ENVIADA' | 'APROBADA' | 'FACTURADA' | 'CANCELADA';

export interface CotizacionItemInput {
  descripcion: string;
  cantidad?: number;
  unidadMedida?: string;
  precioUnitario?: number;
  importe: number;
}

export interface CrearCotizacionInput {
  negocioId: number;
  clienteNombre: string;
  clienteRfc?: string;
  clienteDireccion?: string;
  fecha: string;
  notas?: string;
  categoriaId?: number;
  items: CotizacionItemInput[];
  creadoPor: number;
}

export interface ActualizarCotizacionInput {
  clienteNombre?: string;
  clienteRfc?: string;
  clienteDireccion?: string;
  fecha?: string;
  notas?: string;
  categoriaId?: number;
  items?: CotizacionItemInput[];
}

export interface CambiarEstadoCotizacionInput {
  nuevoEstado: EstadoCotizacion;
  numeroOc?: string;
  numeroFactura?: string;
  cuentaBancoId?: number;
  categoriaId?: number;
  aprobadoPor: number;
}

export interface ListarCotizacionesParams {
  negocioId?: number;
  estado?: EstadoCotizacion;
  fechaDesde?: string;
  fechaHasta?: string;
  busqueda?: string;
  page?: number;
  limit?: number;
  userId: number;
  rol: string;
}
