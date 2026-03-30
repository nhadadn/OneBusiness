'use client';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbState = vi.hoisted(() => ({
  usuarios: [] as Array<{ id: number; email: string; tokenVersion: number }>,
  usuarioNegocio: [] as Array<{ id: number; usuarioId: number; negocioId: number }>,
  cotizaciones: [] as Array<{
    id: number;
    negocioId: number;
    folio: string;
    clienteNombre: string;
    total: string;
    estado: string;
    creadoPor: number;
    movimientoId: number | null;
    categoriaId: number | null;
    createdAt: Date;
    updatedAt: Date;
  }>,
  cotizacionItems: [] as Array<{
    id: number;
    cotizacionId: number;
    orden: number;
    descripcion: string;
    importe: string;
  }>,
  nextIds: {
    usuarioNegocio: 1,
    cotizacionItems: 1,
  },
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
      const key = getColumnKey((chunk as any).encoder);
      if (key && lastOp && lastColumnKey) {
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

vi.mock('@/lib/audit-logger', () => {
  return {
    auditLog: vi.fn(async () => undefined),
    getRequestContext: () => ({ ipAddress: 'test', userAgent: 'vitest', requestId: 'req-1' }),
  };
});

vi.mock('@/lib/db', async () => {
  const { cotizaciones, cotizacionItems, usuarioNegocio, usuarios, movimientos } = await import('@/lib/drizzle');

  const db = {
    transaction: async (cb: any) => {
      return cb(db);
    },
    select: (shape?: any) => {
      const state = { shape, table: null as any, where: null as any };
      return {
        from: (table: any) => {
          state.table = table;
          const withWhere = {
            where: (where: any) => {
              state.where = where;
              return {
                limit: async (n: number) => {
                  if (table === usuarios) {
                    return [{ tokenVersion: 0 }].slice(0, n);
                  }
                  if (table === cotizaciones) {
                    const preds = extractPredicates(where);
                    const rows = dbState.cotizaciones.filter((r) => matchesPredicates(r as any, preds));
                    return rows.slice(0, n);
                  }
                  if (table === usuarioNegocio) {
                    const preds = extractPredicates(where);
                    const rows = dbState.usuarioNegocio.filter((r) => matchesPredicates(r as any, preds));
                    return rows.slice(0, n);
                  }
                  if (table === movimientos) {
                    return [];
                  }
                  return [];
                },
                orderBy: async () => {
                  if (table === cotizacionItems) {
                    const preds = extractPredicates(where);
                    const rows = dbState.cotizacionItems
                      .filter((r) => matchesPredicates(r as any, preds))
                      .sort((a, b) => a.orden - b.orden);
                    return rows;
                  }
                  return [];
                },
              };
            },
            limit: async (n: number) => {
              if (table === usuarios) {
                return [{ tokenVersion: 0 }].slice(0, n);
              }
              return [];
            },
          };
          return withWhere;
        },
      };
    },
    update: (table: any) => {
      return {
        set: (values: any) => {
          return {
            where: (where: any) => {
              return {
                returning: async () => {
                  if (table === cotizaciones) {
                    const preds = extractPredicates(where);
                    const existing = dbState.cotizaciones.find((r) => matchesPredicates(r as any, preds));
                    if (!existing) return [];
                    Object.assign(existing, values);
                    return [existing];
                  }
                  return [];
                },
              };
            },
          };
        },
      };
    },
    insert: (table: any) => {
      return {
        values: (values: any) => {
          return {
            returning: async () => {
              if (table === cotizacionItems) {
                const created = { id: dbState.nextIds.cotizacionItems++, ...values };
                dbState.cotizacionItems.push(created);
                return [created];
              }
              return [];
            },
          };
        },
      };
    },
    delete: () => {
      return {
        where: async () => undefined,
      };
    },
  };

  return { db };
});

import { generateAccessToken } from '@/lib/jwt';
import { PATCH as patchEstado } from '@/app/api/cotizaciones/[id]/estado/route';

function seedUsuario(params: { id: number; email: string }) {
  dbState.usuarios.push({ id: params.id, email: params.email, tokenVersion: 0 });
}

function seedUsuarioNegocio(params: { usuarioId: number; negocioId: number }) {
  dbState.usuarioNegocio.push({ id: dbState.nextIds.usuarioNegocio++, ...params });
}

function seedCotizacion(params: {
  id: number;
  negocioId: number;
  estado: string;
  creadoPor: number;
  movimientoId?: number | null;
}) {
  dbState.cotizaciones.push({
    id: params.id,
    negocioId: params.negocioId,
    folio: `COT-2026-${String(params.id).padStart(3, '0')}`,
    clienteNombre: 'Cliente Test',
    total: '100.00',
    estado: params.estado,
    creadoPor: params.creadoPor,
    movimientoId: params.movimientoId ?? null,
    categoriaId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
  dbState.cotizacionItems.push({
    id: dbState.nextIds.cotizacionItems++,
    cotizacionId: params.id,
    orden: 1,
    descripcion: 'Item 1',
    importe: '100.00',
  });
}

async function makeToken(params: { userId: number; email: string; rol: 'Dueño' | 'Admin' | 'Socio' | 'Externo'; negocios: number[] }) {
  seedUsuario({ id: params.userId, email: params.email });
  return generateAccessToken({ ...params, tokenVersion: 0 });
}

describe('Cancelar cotización PATCH /api/cotizaciones/:id/estado (integration)', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = '01234567890123456789012345678901';
    vi.resetAllMocks();
    dbState.usuarios.length = 0;
    dbState.usuarioNegocio.length = 0;
    dbState.cotizaciones.length = 0;
    dbState.cotizacionItems.length = 0;
    dbState.nextIds.usuarioNegocio = 1;
    dbState.nextIds.cotizacionItems = 1;
  });

  it('cancela cotización en BORRADOR → 200 y estado CANCELADA', async () => {
    const token = await makeToken({ userId: 1, email: 'dueno@onebusiness.test', rol: 'Dueño', negocios: [1] });
    seedCotizacion({ id: 10, negocioId: 1, estado: 'BORRADOR', creadoPor: 2 });

    const request = new Request('http://localhost/api/cotizaciones/10/estado', {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ estado: 'CANCELADA' }),
    });

    const response = await patchEstado(request, { params: { id: '10' } });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.estado).toBe('CANCELADA');
  });

  it('cancela cotización en ENVIADA → 200 y estado CANCELADA', async () => {
    const token = await makeToken({ userId: 1, email: 'admin@onebusiness.test', rol: 'Admin', negocios: [1] });
    seedUsuarioNegocio({ usuarioId: 1, negocioId: 1 });
    seedCotizacion({ id: 11, negocioId: 1, estado: 'ENVIADA', creadoPor: 1 });

    const request = new Request('http://localhost/api/cotizaciones/11/estado', {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ estado: 'CANCELADA' }),
    });

    const response = await patchEstado(request, { params: { id: '11' } });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.estado).toBe('CANCELADA');
  });

  it('cancela cotización en APROBADA → 200 y estado CANCELADA', async () => {
    const token = await makeToken({ userId: 1, email: 'admin@onebusiness.test', rol: 'Admin', negocios: [1] });
    seedUsuarioNegocio({ usuarioId: 1, negocioId: 1 });
    seedCotizacion({ id: 12, negocioId: 1, estado: 'APROBADA', creadoPor: 1 });

    const request = new Request('http://localhost/api/cotizaciones/12/estado', {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ estado: 'CANCELADA' }),
    });

    const response = await patchEstado(request, { params: { id: '12' } });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.estado).toBe('CANCELADA');
  });

  it('cancelar cotización FACTURADA retorna 400', async () => {
    const token = await makeToken({ userId: 1, email: 'admin@onebusiness.test', rol: 'Admin', negocios: [1] });
    seedUsuarioNegocio({ usuarioId: 1, negocioId: 1 });
    seedCotizacion({ id: 13, negocioId: 1, estado: 'FACTURADA', creadoPor: 1, movimientoId: 99 });

    const request = new Request('http://localhost/api/cotizaciones/13/estado', {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ estado: 'CANCELADA' }),
    });

    const response = await patchEstado(request, { params: { id: '13' } });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  it('Externo no puede cancelar → 403', async () => {
    const token = await makeToken({ userId: 2, email: 'externo@onebusiness.test', rol: 'Externo', negocios: [1] });
    seedUsuarioNegocio({ usuarioId: 2, negocioId: 1 });
    seedCotizacion({ id: 14, negocioId: 1, estado: 'BORRADOR', creadoPor: 2 });

    const request = new Request('http://localhost/api/cotizaciones/14/estado', {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ estado: 'CANCELADA' }),
    });

    const response = await patchEstado(request, { params: { id: '14' } });
    expect(response.status).toBe(403);
  });

  it('Socio no puede cancelar → 403', async () => {
    const token = await makeToken({ userId: 3, email: 'socio@onebusiness.test', rol: 'Socio', negocios: [1] });
    seedUsuarioNegocio({ usuarioId: 3, negocioId: 1 });
    seedCotizacion({ id: 15, negocioId: 1, estado: 'ENVIADA', creadoPor: 3 });

    const request = new Request('http://localhost/api/cotizaciones/15/estado', {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ estado: 'CANCELADA' }),
    });

    const response = await patchEstado(request, { params: { id: '15' } });
    expect(response.status).toBe(403);
  });
});
