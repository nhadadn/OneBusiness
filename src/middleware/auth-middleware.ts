import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import type { AuthResult } from '@/types/auth.types';
import { db } from '@/lib/db';
import { usuarios } from '@/lib/drizzle';
import { verifyJWT } from '@/lib/jwt';
import { authorizeRequest as authorizeRequestByRole, forbiddenResponse } from '@/middleware/permissions';

export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

export async function authenticateRequest(request: Request): Promise<AuthResult> {
  try {
    const token = extractBearerToken(request);
    if (!token) {
      return { success: false, error: 'Token de autenticación requerido' };
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return { success: false, error: 'Token inválido o expirado' };
    }

    const userRows = await db.select({ tokenVersion: usuarios.tokenVersion }).from(usuarios).where(eq(usuarios.id, payload.userId)).limit(1);
    const user = userRows[0];
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      return { success: false, error: 'Token inválido o expirado' };
    }

    return {
      success: true,
      user: {
        userId: payload.userId,
        email: payload.email,
        rol: payload.rol,
        negocios: payload.negocios,
      },
    };
  } catch (error) {
    console.error('Auth middleware error', error);
    return { success: false, error: 'Error de autenticación' };
  }
}

export function unauthorizedResponse(message: string = 'No autorizado'): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

export function authorizeRequest(auth: AuthResult, method: string) {
  return authorizeRequestByRole(auth, method);
}

export { forbiddenResponse };

export function hasRole(userRol: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRol);
}

export function hasNegocioAccess(
  userNegocios: number[],
  targetNegocioId: number,
  userRol: string
): boolean {
  if (userRol === 'Dueño') {
    return true;
  }
  return userNegocios.includes(targetNegocioId);
}

