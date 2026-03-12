import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { TenantError, validateTenantAccess } from '@/middleware/tenant-middleware';
import { deleteUsuario, getUsuarioById, updateUsuario } from '@/services/usuario.service';

export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID inválido'),
});

const updateUsuarioSchema = z
  .object({
    nombreCompleto: z.string().min(1, 'Nombre requerido').optional(),
    email: z.string().email('Email inválido').optional(),
    password: z.string().min(6, 'Password mínimo 6 caracteres').optional(),
    rolId: z.number().int().positive('Rol requerido').optional(),
    activo: z.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: 'Debe enviar al menos un campo a actualizar' });

function canAccessUsuarioByTenant(
  tenant: { isOwner: boolean; negocioId: number | null },
  usuario: { negocios: number[] }
): boolean {
  if (tenant.isOwner) return true;
  if (tenant.negocioId === null) return false;
  return usuario.negocios.includes(tenant.negocioId);
}

export async function GET(request: Request, ctx: { params: { id: string } }) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  const authz = authorizeRequest(auth, request.method);
  if (!authz.authorized) {
    return forbiddenResponse(authz.error);
  }

  try {
    const { id } = paramsSchema.parse(ctx.params);
    const userId = Number.parseInt(id, 10);

    const tenant = validateTenantAccess(request, auth.user!);
    const usuario = await getUsuarioById(userId);
    if (!usuario) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (!canAccessUsuarioByTenant(tenant, usuario)) {
      return forbiddenResponse('Sin acceso a este usuario');
    }

    return NextResponse.json({ success: true, data: usuario });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof TenantError) {
      const status = error.code === 'ACCESO_DENEGADO' ? 403 : 400;
      return NextResponse.json({ success: false, error: error.message }, { status });
    }
    console.error('Usuario GET by id error', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request: Request, ctx: { params: { id: string } }) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  const authz = authorizeRequest(auth, request.method);
  if (!authz.authorized) {
    return forbiddenResponse(authz.error);
  }

  if (auth.user!.rol !== 'Dueño' && auth.user!.rol !== 'Admin') {
    return forbiddenResponse('No tienes permisos para actualizar usuarios');
  }

  try {
    const { id } = paramsSchema.parse(ctx.params);
    const userId = Number.parseInt(id, 10);
    const tenant = validateTenantAccess(request, auth.user!);

    const existing = await getUsuarioById(userId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (!canAccessUsuarioByTenant(tenant, existing)) {
      return forbiddenResponse('Sin acceso a este usuario');
    }

    const body: unknown = await request.json();
    const validated = updateUsuarioSchema.parse(body);

    const updated = await updateUsuario(userId, validated);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : 'Error inesperado';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, ctx: { params: { id: string } }) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  const authz = authorizeRequest(auth, request.method);
  if (!authz.authorized) {
    return forbiddenResponse(authz.error);
  }

  if (auth.user!.rol !== 'Dueño' && auth.user!.rol !== 'Admin') {
    return forbiddenResponse('No tienes permisos para eliminar usuarios');
  }

  try {
    const { id } = paramsSchema.parse(ctx.params);
    const userId = Number.parseInt(id, 10);
    const tenant = validateTenantAccess(request, auth.user!);

    const existing = await getUsuarioById(userId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (!canAccessUsuarioByTenant(tenant, existing)) {
      return forbiddenResponse('Sin acceso a este usuario');
    }

    const result = await deleteUsuario(userId);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : 'Error inesperado';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
