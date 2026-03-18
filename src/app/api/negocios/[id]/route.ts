import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { db } from '@/lib/db';
import { negocios } from '@/lib/drizzle';

export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID inválido'),
});

export async function GET(request: Request, context: { params: { id: string } }) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  const authz = authorizeRequest(auth, request.method);
  if (!authz.authorized) {
    return forbiddenResponse(authz.error);
  }

  try {
    const { id } = paramsSchema.parse(context.params);
    const negocioId = Number.parseInt(id, 10);

    if (auth.user!.rol !== 'Dueño' && !auth.user!.negocios.includes(negocioId)) {
      return forbiddenResponse('No tienes acceso a este negocio');
    }

    const [negocio] = await db
      .select({
        id: negocios.id,
        nombre: negocios.nombre,
        rfc: negocios.rfc,
        direccion: negocios.direccion,
        telefono: negocios.telefono,
      })
      .from(negocios)
      .where(eq(negocios.id, negocioId))
      .limit(1);

    if (!negocio) {
      return NextResponse.json({ success: false, error: 'Negocio no encontrado' }, { status: 404 });
    }

    const tenant = { negocioId, isOwner: auth.user!.rol === 'Dueño', negociosAccesibles: auth.user!.negocios };
    return NextResponse.json({ success: true, data: negocio, user: auth.user, tenant });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    const message = (error as Error).message || 'Error interno del servidor';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
