import { NextResponse } from 'next/server';
import { z } from 'zod';

import { checkRateLimit, getClientIP, RATE_LIMIT_CONFIGS, resetRateLimit } from '@/lib/rate-limiter';
import { auditLog, getRequestContext } from '@/lib/audit-logger';
import { login } from '@/services/auth.service';

export const dynamic = 'force-dynamic';

const REFRESH_COOKIE_NAME = 'onebusiness_refresh_token';
const SESSION_COOKIE_NAME = 'onebusiness_session';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Password debe tener al menos 6 caracteres'),
});

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const validated = loginSchema.parse(body);

    const clientIP = getClientIP(request.headers);
    const rateLimitKey = `login:${clientIP}`;
    const rl = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIGS.LOGIN);

    if (!rl.allowed) {
      void auditLog({
        evento: 'RATE_LIMIT_HIT',
        exitoso: false,
        recurso: '/api/auth/login',
        detalles: { ip: clientIP },
        ...getRequestContext(request),
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Demasiados intentos fallidos. Intenta de nuevo más tarde.',
          ...(process.env.NODE_ENV !== 'production' && {
            retryAfterSeconds: rl.retryAfterSeconds,
          }),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rl.retryAfterSeconds ?? 900),
            'X-RateLimit-Limit': String(RATE_LIMIT_CONFIGS.LOGIN.maxAttempts),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const result = await login(validated.email, validated.password);

    if (!result.success) {
      void auditLog({
        evento: 'LOGIN_FAILURE',
        exitoso: false,
        userId: null,
        recurso: '/api/auth/login',
        detalles: { email: validated.email, motivo: 'credenciales_invalidas' },
        ...getRequestContext(request),
      });
      return NextResponse.json({ success: false, error: result.error }, { status: 401 });
    }

    resetRateLimit(rateLimitKey);
    const response = NextResponse.json({
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
      usuario: result.user,
    });

    response.cookies.set({
      name: REFRESH_COOKIE_NAME,
      value: result.refreshToken,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: '1',
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    const ctx = getRequestContext(request);
    void auditLog({
      evento: 'LOGIN_SUCCESS',
      exitoso: true,
      userId: result.user.id,
      recurso: '/api/auth/login',
      detalles: { rol: result.user.rol },
      ...ctx,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Login error', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
