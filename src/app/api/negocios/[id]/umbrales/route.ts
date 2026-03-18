import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { updateNegocioUmbrales } from '@/services/negocio.service';

export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID inválido'),
});

const bodySchema = z
  .object({
    umbralAlerta: z.number().finite().nullable(),
    umbralCritico: z.number().finite().nullable(),
  })
  .refine((data) => data.umbralAlerta === null || data.umbralCritico === null || data.umbralCritico < data.umbralAlerta, {
    message: 'umbralCritico debe ser menor que umbralAlerta',
    path: ['umbralCritico'],
  });

function parseNumeric(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  const authz = authorizeRequest(auth, request.method);
  if (!authz.authorized) {
    return forbiddenResponse(authz.error);
  }

  if (auth.user!.rol !== 'Dueño') {
    return forbiddenResponse('Solo Dueño puede configurar umbrales');
  }

  try {
    const { id } = paramsSchema.parse(context.params);
    const negocioId = Number.parseInt(id, 10);
    const body: unknown = await request.json();
    const validated = bodySchema.parse(body);

    const updated = await updateNegocioUmbrales(negocioId, validated);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Negocio no encontrado' }, { status: 404 });
    }

    const data = {
      ...updated,
      umbralAlerta: parseNumeric(updated.umbralAlerta),
      umbralCritico: parseNumeric(updated.umbralCritico),
    };

    const tenant = { negocioId, isOwner: true, negociosAccesibles: auth.user!.negocios };
    return NextResponse.json({ success: true, data, tenant });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    const message = (error as Error).message || 'Error interno del servidor';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
