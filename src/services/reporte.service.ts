import { and, eq, gte, inArray, isNotNull, lte, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { categorias, movimientos, negocios } from '@/lib/drizzle';

const ESTADOS_EJECUTADOS = ['APROBADO', 'PAGADO'] as const;
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const;

function monthKeyFromParts(year: number, month: number) {
  const mm = String(month).padStart(2, '0');
  return `${year}-${mm}`;
}

function parseMonthKey(value: string) {
  const [y, m] = value.split('-');
  const year = y ? Number.parseInt(y, 10) : Number.NaN;
  const month = m ? Number.parseInt(m, 10) : Number.NaN;
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }
  return { year, month };
}

function buildMonthRangeKeys(fechaDesde: string, fechaHasta: string) {
  const start = parseMonthKey(fechaDesde.slice(0, 7));
  const end = parseMonthKey(fechaHasta.slice(0, 7));
  if (!start || !end) return [];

  const keys: string[] = [];
  let y = start.year;
  let m = start.month;
  while (y < end.year || (y === end.year && m <= end.month)) {
    keys.push(monthKeyFromParts(y, m));
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return keys;
}

export class ReporteService {
  private parseNumeric(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  async getResumenEjecutivo(params: { negocioIds?: number[]; fechaDesde: string; fechaHasta: string }) {
    const negocioFilter =
      Array.isArray(params.negocioIds) && params.negocioIds.length > 0 ? inArray(movimientos.negocioId, params.negocioIds) : undefined;

    const [row] = await db
      .select({
        totalIngresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.estado} IN ('APROBADO', 'PAGADO') AND ${movimientos.tipo} = 'INGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        totalEgresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.estado} IN ('APROBADO', 'PAGADO') AND ${movimientos.tipo} = 'EGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        totalPendientes: sql<number>`COALESCE(SUM(CASE WHEN ${movimientos.estado} = 'PENDIENTE' THEN 1 ELSE 0 END), 0)`,
      })
      .from(movimientos)
      .where(and(eq(movimientos.activo, true), gte(movimientos.fecha, params.fechaDesde), lte(movimientos.fecha, params.fechaHasta), negocioFilter))
      .limit(1);

    const totalIngresos = this.parseNumeric(row?.totalIngresos) ?? 0;
    const totalEgresos = this.parseNumeric(row?.totalEgresos) ?? 0;
    const balance = totalIngresos - totalEgresos;
    const totalPendientes = Number(row?.totalPendientes ?? 0);

    return { totalIngresos, totalEgresos, balance, totalPendientes };
  }

  async getIngresosPorMes(params: { negocioIds?: number[]; anio: number }) {
    const negocioFilter =
      Array.isArray(params.negocioIds) && params.negocioIds.length > 0 ? inArray(movimientos.negocioId, params.negocioIds) : undefined;

    const fechaDesde = `${params.anio}-01-01`;
    const fechaHasta = `${params.anio}-12-31`;

    const mesNum = sql<number>`date_part('month', ${movimientos.fecha})`;

    const rows = await db
      .select({
        mes: mesNum,
        ingresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.estado} IN ('APROBADO', 'PAGADO') AND ${movimientos.tipo} = 'INGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        egresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.estado} IN ('APROBADO', 'PAGADO') AND ${movimientos.tipo} = 'EGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
      })
      .from(movimientos)
      .where(and(eq(movimientos.activo, true), gte(movimientos.fecha, fechaDesde), lte(movimientos.fecha, fechaHasta), negocioFilter))
      .groupBy(mesNum)
      .orderBy(mesNum);

    const byMonth = new Map<number, { ingresos: number; egresos: number }>();
    rows.forEach((r) => {
      const m = Number(r.mes);
      if (!Number.isFinite(m)) return;
      byMonth.set(m, { ingresos: this.parseNumeric(r.ingresos) ?? 0, egresos: this.parseNumeric(r.egresos) ?? 0 });
    });

    return MESES.map((label, idx) => {
      const month = idx + 1;
      const totals = byMonth.get(month) ?? { ingresos: 0, egresos: 0 };
      return { mes: label, ingresos: totals.ingresos, egresos: totals.egresos };
    });
  }

  async getDistribucionPorNegocio(params: { fechaDesde: string; fechaHasta: string }) {
    const rows = await db
      .select({
        negocioId: negocios.id,
        name: negocios.nombre,
        value: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.estado} IN ('APROBADO', 'PAGADO') AND ${movimientos.tipo} = 'INGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
      })
      .from(negocios)
      .leftJoin(
        movimientos,
        and(eq(movimientos.negocioId, negocios.id), eq(movimientos.activo, true), gte(movimientos.fecha, params.fechaDesde), lte(movimientos.fecha, params.fechaHasta))
      )
      .groupBy(negocios.id, negocios.nombre)
      .orderBy(negocios.id);

    return rows
      .map((r) => ({
        negocioId: r.negocioId,
        name: r.name,
        value: this.parseNumeric(r.value) ?? 0,
      }))
      .filter((r) => r.value > 0);
  }

  async getTendenciaBalance(params: { negocioIds?: number[]; fechaDesde: string; fechaHasta: string }) {
    const negocioFilter =
      Array.isArray(params.negocioIds) && params.negocioIds.length > 0 ? inArray(movimientos.negocioId, params.negocioIds) : undefined;

    const monthKey = sql<string>`to_char(date_trunc('month', ${movimientos.fecha}), 'YYYY-MM')`;

    const rows = await db
      .select({
        fecha: monthKey,
        ingresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.estado} IN ('APROBADO', 'PAGADO') AND ${movimientos.tipo} = 'INGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        egresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.estado} IN ('APROBADO', 'PAGADO') AND ${movimientos.tipo} = 'EGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
      })
      .from(movimientos)
      .where(and(eq(movimientos.activo, true), gte(movimientos.fecha, params.fechaDesde), lte(movimientos.fecha, params.fechaHasta), negocioFilter))
      .groupBy(monthKey)
      .orderBy(monthKey);

    const byKey = new Map<string, { ingresos: number; egresos: number }>();
    rows.forEach((r) => {
      const key = r.fecha;
      if (!key) return;
      byKey.set(key, { ingresos: this.parseNumeric(r.ingresos) ?? 0, egresos: this.parseNumeric(r.egresos) ?? 0 });
    });

    const keys = buildMonthRangeKeys(params.fechaDesde, params.fechaHasta);
    const effectiveKeys = keys.length > 0 ? keys : Array.from(byKey.keys()).sort();

    return effectiveKeys.map((k) => {
      const t = byKey.get(k) ?? { ingresos: 0, egresos: 0 };
      return { fecha: k, ingresos: t.ingresos, egresos: t.egresos, balance: t.ingresos - t.egresos };
    });
  }

  async getTopCategorias(params: {
    negocioIds?: number[];
    fechaDesde: string;
    fechaHasta: string;
    tipo: 'INGRESO' | 'EGRESO';
  }) {
    const negocioFilter =
      Array.isArray(params.negocioIds) && params.negocioIds.length > 0 ? inArray(movimientos.negocioId, params.negocioIds) : undefined;

    const rows = await db
      .select({
        categoriaId: categorias.id,
        nombre: categorias.nombre,
        total: sql<string>`COALESCE(SUM(${movimientos.monto}), 0)`,
        cantidad: sql<number>`COALESCE(COUNT(${movimientos.id}), 0)`,
      })
      .from(movimientos)
      .innerJoin(categorias, eq(movimientos.categoriaId, categorias.id))
      .where(
        and(
          eq(movimientos.activo, true),
          eq(categorias.activa, true),
          eq(movimientos.tipo, params.tipo),
          inArray(movimientos.estado, ESTADOS_EJECUTADOS),
          isNotNull(movimientos.categoriaId),
          gte(movimientos.fecha, params.fechaDesde),
          lte(movimientos.fecha, params.fechaHasta),
          negocioFilter
        )
      )
      .groupBy(categorias.id, categorias.nombre)
      .orderBy(sql`SUM(${movimientos.monto}) DESC`)
      .limit(10);

    return rows.map((r) => ({
      nombre: r.nombre,
      total: this.parseNumeric(r.total) ?? 0,
      cantidad: Number(r.cantidad ?? 0),
    }));
  }

  async getRankingNegocios(params: { fechaDesde: string; fechaHasta: string }) {
    const rows = await db
      .select({
        negocioId: negocios.id,
        nombre: negocios.nombre,
        ingresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.estado} IN ('APROBADO', 'PAGADO') AND ${movimientos.tipo} = 'INGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        egresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.estado} IN ('APROBADO', 'PAGADO') AND ${movimientos.tipo} = 'EGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        pendientes: sql<number>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.estado} = 'PENDIENTE' THEN 1 ELSE 0 END), 0)`,
      })
      .from(negocios)
      .leftJoin(
        movimientos,
        and(eq(movimientos.negocioId, negocios.id), eq(movimientos.activo, true), gte(movimientos.fecha, params.fechaDesde), lte(movimientos.fecha, params.fechaHasta))
      )
      .groupBy(negocios.id, negocios.nombre)
      .orderBy(negocios.id);

    return rows.map((row) => {
      const ingresos = this.parseNumeric(row.ingresos) ?? 0;
      const egresos = this.parseNumeric(row.egresos) ?? 0;
      const pendientes = Number(row.pendientes ?? 0);
      const balance = ingresos - egresos;

      const semaforo: 'verde' | 'amarillo' | 'rojo' =
        balance < 0 ? 'rojo' : balance === 0 || pendientes > 5 ? 'amarillo' : 'verde';

      return {
        negocioId: row.negocioId,
        nombre: row.nombre,
        ingresos,
        egresos,
        balance,
        pendientes,
        semaforo,
      };
    });
  }
}
