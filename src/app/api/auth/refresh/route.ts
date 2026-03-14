import { NextResponse } from 'next/server';
import { z } from 'zod';

import { checkRateLimit, getClientIP, RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter';
import { refreshAccessToken } from '@/services/auth.service';

export const dynamic = 'force-dynamic';

const REFRESH_COOKIE_NAME = 'onebusiness_refresh_token';
const SESSION_COOKIE_NAME = 'onebusiness_session';

function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx);
    if (key !== name) continue;
    return trimmed.slice(idx + 1);
  }
  return null;
}

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requerido').optional(),
});

export async function POST(request: Request) {
  try {
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const validated = refreshSchema.parse(body);
    const refreshToken =
      validated.refreshToken ?? getCookieValue(request.headers.get('cookie'), REFRESH_COOKIE_NAME) ?? null;
    if (!refreshToken) {
      return NextResponse.json({ success: false, error: 'Refresh token requerido' }, { status: 401 });
    }

    const clientIP = getClientIP(request.headers);
    const rl = checkRateLimit(`refresh:${clientIP}`, RATE_LIMIT_CONFIGS.REFRESH);

    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds ?? 300) } }
      );
    }

    const result = await refreshAccessToken(refreshToken);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 401 });
    }

    const response = NextResponse.json({
      success: true,
      accessToken: result.accessToken,
      ...(result.refreshToken ? { refreshToken: result.refreshToken } : {}),
      ...(result.user ? { user: result.user, usuario: result.user } : {}),
    });

    if (result.refreshToken) {
      response.cookies.set({
        name: REFRESH_COOKIE_NAME,
        value: result.refreshToken,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
    }
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: '1',
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Refresh error', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
