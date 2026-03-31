import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { TenantError, validateTenantAccess } from '@/middleware/tenant-middleware';
import { MovimientoService } from '@/services/movimiento.service';
import type { TipoMovimiento } from '@/types/movimiento.types';

const movimientoService = new MovimientoService();

const createMovimientoSchema = z
  .object({
    negocioId: z.number().positive('Negocio requerido'),
    centroCostoId: z.number().optional(),
    categoriaId: z.number().int().positive().optional(),
    tipo: z.enum(['INGRESO', 'EGRESO', 'TRASPASO_SALIDA']),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
    concepto: z.string().min(1, 'Concepto requerido'),
    tercero: z.string().optional(),
    monto: z.number().positive('Monto debe ser positivo'),
    cuentaBancoId: z.number().positive('Cuenta bancaria requerida'),
    cuentaBancoDestinoId: z.number().optional(),
    negocioDestinoId: z.number().optional(),
    efectuado: z.boolean().optional().default(false),
  })
  .refine((data) => data.tipo !== 'TRASPASO_SALIDA' || (!!data.cuentaBancoDestinoId && !!data.negocioDestinoId), {
    message: 'Traspaso requiere cuenta y negocio de destino',
  });

const listQuerySchema = z.object({
  negocioId: z.preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().positive().optional()),
  estado: z.enum(['PENDIENTE', 'APROBADO', 'RECHAZADO', 'PAGADO', 'CANCELADO']).optional(),
  tipo: z.enum(['INGRESO', 'EGRESO', 'TRASPASO_SALIDA', 'TRASPASO_ENTRADA']).optional(),
  fechaDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD').optional(),
  fechaHasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD').optional(),
  cuentaBancoId: z.preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().positive().optional()),
  page: z.preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().int().positive().optional()),
  limit: z.preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().int().positive().optional()),
});

function handleServiceError(error: unknown): NextResponse {
  if (error instanceof TenantError) {
    const status = error.code === 'ACCESO_DENEGADO' ? 403 : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
  const rawMessage = (error as Error).message || 'Error interno';
  const anyError = error as {
    message?: string;
    cause?: { code?: string; message?: string };
  };

  const dbCode = typeof anyError?.cause?.code === 'string' ? anyError.cause.code : undefined;
  const dbMessage = typeof anyError?.cause?.message === 'string' ? anyError.cause.message : undefined;
  const isFailedQuery = typeof anyError?.message === 'string' && anyError.message.startsWith('Failed query:');

  if (isFailedQuery) {
    console.error('DB query failed', { dbCode, dbMessage });
    const isProd = process.env.NODE_ENV === 'production';
    return NextResponse.json(
      {
        success: false,
        error: isProd ? 'Error interno' : 'Error de base de datos',
        ...(isProd ? {} : { dbCode, dbMessage }),
      },
      { status: 500 }
    );
  }

  const message = rawMessage;
  if (message.includes('no encontrado') || message.includes('not found')) {
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }
  if (message.startsWith('Solo se pueden')) {
    return NextResponse.json({ success: false, error: message }, { status: 409 });
  }
  if (message.includes('Solo') || message.includes('permisos') || message.includes('creador')) {
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

export const dynamic = 'force-dynamic';

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
    const { searchParams } = new URL(request.url);
    const parsed = listQuerySchema.parse({
      negocioId: searchParams.get('negocioId') ?? undefined,
      estado: searchParams.get('estado') ?? undefined,
      tipo: searchParams.get('tipo') ?? undefined,
      fechaDesde: searchParams.get('fechaDesde') ?? undefined,
      fechaHasta: searchParams.get('fechaHasta') ?? undefined,
      cuentaBancoId: searchParams.get('cuentaBancoId') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });

    const negocioId = parsed.negocioId ?? tenant.negocioId;

    if (tenant.negocioId !== null && negocioId !== tenant.negocioId) {
      return forbiddenResponse('No tienes acceso a este negocio');
    }

    if (!negocioId) {
      const page = parsed.page ?? 1;
      const limit = parsed.limit ?? 50;
      return NextResponse.json(
        {
          success: true,
          data: { items: [], movimientos: [], total: 0, page, limit, totalPages: 0 },
          tenant,
        },
        { status: 200 }
      );
    }

    const filtros = {
      negocioId,
      estado: parsed.estado,
      tipo: parsed.tipo as TipoMovimiento | undefined,
      fechaDesde: parsed.fechaDesde,
      fechaHasta: parsed.fechaHasta,
      cuentaBancoId: parsed.cuentaBancoId,
      page: parsed.page,
      limit: parsed.limit,
      creadoPorId: auth.user!.rol === 'Externo' ? auth.user!.userId : undefined,
    };

    const movimientos = await movimientoService.listar(filtros);
    const totalPages = movimientos.limit > 0 ? Math.ceil(movimientos.total / movimientos.limit) : 0;
    return NextResponse.json({
      success: true,
      data: { ...movimientos, movimientos: movimientos.items, totalPages },
      tenant,
    });
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

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  const authz = authorizeRequest(auth, request.method);
  if (!authz.authorized) {
    return forbiddenResponse(authz.error);
  }

  try {
    validateTenantAccess(request, auth.user!);
    const body: unknown = await request.json();
    const validated = createMovimientoSchema.parse(body);

    if (auth.user!.rol !== 'Dueño' && !auth.user!.negocios.includes(validated.negocioId)) {
      return forbiddenResponse('No tienes acceso a este negocio');
    }

    const created = await movimientoService.crear(validated, auth.user!.userId);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    return handleServiceError(error);
  }
}

