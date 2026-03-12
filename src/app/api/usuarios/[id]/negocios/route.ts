import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { validateTenantAccess } from '@/middleware/tenant-middleware';
import { assignNegociosToUsuario, getUsuarioById } from '@/services/usuario.service';
import type { RoleName } from '@/types/permissions.types';

export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID inválido'),
});

const assignNegociosSchema = z.object({
  negocios: z.array(z.number().int().positive()).min(1, 'Al menos un negocio requerido'),
});

function canAccessUsuarioByTenant(
  tenant: { isOwner: boolean; negocioId: number | null },
  usuario: { negocios: number[] }
): boolean {
  if (tenant.isOwner) return true;
  if (tenant.negocioId === null) return false;
  return usuario.negocios.includes(tenant.negocioId);
}

function canAssignNegociosByRole(actor: { rol: RoleName; negocios: number[] }, targetNegocios: number[]): boolean {
  if (actor.rol === 'Dueño') return true;
  if (actor.rol !== 'Admin') return false;
  return targetNegocios.every((id) => actor.negocios.includes(id));
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
    return forbiddenResponse('No tienes permisos para asignar negocios');
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
    const validated = assignNegociosSchema.parse(body);

    const actor = { rol: auth.user!.rol as RoleName, negocios: auth.user!.negocios };
    if (!canAssignNegociosByRole(actor, validated.negocios)) {
      return forbiddenResponse('Sin acceso a uno o más negocios');
    }

    const updated = await assignNegociosToUsuario(userId, validated.negocios);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Error inesperado';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
