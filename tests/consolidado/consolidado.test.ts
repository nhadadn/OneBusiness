import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbState = vi.hoisted(() => ({
  usuarios: [] as Array<{ id: number; email: string; tokenVersion: number }>,
  negocios: [] as Array<{ id: number; activo: boolean; nombre: string }>,
  cuentasBanco: [] as Array<{
    id: number;
    negocioId: number;
    nombre: string;
    tipo: 'EFECTIVO' | 'BANCARIA';
    saldoInicial: string;
    saldoReal: string | null;
    fechaSaldoReal: Date | null;
    activo: boolean;
  }>,
  movimientos: [] as Array<{
    id: number;
    negocioId: number;
    cuentaBancoId: number;
    tipo: 'INGRESO' | 'EGRESO' | 'TRASPASO_ENTRADA' | 'TRASPASO_SALIDA';
    fecha: string;
    monto: string;
    estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
    activo: boolean;
  }>,
  nextId: 1,
}));

function getColumnsSymbol(table: any) {
  return Object.getOwnPropertySymbols(table).find((s) => s.toString().includes('drizzle:Columns'));
}

function getColumnKey(column: any): string | null {
  const table = column?.table;
  if (!table) return null;
  const columnsSym = getColumnsSymbol(table);
  if (!columnsSym) return null;
  const columns = table[columnsSym] as Record<string, unknown>;
  const found = Object.entries(columns).find(([, v]) => v === column);
  return found?.[0] ?? null;
}

function extractPredicates(condition: any): Array<{ key: string; op: string; value: unknown }> {
  if (!condition || typeof condition !== 'object') return [];
  const chunks = (condition as any).queryChunks;
  if (!Array.isArray(chunks)) return [];

  const out: Array<{ key: string; op: string; value: unknown }> = [];
  let lastColumnKey: string | null = null;
  let lastOp: string | null = null;

  for (const chunk of chunks) {
    if (chunk && typeof chunk === 'object' && Array.isArray((chunk as any).queryChunks)) {
      out.push(...extractPredicates(chunk));
      continue;
    }
    if (chunk && typeof chunk === 'object' && Array.isArray((chunk as any).value)) {
      const raw = String((chunk as any).value.join(''));
      if (raw.includes(' = ')) lastOp = '=';
      if (raw.includes(' <= ')) lastOp = '<=';
      if (raw.includes(' >= ')) lastOp = '>=';
      continue;
    }
    if (chunk && typeof chunk === 'object' && (chunk as any).value !== undefined && (chunk as any).encoder) {
      if (lastColumnKey && lastOp) {
        out.push({ key: lastColumnKey, op: lastOp, value: (chunk as any).value });
      }
      continue;
    }
    if (chunk && typeof chunk === 'object' && (chunk as any).table && typeof (chunk as any).name === 'string') {
      lastColumnKey = getColumnKey(chunk) ?? null;
      continue;
    }
  }

  return out;
}

function sumCuenta(params: { negocioId: number; cuentaBancoId: number; fechaCorte: string }) {
  const rows = dbState.movimientos.filter(
    (m) => m.negocioId === params.negocioId && m.cuentaBancoId === params.cuentaBancoId && m.activo === true && m.fecha <= params.fechaCorte
  );
  const sumBy = (estado: string, tipo: string) =>
    rows.filter((r) => r.estado === estado && r.tipo === tipo).reduce((acc, r) => acc + Number.parseFloat(r.monto), 0);
  const ingreso = sumBy('APROBADO', 'INGRESO');
  const egreso = sumBy('APROBADO', 'EGRESO');
  const traspasoEntrada = sumBy('APROBADO', 'TRASPASO_ENTRADA');
  const traspasoSalida = sumBy('APROBADO', 'TRASPASO_SALIDA');
  const movimientosPendientes = rows.filter((r) => r.estado === 'PENDIENTE').length;
  return { ingreso, egreso, traspasoEntrada, traspasoSalida, movimientosPendientes };
}

