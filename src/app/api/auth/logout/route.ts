import { NextResponse } from 'next/server';

import { verifyAccessToken } from '@/lib/jwt';
import { auditLog, getRequestContext } from '@/lib/audit-logger';
import { logout } from '@/services/auth.service';

export const dynamic = 'force-dynamic';

const REFRESH_COOKIE_NAME = 'onebusiness_refresh_token';
const SESSION_COOKIE_NAME = 'onebusiness_session';

function getBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

export async function POST(request: Request) {
  const token = getBearerToken(request.headers.get('authorization'));
  if (!token) {
    return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 });
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    return NextResponse.json({ success: false, error: 'Token inválido' }, { status: 401 });
  }

  await logout(payload.userId);
  const response = NextResponse.json({ success: true, message: 'Logout exitoso' });
  response.cookies.set({
    name: REFRESH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  void auditLog({
    evento: 'LOGOUT',
    exitoso: true,
    userId: payload.userId,
    recurso: '/api/auth/logout',
    ...getRequestContext(request),
  });

  return response;
}
