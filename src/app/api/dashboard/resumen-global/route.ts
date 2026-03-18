import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { MovimientoService } from '@/services/movimiento.service';

const movimientoService = new MovimientoService();

export const dynamic = 'force-dynamic';

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

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  const authz = authorizeRequest(auth, request.method);
  if (!authz.authorized) {
    return forbiddenResponse(authz.error);
  }

  if (auth.user!.rol !== 'Dueño' && auth.user!.rol !== 'Socio') {
    return forbiddenResponse('Solo Dueño y Socio pueden acceder a este resumen');
  }

  try {
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

    const negocioIds = auth.user!.rol === 'Dueño' ? undefined : auth.user!.negocios;

    if (Array.isArray(negocioIds) && negocioIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          resumenPorNegocio: [],
          totalesGlobales: { totalIngresos: 0, totalEgresos: 0, balance: 0 },
          negociosCriticos: [],
          negociosAlerta: [],
        },
        tenant: { negocioId: null, isOwner: false, negociosAccesibles: [] },
      });
    }

    const resumenPorNegocio = await movimientoService.obtenerResumenesFinancierosPorNegocio({
      negocioIds,
      fechaDesde,
      fechaHasta,
    });

    const totalesGlobales = resumenPorNegocio.reduce(
      (acc, row) => {
        acc.totalIngresos += row.totalIngresos;
        acc.totalEgresos += row.totalEgresos;
        acc.balance += row.balance;
        return acc;
      },
      { totalIngresos: 0, totalEgresos: 0, balance: 0 }
    );

    const negociosCriticos = resumenPorNegocio.filter((n) => n.semaforo === 'rojo');
    const negociosAlerta = resumenPorNegocio.filter((n) => n.semaforo === 'amarillo');

    const tenant = { negocioId: null, isOwner: auth.user!.rol === 'Dueño', negociosAccesibles: auth.user!.negocios };

    return NextResponse.json({
      success: true,
      data: { resumenPorNegocio, totalesGlobales, negociosCriticos, negociosAlerta },
      tenant,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    const message = (error as Error).message || 'Error interno del servidor';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
