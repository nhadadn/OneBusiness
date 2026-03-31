import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { TenantError } from '@/middleware/tenant-middleware';
import { CuentaBancoService } from '@/services/cuenta_banco.service';

const cuentaBancoService = new CuentaBancoService();

const paramsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID inválido'),
});

const bodySchema = z.object({
  negocioId: z.number().positive('ID de negocio inválido'),
});

function handleServiceError(error: unknown): NextResponse {
  if (error instanceof TenantError) {
    const status = error.code === 'ACCESO_DENEGADO' ? 403 : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }

  const message = (error as Error).message || 'Error interno';
  if (message.includes('no encontrada') || message.includes('no encontrado')) {
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }
  if (message.includes('No se puede')) {
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: { id: string } }) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  const authz = authorizeRequest(auth, request.method);
  if (!authz.authorized) {
    return forbiddenResponse(authz.error);
  }

  if (auth.user!.rol !== 'Dueño') {
    return forbiddenResponse('Solo Dueño puede asignar cuentas a negocios');
  }

  try {
    const { id } = paramsSchema.parse(context.params);
    const cuentaId = Number.parseInt(id, 10);

    const body: unknown = await request.json();
    const { negocioId } = bodySchema.parse(body);

    const updated = await cuentaBancoService.asignarNegocio(cuentaId, negocioId);
    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
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

  if (auth.user!.rol !== 'Dueño') {
    return forbiddenResponse('Solo Dueño puede remover cuentas de negocios');
  }

  try {
    const { id } = paramsSchema.parse(context.params);
    const cuentaId = Number.parseInt(id, 10);

    const body: unknown = await request.json();
    const { negocioId } = bodySchema.parse(body);

    const updated = await cuentaBancoService.removerNegocio(cuentaId, negocioId);
    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    return handleServiceError(error);
  }
}
