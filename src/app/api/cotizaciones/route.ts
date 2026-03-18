import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auditLog, getRequestContext } from '@/lib/audit-logger';
import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { CotizacionError, CotizacionService } from '@/services/cotizacion.service';
import type { EstadoCotizacion } from '@/types/cotizacion.types';

const cotizacionService = new CotizacionService();

export const dynamic = 'force-dynamic';

const listQuerySchema = z.object({
  negocioId: z.preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().int().positive().optional()),
  estado: z.enum(['BORRADOR', 'ENVIADA', 'APROBADA', 'FACTURADA', 'CANCELADA']).optional(),
  fechaDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD').optional(),
  fechaHasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD').optional(),
  busqueda: z.string().optional(),
  page: z.preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().int().positive().optional()),
  limit: z.preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().int().positive().optional()),
});

const itemSchema = z.object({
  descripcion: z.string().min(1, 'Descripción requerida'),
  cantidad: z.number().positive('Cantidad debe ser positiva').optional(),
  unidadMedida: z.string().optional(),
  precioUnitario: z.number().positive('Precio unitario debe ser positivo').optional(),
  importe: z.number().positive('Importe debe ser positivo'),
});

const createBodySchema = z.object({
  negocioId: z.number().int().positive('Negocio requerido'),
  clienteNombre: z.string().min(1, 'Nombre del cliente requerido'),
  clienteRfc: z.string().optional(),
  clienteDireccion: z.string().optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  notas: z.string().optional(),
  categoriaId: z.number().int().positive().optional(),
  items: z.array(itemSchema).min(1, 'Debe incluir al menos un ítem'),
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
    const { searchParams } = new URL(request.url);
    const parsed = listQuerySchema.parse({
      negocioId: searchParams.get('negocioId') ?? undefined,
      estado: searchParams.get('estado') ?? undefined,
      fechaDesde: searchParams.get('fechaDesde') ?? undefined,
      fechaHasta: searchParams.get('fechaHasta') ?? undefined,
      busqueda: searchParams.get('busqueda') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });

    const result = await cotizacionService.listarCotizaciones({
      negocioId: parsed.negocioId,
      estado: parsed.estado as EstadoCotizacion | undefined,
      fechaDesde: parsed.fechaDesde,
      fechaHasta: parsed.fechaHasta,
      busqueda: parsed.busqueda,
      page: parsed.page,
      limit: parsed.limit,
      userId: auth.user!.userId,
      rol: auth.user!.rol,
    });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    return handleServiceError(error);
  }
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  if (auth.user!.rol !== 'Externo') {
    const authz = authorizeRequest(auth, request.method);
    if (!authz.authorized) {
      return forbiddenResponse(authz.error);
    }
  }

  try {
    const body: unknown = await request.json();
    const validated = createBodySchema.parse(body);

    if (auth.user!.rol !== 'Dueño' && !auth.user!.negocios.includes(validated.negocioId)) {
      return forbiddenResponse('No tienes acceso a este negocio');
    }

    const created = await cotizacionService.crearCotizacion({
      negocioId: validated.negocioId,
      clienteNombre: validated.clienteNombre,
      clienteRfc: validated.clienteRfc,
      clienteDireccion: validated.clienteDireccion,
      fecha: validated.fecha,
      notas: validated.notas,
      categoriaId: validated.categoriaId,
      items: validated.items,
      creadoPor: auth.user!.userId,
    });

    const ctx = getRequestContext(request);
    void auditLog({
      evento: 'COTIZACION_CREADA',
      exitoso: true,
      userId: auth.user!.userId,
      negocioId: validated.negocioId,
      recurso: '/api/cotizaciones',
      recursoId: created.id,
      detalles: { cotizacionId: created.id },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }

    const ctx = getRequestContext(request);
    void auditLog({
      evento: 'COTIZACION_CREADA',
      exitoso: false,
      userId: auth.user!.userId,
      recurso: '/api/cotizaciones',
      detalles: { error: (error as Error).message },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return handleServiceError(error);
  }
}

