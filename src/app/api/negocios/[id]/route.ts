import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';

import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { db } from '@/lib/db';
import { movimientos, negocios } from '@/lib/drizzle';

export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID inválido'),
});

const updateSchema = z
  .object({
    nombre: z.string().min(1).max(255).trim().optional(),
    rubro: z.string().max(100).optional(),
    modeloIngreso: z.string().max(100).optional(),
    tieneSocios: z.boolean().optional(),
    umbralAlerta: z.number().nonnegative().optional().nullable(),
    umbralCritico: z.number().nonnegative().optional().nullable(),
    rfc: z.string().max(13).optional(),
    direccion: z.string().optional(),
    telefono: z.string().max(30).optional(),
  })
  .refine(
    (data) =>
      data.umbralAlerta == null ||
      data.umbralCritico == null ||
      (typeof data.umbralAlerta === 'number' &&
        typeof data.umbralCritico === 'number' &&
        data.umbralCritico < data.umbralAlerta),
    { message: 'Umbral crítico debe ser menor que umbral de alerta', path: ['umbralCritico'] }
  )
  .refine((data) => Object.keys(data).length > 0, { message: 'Debe enviar al menos un campo para actualizar' });

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
        rubro: negocios.rubro,
        modeloIngreso: negocios.modeloIngreso,
        tieneSocios: negocios.tieneSocios,
        umbralAlerta: negocios.umbralAlerta,
        umbralCritico: negocios.umbralCritico,
        activo: negocios.activo,
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

export async function PUT(request: Request, context: { params: { id: string } }) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  const authz = authorizeRequest(auth, request.method);
  if (!authz.authorized) {
    return forbiddenResponse(authz.error);
  }

  if (auth.user!.rol !== 'Dueño') {
    return forbiddenResponse('Solo Dueño puede editar negocios');
  }

  try {
    const { id } = paramsSchema.parse(context.params);
    const negocioId = Number.parseInt(id, 10);
    const json = (await request.json()) as unknown;
    const parsed = updateSchema.parse(json);

    const [updated] = await db
      .update(negocios)
      .set({
        ...(parsed.nombre !== undefined ? { nombre: parsed.nombre } : {}),
        ...(parsed.rubro !== undefined ? { rubro: parsed.rubro?.trim() ? parsed.rubro : null } : {}),
        ...(parsed.modeloIngreso !== undefined
          ? { modeloIngreso: parsed.modeloIngreso?.trim() ? parsed.modeloIngreso : null }
          : {}),
        ...(parsed.tieneSocios !== undefined ? { tieneSocios: parsed.tieneSocios } : {}),
        ...(parsed.umbralAlerta !== undefined ? { umbralAlerta: parsed.umbralAlerta == null ? null : parsed.umbralAlerta.toString() } : {}),
        ...(parsed.umbralCritico !== undefined ? { umbralCritico: parsed.umbralCritico == null ? null : parsed.umbralCritico.toString() } : {}),
        ...(parsed.rfc !== undefined ? { rfc: parsed.rfc?.trim() ? parsed.rfc : null } : {}),
        ...(parsed.direccion !== undefined ? { direccion: parsed.direccion?.trim() ? parsed.direccion : null } : {}),
        ...(parsed.telefono !== undefined ? { telefono: parsed.telefono?.trim() ? parsed.telefono : null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(negocios.id, negocioId))
      .returning({
        id: negocios.id,
        nombre: negocios.nombre,
        rubro: negocios.rubro,
        modeloIngreso: negocios.modeloIngreso,
        tieneSocios: negocios.tieneSocios,
        umbralAlerta: negocios.umbralAlerta,
        umbralCritico: negocios.umbralCritico,
        activo: negocios.activo,
        rfc: negocios.rfc,
        direccion: negocios.direccion,
        telefono: negocios.telefono,
      });

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Negocio no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    const message = (error as Error).message || 'Error interno del servidor';
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

  if (auth.user!.rol !== 'Dueño') {
    return forbiddenResponse('Solo Dueño puede eliminar negocios');
  }

  try {
    const { id } = paramsSchema.parse(context.params);
    const negocioId = Number.parseInt(id, 10);

    const rows = await db
      .select({ totalMovimientos: sql<number>`COUNT(*)` })
      .from(movimientos)
      .where(and(eq(movimientos.negocioId, negocioId), eq(movimientos.activo, true)));

    const totalMovimientos = rows[0]?.totalMovimientos ?? 0;
    if (totalMovimientos > 0) {
      return NextResponse.json(
        { success: false, error: 'No se puede eliminar: el negocio tiene movimientos activos asociados' },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(negocios)
      .set({ activo: false, updatedAt: new Date() })
      .where(eq(negocios.id, negocioId))
      .returning({ id: negocios.id });

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Negocio no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    const message = (error as Error).message || 'Error interno del servidor';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
