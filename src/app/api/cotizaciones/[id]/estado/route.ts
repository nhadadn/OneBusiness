import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auditLog, getRequestContext } from '@/lib/audit-logger';
import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { CotizacionError, CotizacionService } from '@/services/cotizacion.service';
import type { EstadoCotizacion } from '@/types/cotizacion.types';

const cotizacionService = new CotizacionService();

export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID inválido'),
});

const bodySchema = z.object({
  estado: z.enum(['BORRADOR', 'ENVIADA', 'APROBADA', 'FACTURADA', 'CANCELADA']),
  numeroOc: z.string().optional(),
  numeroFactura: z.string().optional(),
  cuentaBancoId: z.number().int().positive().optional(),
  categoriaId: z.number().int().positive().optional(),
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

export async function PATCH(request: Request, context: { params: { id: string } }) {
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
    const body: unknown = await request.json();
    const validated = bodySchema.parse(body);

    if (validated.estado === 'APROBADA' && !validated.numeroOc) {
      return NextResponse.json({ success: false, error: 'numeroOc es requerido para aprobar' }, { status: 400 });
    }
    if (validated.estado === 'FACTURADA' && !validated.numeroFactura) {
      return NextResponse.json({ success: false, error: 'numeroFactura es requerido para facturar' }, { status: 400 });
    }
    if (validated.estado === 'FACTURADA' && !validated.cuentaBancoId) {
      return NextResponse.json({ success: false, error: 'cuentaBancoId es requerido para facturar' }, { status: 400 });
    }

    const updated = await cotizacionService.cambiarEstado(
      cotizacionId,
      {
        nuevoEstado: validated.estado as EstadoCotizacion,
        numeroOc: validated.numeroOc,
        numeroFactura: validated.numeroFactura,
        cuentaBancoId: validated.cuentaBancoId,
        categoriaId: validated.categoriaId,
        aprobadoPor: auth.user!.userId,
      },
      { userId: auth.user!.userId, rol: auth.user!.rol },
    );

    const ctx = getRequestContext(request);
    const evento =
      validated.estado === 'APROBADA'
        ? 'COTIZACION_APROBADA'
        : validated.estado === 'FACTURADA'
          ? 'COTIZACION_FACTURADA'
          : validated.estado === 'CANCELADA'
            ? 'COTIZACION_CANCELADA'
            : 'COTIZACION_ACTUALIZADA';

    void auditLog({
      evento,
      exitoso: true,
      userId: auth.user!.userId,
      negocioId: updated.negocioId,
      recurso: '/api/cotizaciones/[id]/estado',
      recursoId: updated.id,
      detalles: { cotizacionId: updated.id, estado: updated.estado },
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
      recurso: '/api/cotizaciones/[id]/estado',
      detalles: { error: (error as Error).message },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return handleServiceError(error);
  }
}