vi.mock('@/lib/db', async () => {
  const { cuentasBanco, movimientos, negocios: negociosTable, usuarios } = await import('@/lib/drizzle');

  const db = {
    select: (shape?: any) => {
      return {
        from: (table: any) => {
          const state = {
            table,
            where: null as any,
            joinCond: null as any,
          };

          const builder: any = {
            leftJoin: (_joinTable: any, joinCond: any) => {
              state.joinCond = joinCond;
              return builder;
            },
            where: (where: any) => {
              state.where = where;
              return builder;
            },
            groupBy: () => builder,
            orderBy: async () => {
              if (table === negociosTable) {
                const joinPreds = extractPredicates(state.joinCond);
                const fechaDesde = String(joinPreds.find((p) => p.key === 'fecha' && p.op === '>=' )?.value ?? '0000-01-01');
                const fechaHasta = String(joinPreds.find((p) => p.key === 'fecha' && p.op === '<=')?.value ?? '9999-12-31');
                const tipo = joinPreds.find((p) => p.key === 'tipo')?.value as string | undefined;
                const activos = dbState.negocios.filter((n) => n.activo === true).slice().sort((a, b) => a.id - b.id);

                return activos.map((n) => {
                  const movs = dbState.movimientos.filter((m) => {
                    if (m.negocioId !== n.id) return false;
                    if (m.activo !== true) return false;
                    if (m.fecha < fechaDesde || m.fecha > fechaHasta) return false;
                    if (tipo && m.tipo !== tipo) return false;
                    return true;
                  });

                  const totalIngresos = movs
                    .filter((m) => m.estado === 'APROBADO' && m.tipo === 'INGRESO')
                    .reduce((acc, m) => acc + Number.parseFloat(m.monto), 0);
                  const totalEgresos = movs
                    .filter((m) => m.estado === 'APROBADO' && m.tipo === 'EGRESO')
                    .reduce((acc, m) => acc + Number.parseFloat(m.monto), 0);
                  const movimientosPendientes = movs.filter((m) => m.estado === 'PENDIENTE').length;

                  return {
                    negocioId: n.id,
                    nombre: n.nombre,
                    totalIngresos: String(totalIngresos),
                    totalEgresos: String(totalEgresos),
                    movimientosPendientes: String(movimientosPendientes),
                  };
                });
              }

              if (table === cuentasBanco) {
                const wherePreds = extractPredicates(state.where);
                const negocioId = Number(wherePreds.find((p) => p.key === 'negocioId')?.value ?? 0);
                const joinPreds = extractPredicates(state.joinCond);
                const fechaCorte = String(joinPreds.find((p) => p.key === 'fecha' && p.op === '<=')?.value ?? '9999-12-31');

                const cuentas = dbState.cuentasBanco
                  .filter((c) => c.negocioId === negocioId && c.activo === true)
                  .slice()
                  .sort((a, b) => a.nombre.localeCompare(b.nombre));

                return cuentas.map((c) => {
                  const sums = sumCuenta({ negocioId, cuentaBancoId: c.id, fechaCorte });
                  return {
                    cuentaBancoId: c.id,
                    nombre: c.nombre,
                    tipo: c.tipo,
                    saldoInicial: c.saldoInicial,
                    saldoReal: c.saldoReal,
                    fechaSaldoReal: c.fechaSaldoReal,
                    ingreso: String(sums.ingreso),
                    egreso: String(sums.egreso),
                    traspasoEntrada: String(sums.traspasoEntrada),
                    traspasoSalida: String(sums.traspasoSalida),
                    movimientosPendientes: sums.movimientosPendientes,
                  };
                });
              }

              return [];
            },
            limit: async (n: number) => {
              if (table === usuarios) {
                return [{ tokenVersion: 0 }].slice(0, n);
              }
              if (table === negociosTable) {
                const preds = extractPredicates(state.where);
                const id = Number(preds.find((p) => p.key === 'id')?.value ?? 0);
                const found = dbState.negocios.find((x) => x.id === id);
                return found ? [{ id: found.id }].slice(0, n) : [];
              }
              return [];
            },
            then: (onFulfilled: any, onRejected: any) => {
              if (table === usuarios) {
                return Promise.resolve([{ tokenVersion: 0 }]).then(onFulfilled, onRejected);
              }
              return Promise.resolve([]).then(onFulfilled, onRejected);
            },
          };

          return builder;
        },
      };
    },
  };

  return { db };
});

import { generateAccessToken } from '@/lib/jwt';
import { GET as consolidadoGet } from '@/app/api/consolidado/route';

function seedUsuario(params: { id: number; email: string }) {
  dbState.usuarios.push({ id: params.id, email: params.email, tokenVersion: 0 });
}

function seedNegocio(params: { id: number; nombre?: string; activo?: boolean }) {
  dbState.negocios.push({ id: params.id, nombre: params.nombre ?? `Negocio ${params.id}`, activo: params.activo ?? true });
}

function seedCuentaBanco(params: { id: number; negocioId: number; nombre: string; saldoInicial: string; saldoReal: string | null }) {
  dbState.cuentasBanco.push({
    id: params.id,
    negocioId: params.negocioId,
    nombre: params.nombre,
    tipo: 'BANCARIA',
    saldoInicial: params.saldoInicial,
    saldoReal: params.saldoReal,
    fechaSaldoReal: null,
    activo: true,
  });
}

function seedMovimiento(params: {
  negocioId: number;
  cuentaBancoId: number;
  tipo: 'INGRESO' | 'EGRESO' | 'TRASPASO_ENTRADA' | 'TRASPASO_SALIDA';
  fecha: string;
  monto: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
}) {
  dbState.movimientos.push({ id: dbState.nextId++, activo: true, ...params });
}

async function makeToken(params: { userId: number; email: string; rol: 'Dueño' | 'Admin' | 'Socio' | 'Externo'; negocios: number[] }) {
  seedUsuario({ id: params.userId, email: params.email });
  return generateAccessToken({ ...params, tokenVersion: 0 });
}

