import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';

import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { db } from '@/lib/db';
import { centrosCosto } from '@/lib/drizzle';
import { CentroCostoService } from '@/services/centro_costo.service';

export const dynamic = 'force-dynamic';

const centroCostoService = new CentroCostoService();

const paramsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID inválido'),
});

const updateSchema = z
  .object({
    nombre: z.string().min(1, 'Nombre requerido').max(255, 'Máximo 255 caracteres').trim().optional(),
    codigo: z.string().max(50, 'Máximo 50 caracteres').optional(),
    descripcion: z.string().max(500, 'Máximo 500 caracteres').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Debe enviar al menos un campo para actualizar' });

function canAccessNegocio(authUser: { rol: string; negocios: number[] }, negocioId: number): boolean {
  return authUser.rol === 'Dueño' || authUser.negocios.includes(negocioId);
}

async function getCentroNegocioId(id: number): Promise<number | null> {
  const [row] = await db
    .select({ negocioId: centrosCosto.negocioId })
    .from(centrosCosto)
    .where(and(eq(centrosCosto.id, id), eq(centrosCosto.activo, true)))
    .limit(1);

  return row?.negocioId ?? null;
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

  if (auth.user!.rol !== 'Dueño' && auth.user!.rol !== 'Admin') {
    return forbiddenResponse('Solo Dueño y Admin pueden editar centros de costo');
  }

  try {
    const { id } = paramsSchema.parse(context.params);
    const centroId = Number.parseInt(id, 10);

    const negocioId = await getCentroNegocioId(centroId);
    if (negocioId === null) {
      return NextResponse.json({ success: false, error: 'Centro de costo no encontrado' }, { status: 404 });
    }

    if (!canAccessNegocio(auth.user!, negocioId)) {
      return forbiddenResponse('Sin acceso a este negocio');
    }

    const body: unknown = await request.json();
    const validated = updateSchema.parse(body);

    const updated = await centroCostoService.actualizar(centroId, validated);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    const message = (error as Error).message || 'Error interno del servidor';
    if (message.includes('no encontrado')) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: { id: string } }) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  const authz = authorizeRequest(auth, request.method);
  if (!authz.authorized) {
    return forbiddenResponse(authz.error);
  }

  if (auth.user!.rol !== 'Dueño' && auth.user!.rol !== 'Admin') {
    return forbiddenResponse('Solo Dueño y Admin pueden eliminar centros de costo');
  }

  try {
    const { id } = paramsSchema.parse(context.params);
    const centroId = Number.parseInt(id, 10);

    const negocioId = await getCentroNegocioId(centroId);
    if (negocioId === null) {
      return NextResponse.json({ success: false, error: 'Centro de costo no encontrado' }, { status: 404 });
    }

    if (!canAccessNegocio(auth.user!, negocioId)) {
      return forbiddenResponse('Sin acceso a este negocio');
    }

    await centroCostoService.desactivar(centroId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    const message = (error as Error).message || 'Error interno del servidor';
    if (message.includes('no encontrado')) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
