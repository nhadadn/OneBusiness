export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { verifyJWT } from '@/lib/jwt';
import { getRequiredPermission, hasPermission } from '@/middleware/permissions';
import { isProtectedApiPath } from '@/middleware/index';
import { TenantError, validateTenantAccess } from '@/middleware/tenant-middleware';

const SESSION_COOKIE_NAME = 'onebusiness_session';

function isProtectedPagePath(pathname: string) {
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/movimientos') ||
    pathname.startsWith('/consolidado') ||
    pathname.startsWith('/configuracion') ||
    pathname.startsWith('/negocios') ||
    pathname.startsWith('/usuarios') ||
    pathname.startsWith('/reportes')
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/api')) {
    const hasSession = request.cookies.get(SESSION_COOKIE_NAME)?.value === '1';
    if (pathname === '/') {
      return NextResponse.redirect(new URL(hasSession ? '/dashboard' : '/login', request.url));
    }
    if (pathname === '/login' && hasSession) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    if (isProtectedPagePath(pathname) && !hasSession) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  if (!isProtectedApiPath(pathname)) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Token de autenticación requerido' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const payload = await verifyJWT(token);

  if (!payload) {
    return NextResponse.json({ success: false, error: 'Token inválido o expirado' }, { status: 401 });
  }

  const requiredPermission = getRequiredPermission(request.method);
  if (requiredPermission && !hasPermission(payload.rol, requiredPermission)) {
    return NextResponse.json(
      { success: false, error: `No tienes permiso para realizar esta acción (${requiredPermission})` },
      { status: 403 }
    );
  }

  try {
    validateTenantAccess(request, {
      userId: payload.userId,
      email: payload.email,
      rol: payload.rol,
      negocios: payload.negocios,
    });
  } catch (error) {
    if (error instanceof TenantError) {
      const status = error.code === 'ACCESO_DENEGADO' ? 403 : 400;
      return NextResponse.json({ success: false, error: error.message }, { status });
    }
    throw error;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
