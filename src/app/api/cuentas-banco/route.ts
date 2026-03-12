import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { TenantError, validateTenantAccess } from '@/middleware/tenant-middleware';
import { CuentaBancoService } from '@/services/cuenta_banco.service';

const cuentaBancoService = new CuentaBancoService();

const createCuentaBancoSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  tipo: z.enum(['EFECTIVO', 'BANCARIA', 'CAJA_CHICA']),
  bancoInstitucion: z.string().optional(),
  titular: z.string().optional(),
  negocioId: z.number().positive('Negocio requerido'),
  saldoInicial: z.number().min(0).optional(),
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

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  const authz = authorizeRequest(auth, request.method);
  if (!authz.authorized) {
    return forbiddenResponse(authz.error);
  }

  if (auth.user!.rol === 'Externo') {
    return forbiddenResponse('No tienes permisos para ver cuentas bancarias');
  }

  try {
    const tenant = validateTenantAccess(request, auth.user!);
    if (!tenant.negocioId) {
      return NextResponse.json({ success: false, error: 'SIN_NEGOCIO: Negocio requerido' }, { status: 400 });
    }

    const cuentas = await cuentaBancoService.listar(tenant.negocioId);
    return NextResponse.json({ success: true, data: cuentas, tenant });
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

  if (auth.user!.rol !== 'Dueño' && auth.user!.rol !== 'Admin') {
    return forbiddenResponse('Solo Dueño y Admin pueden crear cuentas bancarias');
  }

  try {
    const body: unknown = await request.json();
    const validated = createCuentaBancoSchema.parse(body);

    if (auth.user!.rol !== 'Dueño' && !auth.user!.negocios.includes(validated.negocioId)) {
      return forbiddenResponse('No tienes acceso a este negocio');
    }

    const cuenta = await cuentaBancoService.crear(validated);
    return NextResponse.json({ success: true, data: cuenta }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    return handleServiceError(error);
  }
}

