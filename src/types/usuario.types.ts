import type { RoleName } from '@/types/permissions.types';

export interface GetUsuariosQuery {
  negocioId?: number;
  rol?: RoleName;
  activo?: boolean;
}

export interface UsuarioListItem {
  id: number;
  nombreCompleto: string;
  email: string;
  activo: boolean | null;
  rol: RoleName;
  negocios: number[];
}

export interface UsuarioDetail {
  id: number;
  nombreCompleto: string;
  email: string;
  activo: boolean | null;
  rolId: number;
  rol: RoleName;
  createdAt: Date | null;
  updatedAt: Date | null;
  negocios: number[];
}

export interface CreateUsuarioData {
  nombreCompleto: string;
  email: string;
  password: string;
  rolId: number;
  negocios: number[];
}

export interface UpdateUsuarioData {
  nombreCompleto?: string;
  email?: string;
  password?: string;
  rolId?: number;
  activo?: boolean;
}
