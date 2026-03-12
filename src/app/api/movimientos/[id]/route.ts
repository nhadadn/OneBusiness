import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { TenantError, validateTenantAccess } from '@/middleware/tenant-middleware';
import { MovimientoService } from '@/services/movimiento.service';

export const dynamic = 'force-dynamic';

const movimientoService = new MovimientoService();

const paramsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID inválido'),
});

const updateMovimientoSchema = z
  .object({
    concepto: z.string().min(1).optional(),
    tercero: z.string().optional(),
    monto: z.number().positive().optional(),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    centroCostoId: z.number().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: 'Debe enviar al menos un campo a actualizar' });

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

    if (auth.user!.rol === 'Externo' && movimiento.creadoPor !== auth.user!.userId) {
      return forbiddenResponse('Solo puedes acceder a tus movimientos');
    }

    const detalle = await movimientoService.obtenerDetalle(movimientoId);
    if (!detalle) {
      return NextResponse.json({ success: false, error: 'Movimiento no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: detalle, tenant });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    if (error instanceof TenantError) {
      const status = error.code === 'ACCESO_DENEGADO' ? 403 : 400;
      return NextResponse.json({ success: false, error: error.message }, { status });
    }
    return handleServiceError(error);
  }
}

async function updateMovimiento(request: Request, context: { params: { id: string } }) {
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
    const { id } = paramsSchema.parse(context.params);
    const movimientoId = Number.parseInt(id, 10);

    const current = await movimientoService.obtener(movimientoId);
    if (!current || !current.activo) {
      return NextResponse.json({ success: false, error: 'Movimiento no encontrado' }, { status: 404 });
    }

    if (tenant.negocioId !== null && current.negocioId !== tenant.negocioId) {
      return NextResponse.json({ success: false, error: 'Movimiento no encontrado' }, { status: 404 });
    }

    const isOwnerOrAdmin = auth.user!.rol === 'Dueño' || auth.user!.rol === 'Admin';
    const isCreator = current.creadoPor === auth.user!.userId;

    if (current.estado === 'PENDIENTE') {
      if (!isCreator && !isOwnerOrAdmin) {
        return forbiddenResponse('Solo el creador o Dueño/Admin pueden editar');
      }
    } else if (current.estado === 'APROBADO') {
      if (!isOwnerOrAdmin) {
        return forbiddenResponse('Solo Dueño/Admin pueden editar movimientos aprobados');
      }
    } else if (current.estado === 'RECHAZADO') {
      if (!isCreator) {
        return forbiddenResponse('Solo el creador puede editar un movimiento rechazado');
      }
    }

    const body: unknown = await request.json();
    const validated = updateMovimientoSchema.parse(body);

    const updated = await movimientoService.actualizar(movimientoId, validated, auth.user!.userId);
    return NextResponse.json({ success: true, data: updated, tenant });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    if (error instanceof TenantError) {
      const status = error.code === 'ACCESO_DENEGADO' ? 403 : 400;
      return NextResponse.json({ success: false, error: error.message }, { status });
    }
    return handleServiceError(error);
  }
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  return updateMovimiento(request, context);
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

  try {
    const tenant = validateTenantAccess(request, auth.user!);
    const { id } = paramsSchema.parse(context.params);
    const movimientoId = Number.parseInt(id, 10);

    const current = await movimientoService.obtener(movimientoId);
    if (!current || !current.activo) {
      return NextResponse.json({ success: false, error: 'Movimiento no encontrado' }, { status: 404 });
    }

    if (tenant.negocioId !== null && current.negocioId !== tenant.negocioId) {
      return NextResponse.json({ success: false, error: 'Movimiento no encontrado' }, { status: 404 });
    }

    if (auth.user!.rol !== 'Dueño' && auth.user!.rol !== 'Admin') {
      return forbiddenResponse('Solo Dueño y Admin pueden eliminar movimientos');
    }

    const deleted = await movimientoService.eliminar(movimientoId);
    return NextResponse.json({ success: true, data: deleted, tenant });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    if (error instanceof TenantError) {
      const status = error.code === 'ACCESO_DENEGADO' ? 403 : 400;
      return NextResponse.json({ success: false, error: error.message }, { status });
    }
    return handleServiceError(error);
  }
}
