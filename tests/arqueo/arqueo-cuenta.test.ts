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
    if (p.op === '<=') return val <= p.value;
    if (p.op === '>=') return val >= p.value;
    return true;
  });
}

function sumMovimientos(params: { cuentaBancoId: number; fechaCorte: string; estado: 'APROBADO' | 'PENDIENTE' }) {
  const rows = dbState.movimientos.filter(
    (m) =>
      m.cuentaBancoId === params.cuentaBancoId &&
      m.activo === true &&
      m.estado === params.estado &&
      m.fecha <= params.fechaCorte
  );
  const sumByTipo = (tipo: string) => rows.filter((r) => r.tipo === tipo).reduce((acc, r) => acc + Number.parseFloat(r.monto), 0);
  return {
    ingreso: sumByTipo('INGRESO'),
    egreso: sumByTipo('EGRESO'),
    traspasoEntrada: sumByTipo('TRASPASO_ENTRADA'),
    traspasoSalida: sumByTipo('TRASPASO_SALIDA'),
    pendientes: rows.length,
  };
}

vi.mock('@/lib/db', async () => {
  const { cuentasBanco, movimientos, negocios, usuarios } = await import('@/lib/drizzle');

  const db = {
    select: (shape?: any) => {
      return {
        from: (table: any) => {
          return {
            where: (where: any) => {
              const preds = extractPredicates(where);
              const execute = async () => {
                if (table === movimientos && shape && typeof shape.count !== 'undefined') {
                  const cuentaBancoId = Number(preds.find((p) => p.key === 'cuentaBancoId')?.value ?? 0);
                  const fechaCorte = String(preds.find((p) => p.key === 'fecha')?.value ?? '9999-12-31');
                  const estado = String(preds.find((p) => p.key === 'estado')?.value ?? 'PENDIENTE') as 'PENDIENTE';
                  const count = dbState.movimientos.filter(
                    (m) =>
                      m.cuentaBancoId === cuentaBancoId &&
                      m.activo === true &&
                      m.estado === estado &&
                      m.fecha <= fechaCorte
                  ).length;
                  return [{ count }];
                }

                if (table === movimientos && shape) {
                  const cuentaBancoId = Number(preds.find((p) => p.key === 'cuentaBancoId')?.value ?? 0);
                  const fechaCorte = String(preds.find((p) => p.key === 'fecha')?.value ?? '9999-12-31');
                  const estado = String(preds.find((p) => p.key === 'estado')?.value ?? 'APROBADO') as 'APROBADO';
                  const sums = sumMovimientos({ cuentaBancoId, fechaCorte, estado });
                  return [
                    {
                      ingreso: String(sums.ingreso),
                      egreso: String(sums.egreso),
                      traspasoEntrada: String(sums.traspasoEntrada),
                      traspasoSalida: String(sums.traspasoSalida),
                    },
                  ];
                }

                return [];
              };

              return {
                limit: async (n: number) => {
                  if (table === usuarios) {
                    return [{ tokenVersion: 0 }].slice(0, n);
                  }
                  if (table === cuentasBanco) {
                    const rows = dbState.cuentasBanco.filter((r) => matchesPredicates(r as any, preds));
                    return rows.slice(0, n);
                  }
                  if (table === negocios) {
                    const rows = dbState.negocios.filter((r) => matchesPredicates(r as any, preds));
                    return rows.slice(0, n);
                  }
                  return [];
                },
                then: (onFulfilled: any, onRejected: any) => {
                  return execute().then(onFulfilled, onRejected);
                },
              };
            },
          };
        },
      };
    },
  };

  return { db };
});

import { generateAccessToken } from '@/lib/jwt';
import { GET as getArqueoCuenta } from '@/app/api/cuentas-banco/[id]/arqueo/route';

function seedUsuario(params: { id: number; email: string }) {
  dbState.usuarios.push({ id: params.id, email: params.email, tokenVersion: 0 });
}

function seedNegocio(params: { id: number; nombre?: string; activo?: boolean }) {
  dbState.negocios.push({ id: params.id, nombre: params.nombre ?? `Negocio ${params.id}`, activo: params.activo ?? true });
}

