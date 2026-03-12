import { NextResponse } from 'next/server';

import { verifyAccessToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

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

  return NextResponse.json({ success: true, message: 'Logout exitoso' });
}
