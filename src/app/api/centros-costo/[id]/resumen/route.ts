import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, count, eq, gte, inArray, lte, sql } from 'drizzle-orm';

import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { db } from '@/lib/db';
import { centrosCosto, movimientos } from '@/lib/drizzle';
import { CentroCostoService } from '@/services/centro_costo.service';

export const dynamic = 'force-dynamic';

const centroCostoService = new CentroCostoService();

const paramsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID inválido'),
});

const querySchema = z.object({
  fechaDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fechaDesde inválida'),
  fechaHasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fechaHasta inválida'),
});

function parseNumeric(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

async function getCentroCostoOrNull(id: number) {
  const [row] = await db
    .select({
      id: centrosCosto.id,
      nombre: centrosCosto.nombre,
      codigo: centrosCosto.codigo,
      tipo: centrosCosto.tipo,
      negocioId: centrosCosto.negocioId,
      padreId: centrosCosto.padreId,
      descripcion: centrosCosto.descripcion,
      activo: centrosCosto.activo,
    })
    .from(centrosCosto)
    .where(and(eq(centrosCosto.id, id), eq(centrosCosto.activo, true)))
    .limit(1);

  return row ?? null;
}

async function getResumenForCentroIds(params: { ids: number[]; fechaDesde: string; fechaHasta: string }) {
  const [row] = await db
    .select({
      totalIngresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.tipo} = 'INGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
      totalEgresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.tipo} = 'EGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
      cantidadMovimientos: count(movimientos.id),
    })
    .from(movimientos)
    .where(
      and(
        eq(movimientos.activo, true),
        inArray(movimientos.estado, ['APROBADO', 'PAGADO']),
        inArray(movimientos.centroCostoId, params.ids),
        gte(movimientos.fecha, params.fechaDesde),
        lte(movimientos.fecha, params.fechaHasta)
      )
    )
    .limit(1);

  const totalIngresos = parseNumeric(row?.totalIngresos);
  const totalEgresos = parseNumeric(row?.totalEgresos);
  const balance = totalIngresos - totalEgresos;
  const cantidadMovimientos = Number(row?.cantidadMovimientos ?? 0);

  const [pendientesRow] = await db
    .select({ cantidadPendientes: count(movimientos.id) })
    .from(movimientos)
    .where(
      and(
        eq(movimientos.activo, true),
        eq(movimientos.estado, 'PENDIENTE'),
        inArray(movimientos.centroCostoId, params.ids),
        gte(movimientos.fecha, params.fechaDesde),
        lte(movimientos.fecha, params.fechaHasta)
      )
    )
    .limit(1);

  const cantidadPendientes = Number(pendientesRow?.cantidadPendientes ?? 0);

  return { totalIngresos, totalEgresos, balance, cantidadMovimientos, cantidadPendientes };
}

async function getResumenForCentroId(params: { id: number; fechaDesde: string; fechaHasta: string }) {
  const [row] = await db
    .select({
      totalIngresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.tipo} = 'INGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
      totalEgresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.tipo} = 'EGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
    })
    .from(movimientos)
    .where(
      and(
        eq(movimientos.activo, true),
        inArray(movimientos.estado, ['APROBADO', 'PAGADO']),
        eq(movimientos.centroCostoId, params.id),
        gte(movimientos.fecha, params.fechaDesde),
        lte(movimientos.fecha, params.fechaHasta)
      )
    )
    .limit(1);

  const totalIngresos = parseNumeric(row?.totalIngresos);
  const totalEgresos = parseNumeric(row?.totalEgresos);
  const balance = totalIngresos - totalEgresos;

  return { totalIngresos, totalEgresos, balance };
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
    const centroId = Number.parseInt(id, 10);

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      fechaDesde: searchParams.get('fechaDesde') ?? '',
      fechaHasta: searchParams.get('fechaHasta') ?? '',
    });

    const centro = await getCentroCostoOrNull(centroId);
    if (!centro) {
      return NextResponse.json({ success: false, error: 'Centro de costo no encontrado' }, { status: 404 });
    }

    if (auth.user!.rol !== 'Dueño' && !auth.user!.negocios.includes(centro.negocioId)) {
      return forbiddenResponse('No tienes acceso a este negocio');
    }

    const hijos =
      centro.tipo === 'DIVISION'
        ? await centroCostoService
            .listar(centro.negocioId)
            .then((todos) => todos.filter((c) => c.padreId === centro.id))
        : [];

    const ids = [centro.id, ...hijos.map((h) => h.id)];

    const resumen = await getResumenForCentroIds({ ids, fechaDesde: query.fechaDesde, fechaHasta: query.fechaHasta });

    const hijosBreakdown =
      centro.tipo === 'DIVISION'
        ? await Promise.all(
            hijos.map(async (h) => {
              const r = await getResumenForCentroId({ id: h.id, fechaDesde: query.fechaDesde, fechaHasta: query.fechaHasta });
              return { id: h.id, nombre: h.nombre, totalIngresos: r.totalIngresos, totalEgresos: r.totalEgresos, balance: r.balance };
            })
          )
        : [];

    return NextResponse.json({
      success: true,
      data: {
        centro: {
          id: centro.id,
          nombre: centro.nombre,
          codigo: centro.codigo ?? null,
          tipo: centro.tipo,
          negocioId: centro.negocioId,
          padreId: centro.padreId ?? null,
          descripcion: centro.descripcion ?? null,
          activo: centro.activo ?? true,
        },
        resumen,
        hijos: hijosBreakdown,
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
