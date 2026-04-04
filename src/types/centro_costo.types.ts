export type TipoCentroCosto = 'DIVISION' | 'SUBDIVISION';

export interface CentroCostoListItem {
  id: number;
  nombre: string;
  codigo: string | null;
  tipo: TipoCentroCosto;
  negocioId: number;
  padreId: number | null;
  descripcion: string | null;
  activo: boolean;
}

export interface CentroCostoTree extends CentroCostoListItem {
  hijos: CentroCostoTree[];
}

export interface CreateCentroCostoInput {
  negocioId: number;
  nombre: string;
  codigo?: string;
  tipo: TipoCentroCosto;
  padreId?: number | null;
  descripcion?: string;
}

export interface UpdateCentroCostoInput {
  nombre?: string;
  codigo?: string;
  descripcion?: string;
}
