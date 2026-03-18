import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cotizacionItems, cotizaciones } from '@/lib/drizzle';
import { CotizacionService } from '@/services/cotizacion.service';

vi.mock('@/lib/db', () => {
  const state = {
    selectCountQueue: [] as number[],
    cotizacionReturningQueue: [] as any[],
    itemsSelectQueue: [] as any[][],
    lastCotizacionInsertValues: null as any,
  };

  const tx = {
    execute: vi.fn(async () => undefined),
    select: vi.fn((shape?: any) => {
      const isCount = !!shape?.count;
      return {
        from: (table: any) => {
          if (isCount && table === cotizaciones) {
            return {
              where: () => ({
                then: (cb: any) => cb([{ count: state.selectCountQueue.shift() ?? 0 }]),
              }),
            };
          }
          if (!isCount && table === cotizacionItems) {
            return {
              where: () => ({
                orderBy: async () => state.itemsSelectQueue.shift() ?? [],
              }),
            };
          }
          return {
            where: () => ({
              limit: async () => [],
              orderBy: async () => [],
            }),
          };
        },
      };
    }),
    insert: vi.fn((table: any) => {
      if (table === cotizaciones) {
        return {
          values: (values: any) => {
            state.lastCotizacionInsertValues = values;
            return {
              returning: async () => [state.cotizacionReturningQueue.shift()],
            };
          },
        };
      }
      if (table === cotizacionItems) {
        return {
          values: async () => [],
        };
      }
      return {
        values: () => ({
          returning: async () => [],
        }),
      };
    }),
  };

  const db = {
    __reset() {
      state.selectCountQueue = [];
      state.cotizacionReturningQueue = [];
      state.itemsSelectQueue = [];
      state.lastCotizacionInsertValues = null;
      tx.execute.mockClear();
      tx.select.mockClear();
      tx.insert.mockClear();
    },
    __queueSelectCount(value: number) {
      state.selectCountQueue.push(value);
    },
    __queueCotizacionReturning(row: any) {
      state.cotizacionReturningQueue.push(row);
    },
    __queueItemsSelect(rows: any[]) {
      state.itemsSelectQueue.push(rows);
    },
    __getLastCotizacionInsertValues() {
      return state.lastCotizacionInsertValues;
    },
    transaction: async (fn: any) => fn(tx),
  };

  return { db };
});

import { db } from '@/lib/db';

function makeReturningCotizacion(overrides: Partial<any> = {}) {
  return {
    id: 1,
    negocioId: 1,
    folio: 'COT-2026-001',
    folioExterno: null,
    clienteNombre: 'Cliente',
    clienteRfc: null,
    clienteDireccion: null,
    fecha: '2026-01-01',
    estado: 'BORRADOR',
    numeroOc: null,
    numeroFactura: null,
    cuentaBancoId: null,
    categoriaId: null,
    fechaAprobacion: null,
    fechaFacturacion: null,
    movimientoId: null,
    subtotal: '0',
    iva: '0',
    total: '0',
    notas: null,
    creadoPor: 1,
    aprobadoPor: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('CotizacionService (unit)', () => {
  beforeEach(() => {
    vi.mocked(db as any).__reset();
  });

  it('crearCotizacion calcula subtotal = suma de importes correctamente', async () => {
    vi.mocked(db as any).__queueSelectCount(0);
    vi.mocked(db as any).__queueCotizacionReturning(makeReturningCotizacion());
    vi.mocked(db as any).__queueItemsSelect([]);

    const service = new CotizacionService();
    await service.crearCotizacion({
      negocioId: 1,
      clienteNombre: 'Cliente',
      fecha: '2026-01-01',
      items: [
        { descripcion: 'A', importe: 100 },
        { descripcion: 'B', importe: 50.25 },
      ],
      creadoPor: 1,
    });

    const values = vi.mocked(db as any).__getLastCotizacionInsertValues();
    expect(values.subtotal).toBe('150.25');
  });

  it('crearCotizacion calcula iva = subtotal × 0.16 redondeado a 2 decimales', async () => {
    vi.mocked(db as any).__queueSelectCount(0);
    vi.mocked(db as any).__queueCotizacionReturning(makeReturningCotizacion());
    vi.mocked(db as any).__queueItemsSelect([]);

    const service = new CotizacionService();
    await service.crearCotizacion({
      negocioId: 1,
      clienteNombre: 'Cliente',
      fecha: '2026-01-01',
      items: [{ descripcion: 'A', importe: 0.01 }],
      creadoPor: 1,
    });

    const values = vi.mocked(db as any).__getLastCotizacionInsertValues();
    expect(values.iva).toBe('0.00');
  });

  it('crearCotizacion calcula total = subtotal + iva', async () => {
    vi.mocked(db as any).__queueSelectCount(0);
    vi.mocked(db as any).__queueCotizacionReturning(makeReturningCotizacion());
    vi.mocked(db as any).__queueItemsSelect([]);

    const service = new CotizacionService();
    await service.crearCotizacion({
      negocioId: 1,
      clienteNombre: 'Cliente',
      fecha: '2026-01-01',
      items: [{ descripcion: 'A', importe: 100 }],
      creadoPor: 1,
    });

    const values = vi.mocked(db as any).__getLastCotizacionInsertValues();
    expect(values.subtotal).toBe('100.00');
    expect(values.iva).toBe('16.00');
    expect(values.total).toBe('116.00');
  });

  it('generarFolio genera COT-2026-001 para la primera cotización del año', async () => {
    vi.mocked(db as any).__queueSelectCount(0);
    vi.mocked(db as any).__queueCotizacionReturning(makeReturningCotizacion());
    vi.mocked(db as any).__queueItemsSelect([]);

    const service = new CotizacionService();
    await service.crearCotizacion({
      negocioId: 1,
      clienteNombre: 'Cliente',
      fecha: '2026-01-15',
      items: [{ descripcion: 'A', importe: 10 }],
      creadoPor: 1,
    });

    const values = vi.mocked(db as any).__getLastCotizacionInsertValues();
    expect(values.folio).toBe('COT-2026-001');
  });

  it('generarFolio genera COT-2026-003 cuando ya existen 001 y 002', async () => {
    vi.mocked(db as any).__queueSelectCount(2);
    vi.mocked(db as any).__queueCotizacionReturning(makeReturningCotizacion());
    vi.mocked(db as any).__queueItemsSelect([]);

    const service = new CotizacionService();
    await service.crearCotizacion({
      negocioId: 1,
      clienteNombre: 'Cliente',
      fecha: '2026-01-15',
      items: [{ descripcion: 'A', importe: 10 }],
      creadoPor: 1,
    });

    const values = vi.mocked(db as any).__getLastCotizacionInsertValues();
    expect(values.folio).toBe('COT-2026-003');
  });
});

