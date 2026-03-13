export type TipoCategoria = 'ingreso' | 'egreso';

export interface Categoria {
  id: number;
  nombre: string;
  tipo: 'INGRESO' | 'EGRESO';
  negocioId: number | null;
  activa: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoriaFormData {
  nombre: string;
  tipo: TipoCategoria;
  esGlobal?: boolean;
}

export interface CategoriaUpdate {
  nombre?: string;
  activa?: boolean;
}

