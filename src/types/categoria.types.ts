export type TipoCategoria = 'ingreso' | 'egreso';

export interface Categoria {
  id: number;
  nombre: string;
  tipo: 'INGRESO' | 'EGRESO';
  negocioId: number | null;
  requiereAprobacion: boolean;
  montoMaxSinAprobacion: string | null;
  activa: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoriaFormData {
  nombre: string;
  tipo: TipoCategoria;
  esGlobal?: boolean;
  requiereAprobacion?: boolean;
  montoMaxSinAprobacion?: string | null;
}

export interface CategoriaUpdate {
  nombre?: string;
  activa?: boolean;
  requiereAprobacion?: boolean;
  montoMaxSinAprobacion?: string | null;
}

