import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';

const dbState = vi.hoisted(() => ({
  negociosRows: [] as Array<{ id: number; nombre: string }>,
  cuentasRows: [] as Array<{ id: number; nombre: string; negocioId: number }>,
  usuarioNegocioRows: [] as Array<{ negocioId: number }>,
  insertedMovimientos: [] as Array<Record<string, unknown>>,
  failOnInsertCall: null as number | null,
}));

vi.mock('@/lib/audit-logger', () => {
  return {
    auditLog: vi.fn().mockResolvedValue(undefined),
    getRequestContext: () => ({ ipAddress: '127.0.0.1', userAgent: 'vitest', requestId: 'test-request' }),
  };
});

vi.mock('@/lib/db', async () => {
  const { usuarios, negocios, cuentasBanco, usuarioNegocio, movimientos } = await import('@/lib/drizzle');

  const makeQuery = (execute: () => Promise<any[]>) => {
    return {
      limit: async () => execute(),
      then: (resolve: (value: any) => any, reject: (reason: any) => any) => execute().then(resolve, reject),
      catch: (reject: (reason: any) => any) => execute().catch(reject),
      finally: (fn: () => any) => execute().finally(fn),
    };
  };

  return {
    db: {
      select: () => ({
        from: (table: unknown) => ({
          where: () => {
            if (table === usuarios) {
              return {
                limit: async () => [{ tokenVersion: 0 }],
              };
            }
            if (table === negocios) {
              return makeQuery(async () => dbState.negociosRows);
            }
            if (table === cuentasBanco) {
              return makeQuery(async () => dbState.cuentasRows);
            }
            if (table === usuarioNegocio) {
              return makeQuery(async () => dbState.usuarioNegocioRows);
            }
            return makeQuery(async () => []);
          },
        }),
      }),
      transaction: async (fn: (tx: any) => Promise<any>) => {
        const localInserted: Array<Record<string, unknown>> = [];
        let insertCall = 0;

        const tx = {
          insert: (table: unknown) => {
            if (table !== movimientos) {
              throw new Error('Unexpected insert table');
            }
            return {
              values: async (values: Record<string, unknown>) => {
                insertCall += 1;
                if (typeof dbState.failOnInsertCall === 'number' && insertCall === dbState.failOnInsertCall) {
                  throw new Error('insert failed');
                }
                localInserted.push(values);
                return [{ id: insertCall }];
              },
            };
          },
        };

        try {
          const result = await fn(tx);
          dbState.insertedMovimientos.push(...localInserted);
          return result;
        } catch (error) {
          throw error;
        }
      },
    },
  };
});

import { generateAccessToken } from '@/lib/jwt';
import { POST as importarPost } from '@/app/api/movimientos/importar/route';

