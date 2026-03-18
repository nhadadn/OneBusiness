import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { MovimientoService } from '@/services/movimiento.service';

const movimientoService = new MovimientoService();

export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID inválido'),
});

const querySchema = z.object({
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
});

function formatLocalDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDateParam(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Fecha inválida');
  }
  return parsed.toISOString().slice(0, 10);
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
    const negocioId = Number.parseInt(id, 10);

    if (auth.user!.rol !== 'Dueño' && !auth.user!.negocios.includes(negocioId)) {
      return forbiddenResponse('No tienes acceso a este negocio');
    }

    const { searchParams } = new URL(request.url);
    const parsedQuery = querySchema.parse({
      fechaDesde: searchParams.get('fechaDesde') ?? undefined,
      fechaHasta: searchParams.get('fechaHasta') ?? undefined,
    });

    const now = new Date();
    const defaultDesde = formatLocalDateYYYYMMDD(new Date(now.getFullYear(), now.getMonth(), 1));
    const defaultHasta = formatLocalDateYYYYMMDD(now);

    const fechaDesde = parsedQuery.fechaDesde ? normalizeDateParam(parsedQuery.fechaDesde) : defaultDesde;
    const fechaHasta = parsedQuery.fechaHasta ? normalizeDateParam(parsedQuery.fechaHasta) : defaultHasta;

    const resumen = await movimientoService.obtenerResumenFinanciero({ negocioId, fechaDesde, fechaHasta });
    if (!resumen) {
      return NextResponse.json({ success: false, error: 'Negocio no encontrado' }, { status: 404 });
    }

    const tenant = { negocioId, isOwner: auth.user!.rol === 'Dueño', negociosAccesibles: auth.user!.negocios };
    return NextResponse.json({ success: true, data: resumen, tenant });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    const message = (error as Error).message || 'Error interno del servidor';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
