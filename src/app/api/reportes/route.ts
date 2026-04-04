import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { ReporteService } from '@/services/reporte.service';

export const dynamic = 'force-dynamic';

const reporteService = new ReporteService();

const querySchema = z.object({
  fechaDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fechaDesde inválida'),
  fechaHasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fechaHasta inválida'),
  negocioId: z.coerce.number().int().positive().optional(),
});

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
    return forbiddenResponse('Solo Dueño y Socio pueden acceder a reportes');
  }

  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse({
      fechaDesde: searchParams.get('fechaDesde') ?? '',
      fechaHasta: searchParams.get('fechaHasta') ?? '',
      negocioId: searchParams.get('negocioId') ?? undefined,
    });

    const anio = Number.parseInt(parsed.fechaDesde.slice(0, 4), 10);
    if (!Number.isFinite(anio) || Number.isNaN(anio) || anio < 1900) {
      return NextResponse.json({ success: false, error: 'Año inválido' }, { status: 400 });
    }

    let negocioIds: number[] | undefined;
    if (typeof parsed.negocioId === 'number') {
      if (auth.user!.rol === 'Socio' && !auth.user!.negocios.includes(parsed.negocioId)) {
        return forbiddenResponse('Sin acceso a este negocio');
      }
      negocioIds = [parsed.negocioId];
    } else if (auth.user!.rol === 'Socio') {
      negocioIds = auth.user!.negocios;
    }

    const [
      resumenEjecutivo,
      ingresosPorMes,
      distribucionPorNegocio,
      tendenciaBalance,
      topCategoriasIngreso,
      topCategoriasEgreso,
      rankingNegocios,
    ] = await Promise.all([
      reporteService.getResumenEjecutivo({ negocioIds, fechaDesde: parsed.fechaDesde, fechaHasta: parsed.fechaHasta }),
      reporteService.getIngresosPorMes({ negocioIds, anio }),
      reporteService.getDistribucionPorNegocio({ fechaDesde: parsed.fechaDesde, fechaHasta: parsed.fechaHasta }),
      reporteService.getTendenciaBalance({ negocioIds, fechaDesde: parsed.fechaDesde, fechaHasta: parsed.fechaHasta }),
      reporteService.getTopCategorias({ negocioIds, fechaDesde: parsed.fechaDesde, fechaHasta: parsed.fechaHasta, tipo: 'INGRESO' }),
      reporteService.getTopCategorias({ negocioIds, fechaDesde: parsed.fechaDesde, fechaHasta: parsed.fechaHasta, tipo: 'EGRESO' }),
      reporteService.getRankingNegocios({ fechaDesde: parsed.fechaDesde, fechaHasta: parsed.fechaHasta }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        resumenEjecutivo,
        ingresosPorMes,
        distribucionPorNegocio,
        tendenciaBalance,
        topCategoriasIngreso,
        topCategoriasEgreso,
        rankingNegocios,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    const message = (error as Error).message || 'Error interno del servidor';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