function seedCuentaBanco(params: {
  id: number;
  negocioId: number;
  saldoInicial: string;
  saldoReal: string | null;
  fechaSaldoReal?: Date | null;
}) {
  dbState.cuentasBanco.push({
    id: params.id,
    negocioId: params.negocioId,
    nombre: `Cuenta ${params.id}`,
    tipo: 'BANCARIA',
    saldoInicial: params.saldoInicial,
    saldoReal: params.saldoReal,
    fechaSaldoReal: params.fechaSaldoReal ?? null,
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

describe('Arqueo cuenta GET /api/cuentas-banco/:id/arqueo (integration)', () => {
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

  it('cuenta sin saldoReal retorna SIN_SALDO_REAL y diferencia null', async () => {
    seedNegocio({ id: 1 });
    seedCuentaBanco({ id: 10, negocioId: 1, saldoInicial: '100', saldoReal: null });
    const token = await makeToken({ userId: 2, email: 'admin@onebusiness.test', rol: 'Admin', negocios: [1] });

    const request = new Request('http://localhost/api/cuentas-banco/10/arqueo?fechaCorte=2026-01-10', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await getArqueoCuenta(request, { params: { id: '10' } });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.estadoArqueo).toBe('SIN_SALDO_REAL');
    expect(body.data.diferencia).toBeNull();
  });

  it('saldoReal igual a saldoInicial y sin movimientos retorna CUADRADO', async () => {
    seedNegocio({ id: 1 });
    seedCuentaBanco({ id: 11, negocioId: 1, saldoInicial: '100', saldoReal: '100' });
    const token = await makeToken({ userId: 2, email: 'admin@onebusiness.test', rol: 'Admin', negocios: [1] });

    const request = new Request('http://localhost/api/cuentas-banco/11/arqueo?fechaCorte=2026-01-10', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await getArqueoCuenta(request, { params: { id: '11' } });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.estadoArqueo).toBe('CUADRADO');
    expect(body.data.saldoCalculado).toBe(100);
    expect(body.data.diferencia).toBe(0);
  });

  it('saldoReal mayor al calculado retorna SOBRANTE', async () => {
    seedNegocio({ id: 1 });
    seedCuentaBanco({ id: 12, negocioId: 1, saldoInicial: '100', saldoReal: '110' });
    const token = await makeToken({ userId: 2, email: 'admin@onebusiness.test', rol: 'Admin', negocios: [1] });

    const request = new Request('http://localhost/api/cuentas-banco/12/arqueo?fechaCorte=2026-01-10', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await getArqueoCuenta(request, { params: { id: '12' } });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.estadoArqueo).toBe('SOBRANTE');
    expect(body.data.diferencia).toBe(10);
  });

  it('saldoReal menor al calculado retorna FALTANTE', async () => {
    seedNegocio({ id: 1 });
    seedCuentaBanco({ id: 13, negocioId: 1, saldoInicial: '100', saldoReal: '90' });
    const token = await makeToken({ userId: 2, email: 'admin@onebusiness.test', rol: 'Admin', negocios: [1] });

    const request = new Request('http://localhost/api/cuentas-banco/13/arqueo?fechaCorte=2026-01-10', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await getArqueoCuenta(request, { params: { id: '13' } });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.estadoArqueo).toBe('FALTANTE');
    expect(body.data.diferencia).toBe(-10);
  });

  it('movimientos APROBADOS afectan saldoCalculado; PENDIENTE no afecta', async () => {
    seedNegocio({ id: 1 });
    seedCuentaBanco({ id: 14, negocioId: 1, saldoInicial: '100', saldoReal: '100' });
    seedMovimiento({ negocioId: 1, cuentaBancoId: 14, tipo: 'INGRESO', fecha: '2026-01-05', monto: '50', estado: 'APROBADO' });
    seedMovimiento({ negocioId: 1, cuentaBancoId: 14, tipo: 'EGRESO', fecha: '2026-01-06', monto: '20', estado: 'APROBADO' });
    seedMovimiento({ negocioId: 1, cuentaBancoId: 14, tipo: 'TRASPASO_SALIDA', fecha: '2026-01-07', monto: '10', estado: 'APROBADO' });
    seedMovimiento({ negocioId: 1, cuentaBancoId: 14, tipo: 'INGRESO', fecha: '2026-01-08', monto: '999', estado: 'PENDIENTE' });
    const token = await makeToken({ userId: 2, email: 'admin@onebusiness.test', rol: 'Admin', negocios: [1] });

    const request = new Request('http://localhost/api/cuentas-banco/14/arqueo?fechaCorte=2026-01-10', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await getArqueoCuenta(request, { params: { id: '14' } });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.saldoInicial).toBe(100);
    expect(body.data.ingreso).toBe(50);
    expect(body.data.egreso).toBe(20);
    expect(body.data.traspasoSalida).toBe(10);
    expect(body.data.saldoCalculado).toBe(120);
    expect(body.data.movimientosPendientes).toBe(1);
  });

  it('Socio recibe 403', async () => {
    seedNegocio({ id: 1 });
    seedCuentaBanco({ id: 15, negocioId: 1, saldoInicial: '100', saldoReal: null });
    const token = await makeToken({ userId: 3, email: 'socio@onebusiness.test', rol: 'Socio', negocios: [1] });

    const request = new Request('http://localhost/api/cuentas-banco/15/arqueo?fechaCorte=2026-01-10', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await getArqueoCuenta(request, { params: { id: '15' } });
    expect(response.status).toBe(403);
  });

  it('Externo recibe 403', async () => {
    seedNegocio({ id: 1 });
    seedCuentaBanco({ id: 16, negocioId: 1, saldoInicial: '100', saldoReal: null });
    const token = await makeToken({ userId: 4, email: 'externo@onebusiness.test', rol: 'Externo', negocios: [1] });

    const request = new Request('http://localhost/api/cuentas-banco/16/arqueo?fechaCorte=2026-01-10', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await getArqueoCuenta(request, { params: { id: '16' } });
    expect(response.status).toBe(403);
  });
});
