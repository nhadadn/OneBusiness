import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';

import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { TenantError, validateTenantAccess } from '@/middleware/tenant-middleware';
import { db } from '@/lib/db';
import { negocios, usuarioNegocio } from '@/lib/drizzle';
import { getNegocios } from '@/services/negocio.service';
import type { RoleName } from '@/types/permissions.types';

export const dynamic = 'force-dynamic';

const createNegocioSchema = z
  .object({
    nombre: z.string().min(1, 'Nombre requerido').max(255, 'Máximo 255 caracteres').trim(),
    rubro: z.string().max(100, 'Máximo 100 caracteres').optional(),
    modeloIngreso: z.string().max(100, 'Máximo 100 caracteres').optional(),
    tieneSocios: z.boolean().optional().default(false),
    umbralAlerta: z.number().nonnegative().optional().nullable(),
    umbralCritico: z.number().nonnegative().optional().nullable(),
    rfc: z.string().max(13, 'Máximo 13 caracteres').optional(),
    direccion: z.string().optional(),
    telefono: z.string().max(30, 'Máximo 30 caracteres').optional(),
  })
  .refine(
    (data) =>
      data.umbralAlerta == null ||
      data.umbralCritico == null ||
      (typeof data.umbralAlerta === 'number' &&
        typeof data.umbralCritico === 'number' &&
        data.umbralCritico < data.umbralAlerta),
    {
      message: 'Umbral crítico debe ser menor que umbral de alerta',
      path: ['umbralCritico'],
    }
  );

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
    const tenant = validateTenantAccess(request, auth.user!);
    const negocios = await getNegocios(
      { negocioId: tenant.negocioId ?? undefined },
      { rol: auth.user!.rol as RoleName, negocios: auth.user!.negocios }
    );

    return NextResponse.json({ success: true, data: negocios, tenant });
  } catch (error) {
    if (error instanceof TenantError) {
      const status = error.code === 'ACCESO_DENEGADO' ? 403 : 400;
      return NextResponse.json({ success: false, error: error.message }, { status });
    }
    throw error;
  }
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  const authz = authorizeRequest(auth, request.method);
  if (!authz.authorized) {
    return forbiddenResponse(authz.error);
  }

  if (auth.user!.rol !== 'Dueño') {
    return forbiddenResponse('Solo Dueño puede crear negocios');
  }

  try {
    const json = (await request.json()) as unknown;
    const parsed = createNegocioSchema.parse(json);

    const created = await db.transaction(async (tx) => {
      const [negocio] = await tx
        .insert(negocios)
        .values({
          nombre: parsed.nombre,
          rubro: parsed.rubro?.trim() ? parsed.rubro : null,
          modeloIngreso: parsed.modeloIngreso?.trim() ? parsed.modeloIngreso : null,
          tieneSocios: parsed.tieneSocios ?? false,
          umbralAlerta: parsed.umbralAlerta == null ? null : parsed.umbralAlerta.toString(),
          umbralCritico: parsed.umbralCritico == null ? null : parsed.umbralCritico.toString(),
          rfc: parsed.rfc?.trim() ? parsed.rfc : null,
          direccion: parsed.direccion?.trim() ? parsed.direccion : null,
          telefono: parsed.telefono?.trim() ? parsed.telefono : null,
          activo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!negocio) {
        throw new Error('No se pudo crear negocio');
      }

      const existingRel = await tx
        .select({ id: usuarioNegocio.id })
        .from(usuarioNegocio)
        .where(and(eq(usuarioNegocio.usuarioId, auth.user!.userId), eq(usuarioNegocio.negocioId, negocio.id)))
        .limit(1);

      if (!existingRel[0]) {
        await tx.insert(usuarioNegocio).values({ usuarioId: auth.user!.userId, negocioId: negocio.id }).returning();
      }

      return negocio;
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    if (error instanceof TenantError) {
      const status = error.code === 'ACCESO_DENEGADO' ? 403 : 400;
      return NextResponse.json({ success: false, error: error.message }, { status });
    }
    const message = (error as Error).message || 'Error interno del servidor';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
