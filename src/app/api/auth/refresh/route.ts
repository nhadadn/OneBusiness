import { NextResponse } from 'next/server';
import { z } from 'zod';

import { refreshAccessToken } from '@/services/auth.service';

export const dynamic = 'force-dynamic';

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requerido'),
});

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const validated = refreshSchema.parse(body);

    const result = await refreshAccessToken(validated.refreshToken);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 401 });
    }

    return NextResponse.json({ success: true, accessToken: result.accessToken });
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
