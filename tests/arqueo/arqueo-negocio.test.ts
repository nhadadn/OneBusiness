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

function matchesPredicates(row: Record<string, any>, predicates: Array<{ key: string; op: string; value: unknown }>) {
  return predicates.every((p) => {
    const val = row[p.key];
    if (p.op === '=') return val === p.value;
    if (p.op === '<=') return val <= (p.value as any);
    if (p.op === '>=') return val >= (p.value as any);
    return true;
  });
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
  const { cuentasBanco, movimientos, negocios, usuarios } = await import('@/lib/drizzle');

  const db = {
    select: (shape?: any) => {
      return {
        from: (table: any) => {
          const state = { table, where: null as any, negocioId: null as number | null, fechaCorte: null as string | null };

          const builder: any = {
            leftJoin: (_: any, _cond: any) => {
              return builder;
            },
            where: (where: any) => {
              state.where = where;
              return builder;
            },
            groupBy: () => {
              return builder;
            },
            orderBy: async () => {
              if (table === cuentasBanco) {
                const preds = extractPredicates(state.where);
                const negocioId = Number(preds.find((p) => p.key === 'negocioId')?.value ?? 0);
                const cuentas = dbState.cuentasBanco
                  .filter((c) => c.negocioId === negocioId && c.activo === true)
                  .slice()
                  .sort((a, b) => a.nombre.localeCompare(b.nombre));

                const fechaCorte = (() => {
                  const anyPred = extractPredicates((shape as any)?.__whereForFechaCorte ?? null);
                  const fromPred = anyPred.find((p) => p.key === 'fecha')?.value;
                  return typeof fromPred === 'string' ? fromPred : '9999-12-31';
                })();

                return cuentas.map((c) => {
                  const sums = sumCuenta({ negocioId, cuentaBancoId: c.id, fechaCorte: state.fechaCorte ?? '9999-12-31' });
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
              if (table === negocios) {
                const preds = extractPredicates(state.where);
                const rows = dbState.negocios.filter((r) => matchesPredicates(r as any, preds));
                return rows.slice(0, n).map((r) => ({ id: r.id }));
              }
              return [];
            },
            then: (onFulfilled: any, onRejected: any) => {
              if (table === usuarios) {
                return Promise.resolve([{ tokenVersion: 0 }]).then(onFulfilled, onRejected);
              }
              if (table === movimientos && shape && typeof shape.count !== 'undefined') {
                return Promise.resolve([{ count: 0 }]).then(onFulfilled, onRejected);
              }
              return Promise.resolve([]).then(onFulfilled, onRejected);
            },
          };

          if (table === cuentasBanco) {
            builder.leftJoin = (_joinTable: any, joinCond: any) => {
              const preds = extractPredicates(joinCond);
              const fechaCorte = String(preds.find((p) => p.key === 'fecha')?.value ?? '9999-12-31');
              state.fechaCorte = fechaCorte;
              return builder;
            };
          }

          return builder;
        },
      };
    },
  };

  return { db };
});

import { generateAccessToken } from '@/lib/jwt';
import { GET as getArqueoNegocio } from '@/app/api/negocios/[id]/arqueo/route';

function seedUsuario(params: { id: number; email: string }) {
  dbState.usuarios.push({ id: params.id, email: params.email, tokenVersion: 0 });
}

function seedNegocio(params: { id: number; nombre?: string; activo?: boolean }) {
  dbState.negocios.push({ id: params.id, nombre: params.nombre ?? `Negocio ${params.id}`, activo: params.activo ?? true });
}

function seedCuentaBanco(params: {
  id: number;
  negocioId: number;
  nombre: string;
  saldoInicial: string;
  saldoReal: string | null;
  activo?: boolean;
}) {
  dbState.cuentasBanco.push({
    id: params.id,
    negocioId: params.negocioId,
    nombre: params.nombre,
    tipo: 'BANCARIA',
    saldoInicial: params.saldoInicial,
    saldoReal: params.saldoReal,
    fechaSaldoReal: null,
    activo: params.activo ?? true,
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

describe('Arqueo negocio GET /api/negocios/:id/arqueo (integration)', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = '01234567890123456789012345678901';
    vi.restoreAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    dbState.usuarios.length = 0;
    dbState.negocios.length = 0;
    dbState.cuentasBanco.length = 0;
    dbState.movimientos.length = 0;
    dbState.nextId = 1;
  });

  it('retorna arqueo de todas las cuentas activas del negocio y totales suman', async () => {
    seedNegocio({ id: 1 });
    seedCuentaBanco({ id: 10, negocioId: 1, nombre: 'A', saldoInicial: '100', saldoReal: '100' });
    seedCuentaBanco({ id: 11, negocioId: 1, nombre: 'B', saldoInicial: '50', saldoReal: null });
    seedCuentaBanco({ id: 12, negocioId: 1, nombre: 'C', saldoInicial: '999', saldoReal: null, activo: false });
    seedMovimiento({ negocioId: 1, cuentaBancoId: 10, tipo: 'INGRESO', fecha: '2026-01-05', monto: '10', estado: 'APROBADO' });
    seedMovimiento({ negocioId: 1, cuentaBancoId: 11, tipo: 'EGRESO', fecha: '2026-01-05', monto: '5', estado: 'APROBADO' });
    const token = await makeToken({ userId: 2, email: 'admin@onebusiness.test', rol: 'Admin', negocios: [1] });

    const request = new Request('http://localhost/api/negocios/1/arqueo?fechaCorte=2026-01-10', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await getArqueoNegocio(request, { params: { id: '1' } });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.cuentas.length).toBe(2);

    const suma = body.data.cuentas.reduce((acc: number, c: any) => acc + c.saldoCalculado, 0);
    expect(body.data.totales.saldoCalculado).toBe(suma);
  });

  it('negocio sin cuentas retorna lista vacía sin error', async () => {
    seedNegocio({ id: 2 });
    const token = await makeToken({ userId: 2, email: 'admin@onebusiness.test', rol: 'Admin', negocios: [2] });

    const request = new Request('http://localhost/api/negocios/2/arqueo?fechaCorte=2026-01-10', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await getArqueoNegocio(request, { params: { id: '2' } });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.cuentas).toEqual([]);
    expect(body.data.totales.saldoCalculado).toBe(0);
  });

  it('Socio recibe 403', async () => {
    seedNegocio({ id: 3 });
    const token = await makeToken({ userId: 3, email: 'socio@onebusiness.test', rol: 'Socio', negocios: [3] });

    const request = new Request('http://localhost/api/negocios/3/arqueo?fechaCorte=2026-01-10', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await getArqueoNegocio(request, { params: { id: '3' } });
    expect(response.status).toBe(403);
  });

  it('Externo recibe 403', async () => {
    seedNegocio({ id: 4 });
    const token = await makeToken({ userId: 4, email: 'externo@onebusiness.test', rol: 'Externo', negocios: [4] });

    const request = new Request('http://localhost/api/negocios/4/arqueo?fechaCorte=2026-01-10', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await getArqueoNegocio(request, { params: { id: '4' } });
    expect(response.status).toBe(403);
  });
});
