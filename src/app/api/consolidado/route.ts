import { NextResponse } from 'next/server';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db';
import { movimientos, negocios as negociosTable } from '@/lib/drizzle';
import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { CuentaBancoService } from '@/services/cuenta_banco.service';
import type { EstadoMovimiento, TipoMovimiento } from '@/types/movimiento.types';
import type { ConsolidadoData, ConsolidadoFilters, ConsolidadoNegocioItem } from '@/types/negocio.types';

export const dynamic = 'force-dynamic';

const cuentaBancoService = new CuentaBancoService();

const querySchema = z.object({
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
  tipo: z.enum(['INGRESO', 'EGRESO', 'TRASPASO_SALIDA', 'TRASPASO_ENTRADA']).optional(),
  estado: z.enum(['PENDIENTE', 'APROBADO', 'RECHAZADO', 'PAGADO', 'CANCELADO']).optional(),
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

function parseMoney(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
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

  if (auth.user!.rol !== 'Dueño') {
    return forbiddenResponse('Solo Dueño puede acceder al consolidado');
  }

  try {
    const { searchParams } = new URL(request.url);
    const parsedQuery = querySchema.parse({
      fechaDesde: searchParams.get('fechaDesde') ?? undefined,
      fechaHasta: searchParams.get('fechaHasta') ?? undefined,
      tipo: (searchParams.get('tipo') ?? undefined) as TipoMovimiento | undefined,
      estado: (searchParams.get('estado') ?? undefined) as EstadoMovimiento | undefined,
    });

    const now = new Date();
    const defaultDesde = formatLocalDateYYYYMMDD(new Date(now.getFullYear(), now.getMonth(), 1));
    const defaultHasta = formatLocalDateYYYYMMDD(now);

    const fechaDesde = parsedQuery.fechaDesde ? normalizeDateParam(parsedQuery.fechaDesde) : defaultDesde;
    const fechaHasta = parsedQuery.fechaHasta ? normalizeDateParam(parsedQuery.fechaHasta) : defaultHasta;
    if (fechaDesde > fechaHasta) {
      return NextResponse.json({ success: false, error: 'Datos inválidos: fechaDesde no puede ser mayor a fechaHasta' }, { status: 400 });
    }

    const estadoAplicado: EstadoMovimiento | undefined = parsedQuery.estado;
    const tipoAplicado: TipoMovimiento | undefined = parsedQuery.tipo;

    const filters: ConsolidadoFilters = {
      fechaDesde,
      fechaHasta,
      estado: estadoAplicado,
      tipo: tipoAplicado,
    };

    const joinConditions = [
      eq(movimientos.negocioId, negociosTable.id),
      eq(movimientos.activo, true),
      gte(movimientos.fecha, fechaDesde),
      lte(movimientos.fecha, fechaHasta),
    ];
    if (tipoAplicado) {
      joinConditions.push(eq(movimientos.tipo, tipoAplicado));
    }

    const rows = await db
      .select({
        negocioId: negociosTable.id,
        nombre: negociosTable.nombre,
        totalIngresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.estado} = 'PAGADO' AND ${movimientos.tipo} = 'INGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        totalEgresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.estado} = 'PAGADO' AND ${movimientos.tipo} = 'EGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        movimientosPendientes: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.estado} = 'PENDIENTE' THEN 1 ELSE 0 END), 0)`,
        movimientosComprometidos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.estado} = 'APROBADO' THEN 1 ELSE 0 END), 0)`,
        totalComprometido: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.estado} = 'APROBADO' AND ${movimientos.tipo} IN ('INGRESO', 'TRASPASO_ENTRADA') THEN ${movimientos.monto} WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.estado} = 'APROBADO' AND ${movimientos.tipo} IN ('EGRESO', 'TRASPASO_SALIDA') THEN -${movimientos.monto} ELSE 0 END), 0)`,
      })
      .from(negociosTable)
      .leftJoin(movimientos, and(...joinConditions))
      .where(eq(negociosTable.activo, true))
      .groupBy(negociosTable.id, negociosTable.nombre)
      .orderBy(negociosTable.id);

    const negocios: ConsolidadoNegocioItem[] = await Promise.all(
      rows.map(async (row) => {
        const totalIngresos = parseMoney(row.totalIngresos);
        const totalEgresos = parseMoney(row.totalEgresos);
        const saldoNeto = totalIngresos - totalEgresos;
        const movimientosPendientes = parseMoney(row.movimientosPendientes);
        const movimientosComprometidos = parseMoney(row.movimientosComprometidos);
        const totalComprometido = parseMoney(row.totalComprometido);

        const arqueo = await cuentaBancoService.calcularArqueoNegocio(row.negocioId, fechaHasta);

        return {
          negocioId: row.negocioId,
          nombre: row.nombre,
          totalIngresos,
          totalEgresos,
          saldoNeto,
          movimientosPendientes,
          arqueo,
          movimientosComprometidos,
          totalComprometido,
        } as ConsolidadoNegocioItem;
      })
    );

    const resumenGlobal = negocios.reduce(
      (acc, n) => {
        acc.totalIngresos += n.totalIngresos;
        acc.totalEgresos += n.totalEgresos;
        acc.movimientosPendientes += n.movimientosPendientes;
        return acc;
      },
      {
        totalIngresos: 0,
        totalEgresos: 0,
        movimientosPendientes: 0,
      }
    );

    const data: ConsolidadoData = {
      resumenGlobal: {
        totalIngresos: resumenGlobal.totalIngresos,
        totalEgresos: resumenGlobal.totalEgresos,
        saldoNeto: resumenGlobal.totalIngresos - resumenGlobal.totalEgresos,
        negociosActivos: negocios.length,
        movimientosPendientes: resumenGlobal.movimientosPendientes,
      },
      negocios,
      filters,
      filtersDisponibles: {
        estados: ['PENDIENTE', 'APROBADO', 'RECHAZADO', 'PAGADO', 'CANCELADO'],
        tipos: ['INGRESO', 'EGRESO', 'TRASPASO_SALIDA', 'TRASPASO_ENTRADA'],
      },
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    const message = (error as Error).message || 'Error interno del servidor';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

