import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { TenantError } from '@/middleware/tenant-middleware';
import { CuentaBancoService } from '@/services/cuenta_banco.service';

const cuentaBancoService = new CuentaBancoService();

export const dynamic = 'force-dynamic';

function formatLocalDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidYYYYMMDD(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parts = value.split('-');
  if (parts.length !== 3) return false;
  const y = Number.parseInt(parts[0]!, 10);
  const m = Number.parseInt(parts[1]!, 10);
  const d = Number.parseInt(parts[2]!, 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const paramsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID inválido'),
});

const querySchema = z.object({
  fechaCorte: z
    .string()
    .refine(isValidYYYYMMDD, 'fechaCorte debe tener formato YYYY-MM-DD')
    .optional(),
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
    if (auth.user!.rol !== 'Dueño' && auth.user!.rol !== 'Admin') {
      throw new TenantError('ACCESO_DENEGADO: Solo Dueño y Admin pueden ver el arqueo', 'ACCESO_DENEGADO');
    }

    const { id } = paramsSchema.parse(context.params);
    const negocioId = Number.parseInt(id, 10);

    if (auth.user!.rol !== 'Dueño' && !auth.user!.negocios.includes(negocioId)) {
      throw new TenantError('ACCESO_DENEGADO: No tienes acceso a este negocio', 'ACCESO_DENEGADO');
    }

    const { searchParams } = new URL(request.url);
    const parsedQuery = querySchema.parse({
      fechaCorte: searchParams.get('fechaCorte') ?? undefined,
    });
    const fechaCorte = parsedQuery.fechaCorte ?? formatLocalDateYYYYMMDD(new Date());

    const arqueo = await cuentaBancoService.calcularArqueoNegocio(negocioId, fechaCorte);
    if (!arqueo) {
      return NextResponse.json({ success: false, error: 'Negocio no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: arqueo });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }

    console.error('GET /api/negocios/:id/arqueo failed', { error });
    return handleServiceError(error);
  }
}

