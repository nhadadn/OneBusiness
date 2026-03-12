export type Permission = 'read' | 'write' | 'delete' | 'export';

export type RoleName = 'Dueño' | 'Socio' | 'Admin' | 'Externo';

export type RolePermissions = Record<RoleName, Permission[]>;

export const ROLE_PERMISSIONS: RolePermissions = {
  Dueño: ['read', 'write', 'delete', 'export'],
  Socio: ['read', 'write'],
  Admin: ['read', 'write', 'delete', 'export'],
  Externo: ['read', 'write'],
};

export const METHOD_PERMISSIONS: Record<string, Permission> = {
  GET: 'read',
  POST: 'write',
  PUT: 'write',
  PATCH: 'write',
  DELETE: 'delete',
};