describe('Consolidado GET /api/consolidado (integration)', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = '01234567890123456789012345678901';
    vi.resetAllMocks();
    dbState.usuarios.length = 0;
    dbState.negocios.length = 0;
    dbState.cuentasBanco.length = 0;
    dbState.movimientos.length = 0;
    dbState.nextId = 1;
  });

  it('RBAC: Dueño 200 con data.resumenGlobal', async () => {
    seedNegocio({ id: 1 });
    seedCuentaBanco({ id: 10, negocioId: 1, nombre: 'Cuenta 1', saldoInicial: '0', saldoReal: null });
    const token = await makeToken({ userId: 1, email: 'dueno@onebusiness.test', rol: 'Dueño', negocios: [1] });

    const request = new Request('http://localhost/api/consolidado?fechaDesde=2026-01-01&fechaHasta=2026-01-31', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await consolidadoGet(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.resumenGlobal).toBeDefined();
  });

  it('RBAC: Admin 403', async () => {
    const token = await makeToken({ userId: 2, email: 'admin@onebusiness.test', rol: 'Admin', negocios: [1] });
    const request = new Request('http://localhost/api/consolidado', { headers: { authorization: `Bearer ${token}` } });
    const response = await consolidadoGet(request);
    expect(response.status).toBe(403);
  });

  it('RBAC: Socio 403', async () => {
    const token = await makeToken({ userId: 3, email: 'socio@onebusiness.test', rol: 'Socio', negocios: [1] });
    const request = new Request('http://localhost/api/consolidado', { headers: { authorization: `Bearer ${token}` } });
    const response = await consolidadoGet(request);
    expect(response.status).toBe(403);
  });

  it('RBAC: Externo 403', async () => {
    const token = await makeToken({ userId: 4, email: 'externo@onebusiness.test', rol: 'Externo', negocios: [1] });
    const request = new Request('http://localhost/api/consolidado', { headers: { authorization: `Bearer ${token}` } });
    const response = await consolidadoGet(request);
    expect(response.status).toBe(403);
  });

  it('estructura: contiene resumenGlobal, negocios y filters', async () => {
    seedNegocio({ id: 1 });
    seedCuentaBanco({ id: 10, negocioId: 1, nombre: 'Cuenta 1', saldoInicial: '0', saldoReal: null });
    const token = await makeToken({ userId: 1, email: 'dueno@onebusiness.test', rol: 'Dueño', negocios: [1] });

    const request = new Request('http://localhost/api/consolidado?fechaDesde=2026-01-01&fechaHasta=2026-01-31', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await consolidadoGet(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.resumenGlobal.totalIngresos).toBeTypeOf('number');
    expect(body.data.resumenGlobal.totalEgresos).toBeTypeOf('number');
    expect(body.data.resumenGlobal.saldoNeto).toBeTypeOf('number');
    expect(body.data.resumenGlobal.negociosActivos).toBeTypeOf('number');
    expect(Array.isArray(body.data.negocios)).toBe(true);
    expect(body.data.filters).toBeDefined();
  });

  it('fechaDesde > fechaHasta retorna 400', async () => {
    const token = await makeToken({ userId: 1, email: 'dueno@onebusiness.test', rol: 'Dueño', negocios: [1] });
    const request = new Request('http://localhost/api/consolidado?fechaDesde=2026-02-01&fechaHasta=2026-01-01', {
      headers: { authorization: `Bearer ${token}` },
    });
    const response = await consolidadoGet(request);
    expect(response.status).toBe(400);
  });

  it('totales solo incluyen APROBADO (PENDIENTE no afecta ingresos/egresos)', async () => {
    seedNegocio({ id: 1 });
    seedCuentaBanco({ id: 10, negocioId: 1, nombre: 'Cuenta 1', saldoInicial: '0', saldoReal: null });
    seedMovimiento({ negocioId: 1, cuentaBancoId: 10, tipo: 'INGRESO', fecha: '2026-01-10', monto: '100', estado: 'APROBADO' });
    seedMovimiento({ negocioId: 1, cuentaBancoId: 10, tipo: 'INGRESO', fecha: '2026-01-11', monto: '999', estado: 'PENDIENTE' });
    const token = await makeToken({ userId: 1, email: 'dueno@onebusiness.test', rol: 'Dueño', negocios: [1] });

    const request = new Request('http://localhost/api/consolidado?fechaDesde=2026-01-01&fechaHasta=2026-01-31', {
      headers: { authorization: `Bearer ${token}` },
    });
    const response = await consolidadoGet(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.resumenGlobal.totalIngresos).toBe(100);
    expect(body.data.resumenGlobal.totalEgresos).toBe(0);
    expect(body.data.resumenGlobal.movimientosPendientes).toBe(1);
  });

  it('con fechaDesde y fechaHasta válidos retorna 200', async () => {
    seedNegocio({ id: 1 });
    seedCuentaBanco({ id: 10, negocioId: 1, nombre: 'Cuenta 1', saldoInicial: '0', saldoReal: null });
    const token = await makeToken({ userId: 1, email: 'dueno@onebusiness.test', rol: 'Dueño', negocios: [1] });

    const request = new Request('http://localhost/api/consolidado?fechaDesde=2026-01-01&fechaHasta=2026-01-31', {
      headers: { authorization: `Bearer ${token}` },
    });
    const response = await consolidadoGet(request);
    expect(response.status).toBe(200);
  });
});
