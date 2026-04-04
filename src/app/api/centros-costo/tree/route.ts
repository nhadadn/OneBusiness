import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { CentroCostoService } from '@/services/centro_costo.service';

export const dynamic = 'force-dynamic';

const centroCostoService = new CentroCostoService();

const listQuerySchema = z.object({
  negocioId: z.coerce.number().int().positive(),
});

function canAccessNegocio(authUser: { rol: string; negocios: number[] }, negocioId: number): boolean {
  return authUser.rol === 'Dueño' || authUser.negocios.includes(negocioId);
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  const authz = authorizeRequest(auth, request.method);
  if (!authz.authorized) {
    return forbiddenResponse(authz.error);
  }

  try {
    const { searchParams } = new URL(request.url);
    const negocioIdRaw = searchParams.get('negocioId');
    if (!negocioIdRaw || Number.isNaN(Number(negocioIdRaw))) {
      return NextResponse.json(
        { success: false, error: 'negocioId es requerido y debe ser un número' },
        { status: 400 }
      );
    }
    const query = listQuerySchema.parse({ negocioId: searchParams.get('negocioId') });

    if (!canAccessNegocio(auth.user!, query.negocioId)) {
      return forbiddenResponse('Sin acceso a este negocio');
    }

    const data = await centroCostoService.obtenerArbol(query.negocioId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    const message = (error as Error).message || 'Error interno del servidor';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
