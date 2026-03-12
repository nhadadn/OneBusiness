import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { TenantError, validateTenantAccess } from '@/middleware/tenant-middleware';
import { MovimientoService } from '@/services/movimiento.service';

const movimientoService = new MovimientoService();

const paramsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID inválido'),
});

function handleServiceError(error: unknown): NextResponse {
  if (error instanceof TenantError) {
    const status = error.code === 'ACCESO_DENEGADO' ? 403 : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
  const message = (error as Error).message || 'Error interno';
  if (message.includes('no encontrado') || message.includes('not found')) {
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }
  if (message.includes('Solo') || message.includes('permisos') || message.includes('creador')) {
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
  if (message.includes('Solo se pueden') || message.includes('estado')) {
    return NextResponse.json({ success: false, error: message }, { status: 409 });
  }
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

export const dynamic = 'force-dynamic';

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
    return forbiddenResponse('Solo Dueño y Admin pueden aprobar movimientos');
  }

  try {
    const tenant = validateTenantAccess(request, auth.user!);
    const { id } = paramsSchema.parse(context.params);
    const movimientoId = Number.parseInt(id, 10);

    const movimiento = await movimientoService.obtener(movimientoId);
    if (!movimiento || !movimiento.activo) {
      return NextResponse.json({ success: false, error: 'Movimiento no encontrado' }, { status: 404 });
    }

    if (tenant.negocioId !== null && movimiento.negocioId !== tenant.negocioId) {
      return NextResponse.json({ success: false, error: 'Movimiento no encontrado' }, { status: 404 });
    }

    const aprobado = await movimientoService.aprobar({ movimientoId, aprobadoPor: auth.user!.userId });
    return NextResponse.json({ success: true, data: aprobado, tenant });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    return handleServiceError(error);
  }
}

