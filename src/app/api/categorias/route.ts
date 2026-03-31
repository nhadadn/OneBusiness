import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { TenantError, validateTenantAccess } from '@/middleware/tenant-middleware';
import { CategoriaService } from '@/services/categoria.service';

const categoriaService = new CategoriaService();

const tipoSchema = z.enum(['ingreso', 'egreso']);

const listQuerySchema = z.object({
  tipo: tipoSchema.optional(),
});

const crearCategoriaSchema = z
  .object({
    nombre: z.string().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres').trim(),
    tipo: tipoSchema,
    esGlobal: z.boolean().optional().default(false),
    requiereAprobacion: z.boolean().optional(),
    montoMaxSinAprobacion: z.string().optional().nullable(),
  })
  .refine((data) => data.requiereAprobacion !== false || data.montoMaxSinAprobacion == null, {
    message: 'montoMaxSinAprobacion debe ser null cuando requiereAprobacion=false',
    path: ['montoMaxSinAprobacion'],
  });

function handleServiceError(error: unknown): NextResponse {
  if (error instanceof TenantError) {
    const status = error.code === 'ACCESO_DENEGADO' ? 403 : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }

  const message = (error as Error).message || 'Error interno del servidor';
  if (message.includes('Ya existe')) {
    return NextResponse.json({ success: false, error: message }, { status: 409 });
  }
  if (message.includes('no encontrada')) {
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }
  if (message.includes('Sin permisos') || message.includes('Solo el Dueño') || message.includes('Sin acceso')) {
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
  if (message.includes('inválido') || message.includes('demasiado')) {
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  return NextResponse.json({ success: false, error: message }, { status: 500 });
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
    if (!tenant.negocioId) {
      return NextResponse.json({ success: false, error: 'SIN_NEGOCIO: Negocio requerido' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const query = listQuerySchema.parse({
      tipo: searchParams.get('tipo') ?? undefined,
    });

    const data = await categoriaService.listarCategorias(tenant.negocioId, query.tipo);
    return NextResponse.json({ success: true, data });
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

  const authz = authorizeRequest(auth, request.method);
  if (!authz.authorized) {
    return forbiddenResponse(authz.error);
  }

  if (auth.user!.rol === 'Externo') {
    return forbiddenResponse('Sin permisos');
  }

  try {
    const tenant = validateTenantAccess(request, auth.user!);
    if (!tenant.negocioId) {
      return NextResponse.json({ success: false, error: 'SIN_NEGOCIO: Negocio requerido' }, { status: 400 });
    }

    const body: unknown = await request.json();
    const validated = crearCategoriaSchema.parse(body);

    const categoria = await categoriaService.crearCategoria(tenant.negocioId, auth.user!.rol, validated);
    return NextResponse.json({ success: true, data: categoria }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    return handleServiceError(error);
  }
}

