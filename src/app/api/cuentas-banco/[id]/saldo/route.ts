import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { TenantError, validateTenantAccess } from '@/middleware/tenant-middleware';
import { CuentaBancoService } from '@/services/cuenta_banco.service';

const cuentaBancoService = new CuentaBancoService();

const paramsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID inválido'),
});

const updateSaldoSchema = z.object({
  saldoReal: z.number().min(0, 'Saldo no puede ser negativo'),
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
    return forbiddenResponse('Solo Dueño y Admin pueden actualizar saldo');
  }

  try {
    validateTenantAccess(request, auth.user!);
    const { id } = paramsSchema.parse(context.params);
    const cuentaId = Number.parseInt(id, 10);

    const existing = await cuentaBancoService.obtener(cuentaId);
    if (!existing || !existing.activo) {
      return NextResponse.json({ success: false, error: 'Cuenta no encontrada' }, { status: 404 });
    }

    if (auth.user!.rol !== 'Dueño' && existing.negocioId !== null && !auth.user!.negocios.includes(existing.negocioId)) {
      throw new TenantError('ACCESO_DENEGADO: No tienes acceso a este negocio', 'ACCESO_DENEGADO');
    }

    const body: unknown = await request.json();
    const validated = updateSaldoSchema.parse(body);

    const updated = await cuentaBancoService.actualizarSaldoReal(cuentaId, validated.saldoReal);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    return handleServiceError(error);
  }
}

