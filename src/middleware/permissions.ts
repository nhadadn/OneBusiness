import { NextResponse } from 'next/server';

import type { AuthResult } from '@/types/auth.types';
import { METHOD_PERMISSIONS, ROLE_PERMISSIONS, type Permission, type RoleName } from '@/types/permissions.types';

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export function hasPermission(rol: string, permission: Permission): boolean {
  if (rol === 'Externo') return permission === 'read';
  const rolePermissions = ROLE_PERMISSIONS[rol as RoleName];
  if (!rolePermissions) return false;
  return rolePermissions.includes(permission);
}

export function getRequiredPermission(method: string): Permission | null {
  return METHOD_PERMISSIONS[method.toUpperCase()] ?? null;
}

export function authorizeRequest(
  auth: AuthResult,
  method: string
): { authorized: boolean; error?: string; requiredPermission?: Permission } {
  if (!auth.success || !auth.user) {
    return { authorized: false, error: 'No autenticado' };
  }

  const requiredPermission = getRequiredPermission(method);
  if (!requiredPermission) {
    return { authorized: true };
  }

  if (!hasPermission(auth.user.rol, requiredPermission)) {
    return {
      authorized: false,
      requiredPermission,
      error: `No tienes permiso para realizar esta acción (${requiredPermission})`,
    };
  }

  return { authorized: true };
}

export function forbiddenResponse(message: string = 'Acceso denegado'): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}