function makeWorkbookBuffer(rows: Array<Array<string | number>>) {
  const header = ['fecha', 'tipo', 'concepto', 'monto', 'negocio', 'cuenta_banco', 'tercero'];
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

async function makeRequest(token: string, buffer: Buffer) {
  const form = new FormData();
  const body = new Uint8Array(buffer);
  const file = new File([body], 'movimientos.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  form.append('archivo', file);
  return new Request('http://localhost/api/movimientos/importar', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: form,
  });
}

describe('Movimientos import /api/movimientos/importar integration (handlers)', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = '01234567890123456789012345678901';
    vi.resetAllMocks();
    dbState.negociosRows = [];
    dbState.cuentasRows = [];
    dbState.usuarioNegocioRows = [];
    dbState.insertedMovimientos = [];
    dbState.failOnInsertCall = null;
  });

  it('Importación exitosa: 200 y crea 3 movimientos en estado PENDIENTE', async () => {
    dbState.negociosRows = [
      { id: 1, nombre: 'FOODPARK' },
      { id: 2, nombre: 'GAS' },
    ];
    dbState.cuentasRows = [
      { id: 10, nombre: 'CDM BBVA', negocioId: 1 },
      { id: 11, nombre: 'MADSA', negocioId: 2 },
    ];

    const token = await generateAccessToken({
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1, 2],
      tokenVersion: 0,
    });

    const buffer = makeWorkbookBuffer([
      ['2026-01-15', 'INGRESO', 'Venta de producto', 5000.0, 'FOODPARK', 'CDM BBVA', 'Cliente Ejemplo SA'],
      ['2026-01-15', 'EGRESO', 'Pago de proveedor', 1200.5, 'FOODPARK', 'CDM BBVA', 'Proveedor Ejemplo'],
      ['2026-01-16', 'INGRESO', 'Cobro de servicio', 3800.0, 'GAS', 'MADSA', ''],
    ]);

    const request = await makeRequest(token, buffer);
    const response = await importarPost(request);

    expect(response.status).toBe(200);
    const json = (await response.json()) as { success: boolean; data: any };
    expect(json.success).toBe(true);
    expect(json.data.total).toBe(3);
    expect(json.data.creados).toBe(3);
    expect(dbState.insertedMovimientos).toHaveLength(3);
    expect(dbState.insertedMovimientos.every((m) => m.estado === 'PENDIENTE')).toBe(true);
  });

  it('Error de formato: monto negativo retorna 400 y no crea movimientos', async () => {
    const token = await generateAccessToken({
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1],
      tokenVersion: 0,
    });

    const buffer = makeWorkbookBuffer([['2026-01-15', 'INGRESO', 'Venta', -10, 'FOODPARK', 'CDM BBVA', 'Cliente']]);
    const request = await makeRequest(token, buffer);
    const response = await importarPost(request);

    expect(response.status).toBe(400);
    const json = (await response.json()) as { success: boolean; error: string; data: any };
    expect(json.success).toBe(false);
    expect(json.data.errores[0].campo).toBe('monto');
    expect(json.data.errores[0].fila).toBe(2);
    expect(dbState.insertedMovimientos).toHaveLength(0);
  });

  it('Error de nombre no encontrado: negocio inválido retorna 400 y menciona el nombre', async () => {
    dbState.negociosRows = [{ id: 1, nombre: 'FOODPARK' }];
    dbState.cuentasRows = [{ id: 10, nombre: 'CDM BBVA', negocioId: 1 }];

    const token = await generateAccessToken({
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1],
      tokenVersion: 0,
    });

    const buffer = makeWorkbookBuffer([['2026-01-15', 'INGRESO', 'Venta', 10, 'FOODPARKK', 'CDM BBVA', 'Cliente']]);
    const request = await makeRequest(token, buffer);
    const response = await importarPost(request);

    expect(response.status).toBe(400);
    const json = (await response.json()) as { success: boolean; data: { errores: ImportErrorItem[] } };
    expect(json.success).toBe(false);
    expect(json.data.errores.some((e) => e.campo === 'negocio' && e.error.includes("FOODPARKK"))).toBe(true);
    expect(dbState.insertedMovimientos).toHaveLength(0);
  });

  it('Rollback total: fallo en insert del movimiento 2 retorna 500 y crea 0', async () => {
    dbState.negociosRows = [{ id: 1, nombre: 'FOODPARK' }];
    dbState.cuentasRows = [{ id: 10, nombre: 'CDM BBVA', negocioId: 1 }];
    dbState.failOnInsertCall = 2;

    const token = await generateAccessToken({
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1],
      tokenVersion: 0,
    });

    const buffer = makeWorkbookBuffer([
      ['2026-01-15', 'INGRESO', 'Venta 1', 10, 'FOODPARK', 'CDM BBVA', ''],
      ['2026-01-15', 'INGRESO', 'Venta 2', 10, 'FOODPARK', 'CDM BBVA', ''],
      ['2026-01-15', 'INGRESO', 'Venta 3', 10, 'FOODPARK', 'CDM BBVA', ''],
    ]);
    const request = await makeRequest(token, buffer);
    const response = await importarPost(request);

    expect(response.status).toBe(500);
    expect(dbState.insertedMovimientos).toHaveLength(0);
  });

  it('Rol Externo bloqueado: retorna 403', async () => {
    const token = await generateAccessToken({
      userId: 4,
      email: 'externo@onebusiness.test',
      rol: 'Externo',
      negocios: [1],
      tokenVersion: 0,
    });

    const buffer = makeWorkbookBuffer([['2026-01-15', 'INGRESO', 'Venta', 10, 'FOODPARK', 'CDM BBVA', '']]);
    const request = await makeRequest(token, buffer);
    const response = await importarPost(request);

    expect(response.status).toBe(403);
  });

  it('Límite de filas: 201 filas retorna 400 antes de procesar', async () => {
    const token = await generateAccessToken({
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1],
      tokenVersion: 0,
    });

    const rows: Array<Array<string | number>> = [];
    for (let i = 0; i < 201; i++) {
      rows.push(['2026-01-15', 'INGRESO', `Venta ${i + 1}`, 10, 'FOODPARK', 'CDM BBVA', '']);
    }
    const buffer = makeWorkbookBuffer(rows);
    const request = await makeRequest(token, buffer);
    const response = await importarPost(request);

    expect(response.status).toBe(400);
    const json = (await response.json()) as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(json.error).toContain('200');
    expect(dbState.insertedMovimientos).toHaveLength(0);
  });

  it('Validación tenant: Socio sin acceso al negocio retorna 400 con error en fila', async () => {
    dbState.negociosRows = [
      { id: 1, nombre: 'FOODPARK' },
      { id: 2, nombre: 'GAS' },
    ];
    dbState.cuentasRows = [
      { id: 10, nombre: 'CDM BBVA', negocioId: 1 },
      { id: 11, nombre: 'MADSA', negocioId: 2 },
    ];
    dbState.usuarioNegocioRows = [{ negocioId: 1 }];

    const token = await generateAccessToken({
      userId: 2,
      email: 'socio@onebusiness.test',
      rol: 'Socio',
      negocios: [1],
      tokenVersion: 0,
    });

    const buffer = makeWorkbookBuffer([
      ['2026-01-15', 'INGRESO', 'Venta', 10, 'GAS', 'MADSA', ''],
      ['2026-01-15', 'INGRESO', 'Venta', 10, 'FOODPARK', 'CDM BBVA', ''],
    ]);
    const request = await makeRequest(token, buffer);
    const response = await importarPost(request);

    expect(response.status).toBe(400);
    const json = (await response.json()) as { success: boolean; data: { errores: ImportErrorItem[] } };
    expect(json.success).toBe(false);
    expect(json.data.errores.some((e) => e.fila === 2 && e.campo === 'negocio')).toBe(true);
    expect(dbState.insertedMovimientos).toHaveLength(0);
  });
});

type ImportErrorItem = { fila: number; campo: string; error: string };
