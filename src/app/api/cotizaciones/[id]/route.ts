import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auditLog, getRequestContext } from '@/lib/audit-logger';
import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { CotizacionError, CotizacionService } from '@/services/cotizacion.service';

const cotizacionService = new CotizacionService();

export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID inválido'),
});

const itemSchema = z.object({
  descripcion: z.string().min(1, 'Descripción requerida'),
  cantidad: z.number().positive('Cantidad debe ser positiva').optional(),
  unidadMedida: z.string().optional(),
  precioUnitario: z.number().positive('Precio unitario debe ser positivo').optional(),
  importe: z.number().positive('Importe debe ser positivo'),
});

const updateBodySchema = z.object({
  clienteNombre: z.string().min(1).optional(),
  clienteRfc: z.string().optional(),
  clienteDireccion: z.string().optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD').optional(),
  notas: z.string().optional(),
  categoriaId: z.number().int().positive().optional(),
  items: z.array(itemSchema).min(1, 'Debe incluir al menos un ítem').optional(),
});

function handleServiceError(error: unknown): NextResponse {
  if (error instanceof CotizacionError) {
    const status =
      error.code === 'FORBIDDEN' ? 403 : error.code === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
  const message = (error as Error).message || 'Error interno';
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
    const { id } = paramsSchema.parse(context.params);
    const cotizacionId = Number.parseInt(id, 10);

    const result = await cotizacionService.obtenerCotizacion(cotizacionId, {
      userId: auth.user!.userId,
      rol: auth.user!.rol,
    });

    if (!result) {
      return NextResponse.json({ success: false, error: 'Cotización no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    return handleServiceError(error);
  }
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

  if (auth.user!.rol === 'Externo') {
    return forbiddenResponse('Externo no puede actualizar cotizaciones');
  }

  try {
    const { id } = paramsSchema.parse(context.params);
    const cotizacionId = Number.parseInt(id, 10);
    const body: unknown = await request.json();
    const validated = updateBodySchema.parse(body);

    const updated = await cotizacionService.actualizarCotizacion(
      cotizacionId,
      validated,
      { userId: auth.user!.userId, rol: auth.user!.rol },
    );

    const ctx = getRequestContext(request);
    void auditLog({
      evento: 'COTIZACION_ACTUALIZADA',
      exitoso: true,
      userId: auth.user!.userId,
      negocioId: updated.negocioId,
      recurso: '/api/cotizaciones/[id]',
      recursoId: updated.id,
      detalles: { cotizacionId: updated.id },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }

    const ctx = getRequestContext(request);
    void auditLog({
      evento: 'COTIZACION_ACTUALIZADA',
      exitoso: false,
      userId: auth.user!.userId,
      recurso: '/api/cotizaciones/[id]',
      detalles: { error: (error as Error).message },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return handleServiceError(error);
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
    return forbiddenResponse('Solo Dueño y Admin pueden eliminar cotizaciones');
  }

  try {
    const { id } = paramsSchema.parse(context.params);
    const cotizacionId = Number.parseInt(id, 10);

    const deleted = await cotizacionService.eliminarCotizacion(cotizacionId, {
      userId: auth.user!.userId,
      rol: auth.user!.rol,
    });

    const ctx = getRequestContext(request);
    void auditLog({
      evento: 'COTIZACION_ELIMINADA',
      exitoso: true,
      userId: auth.user!.userId,
      negocioId: deleted.negocioId,
      recurso: '/api/cotizaciones/[id]',
      recursoId: deleted.id,
      detalles: { cotizacionId: deleted.id },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }

    const ctx = getRequestContext(request);
    void auditLog({
      evento: 'COTIZACION_ELIMINADA',
      exitoso: false,
      userId: auth.user!.userId,
      recurso: '/api/cotizaciones/[id]',
      detalles: { error: (error as Error).message },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return handleServiceError(error);
  }
}

