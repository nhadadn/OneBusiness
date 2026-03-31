import { beforeEach, describe, expect, it, vi } from 'vitest';

import { categorias, movimientos, usuarios } from '@/lib/drizzle';

vi.mock('@/lib/audit-logger', () => ({ auditLog: vi.fn() }));

vi.mock('@/services/email.service', () => {
  return {
    EmailService: vi.fn().mockImplementation(() => ({
      notificarNuevoPendiente: vi.fn().mockResolvedValue(undefined),
      notificarEdicionRequiereAprobacion: vi.fn().mockResolvedValue(undefined),
      notificarReenvio: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

vi.mock('@/lib/db', () => {
  const state = {
    selectQueue: new Map<any, any[][]>(),
    lastInsertValues: new Map<any, any>(),
    nextMovimientoId: 1,
  };

  const db = {
    __reset() {
      state.selectQueue.clear();
      state.lastInsertValues.clear();
      state.nextMovimientoId = 1;
    },
    __queueSelect(table: any, result: any[]) {
      const q = state.selectQueue.get(table) ?? [];
      q.push(result);
      state.selectQueue.set(table, q);
    },
    __getLastInsertValues(table: any) {
      return state.lastInsertValues.get(table);
    },
    select: (_shape?: any) => {
      return {
        from: (table: any) => {
          if (table === usuarios) {
            return {
              where: () => ({
                limit: async () => [{ tokenVersion: 0 }],
              }),
              innerJoin: () => ({
                innerJoin: () => ({
                  where: async () => [],
                }),
              }),
            };
          }

          return {
            where: () => {
              const next = state.selectQueue.get(table)?.shift() ?? [];
              return {
                limit: async () => next,
                orderBy: async () => next,
              };
            },
          };
        },
      };
    },
    insert: (table: any) => {
      return {
        values: (values: any) => {
          state.lastInsertValues.set(table, values);
          return {
            returning: async () => {
              if (table === movimientos) {
                return [
                  {
                    id: state.nextMovimientoId++,
                    activo: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    ...values,
                  },
                ];
              }
              return [{ id: 1, ...values }];
            },
          };
        },
      };
    },
    transaction: async (fn: any) => fn(db),
  };

  return { db };
});

const categoriaServiceMocks = vi.hoisted(() => ({
  crearCategoria: vi.fn(),
  actualizarCategoria: vi.fn(),
}));

vi.mock('@/services/categoria.service', () => {
  return {
    CategoriaService: vi.fn().mockImplementation(() => categoriaServiceMocks),
  };
});

import { generateAccessToken } from '@/lib/jwt';
import { POST as categoriasPost } from '@/app/api/categorias/route';
import { PUT as categoriasPut } from '@/app/api/categorias/[id]/route';
import { db } from '@/lib/db';
import { MovimientoService } from '@/services/movimiento.service';

describe('Aprobación automática por categoría', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = '01234567890123456789012345678901';
    (db as any).__reset();
    vi.resetAllMocks();
  });

  describe('POST /api/movimientos con categoría sin aprobación', () => {
    it('crea movimiento en APROBADO si categoria.requiereAprobacion=false', async () => {
      (db as any).__queueSelect(categorias, [{ requiereAprobacion: false, montoMaxSinAprobacion: null }]);
      const service = new MovimientoService();
      const movimiento = await service.crear(
        {
          negocioId: 1,
          tipo: 'EGRESO',
          fecha: '2026-01-10',
          concepto: 'Gasto',
          monto: 100,
          cuentaBancoId: 1,
          categoriaId: 1,
        },
        10
      );
      expect(movimiento.estado).toBe('APROBADO');
    });

    it('crea movimiento en APROBADO si monto <= montoMaxSinAprobacion', async () => {
      (db as any).__queueSelect(categorias, [{ requiereAprobacion: true, montoMaxSinAprobacion: '500' }]);
      const service = new MovimientoService();
      const movimiento = await service.crear(
        {
          negocioId: 1,
          tipo: 'EGRESO',
          fecha: '2026-01-10',
          concepto: 'Gasto',
          monto: 500,
          cuentaBancoId: 1,
          categoriaId: 2,
        },
        10
      );
      expect(movimiento.estado).toBe('APROBADO');
    });

    it('crea movimiento en PENDIENTE si monto > montoMaxSinAprobacion', async () => {
      (db as any).__queueSelect(categorias, [{ requiereAprobacion: true, montoMaxSinAprobacion: '500' }]);
      const service = new MovimientoService();
      vi.spyOn(service as any, 'notificarNuevoMovimiento').mockResolvedValue(undefined);
      const movimiento = await service.crear(
        {
          negocioId: 1,
          tipo: 'EGRESO',
          fecha: '2026-01-10',
          concepto: 'Gasto',
          monto: 600,
          cuentaBancoId: 1,
          categoriaId: 3,
        },
        10
      );
      expect(movimiento.estado).toBe('PENDIENTE');
    });

    it('crea movimiento en PENDIENTE si no tiene categoriaId', async () => {
      const service = new MovimientoService();
      vi.spyOn(service as any, 'notificarNuevoMovimiento').mockResolvedValue(undefined);
      const movimiento = await service.crear(
        {
          negocioId: 1,
          tipo: 'EGRESO',
          fecha: '2026-01-10',
          concepto: 'Gasto',
          monto: 100,
          cuentaBancoId: 1,
        },
        10
      );
      expect(movimiento.estado).toBe('PENDIENTE');
    });
  });

  describe('CRUD categorías con campos nuevos', () => {
    it('POST /api/categorias crea categoría con requiereAprobacion=false', async () => {
      categoriaServiceMocks.crearCategoria.mockResolvedValue({ id: 1, requiereAprobacion: false, montoMaxSinAprobacion: null });
      const token = await generateAccessToken({ userId: 1, email: 'admin@onebusiness.test', rol: 'Admin', negocios: [1], tokenVersion: 0 });
      const request = new Request('http://localhost/api/categorias?negocioId=1', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ nombre: 'Caja chica', tipo: 'egreso', requiereAprobacion: false }),
      });
      const response = await categoriasPost(request);
      const body = await response.json();
      expect(body.data.requiereAprobacion).toBe(false);
    });

    it('POST /api/categorias crea categoría con montoMaxSinAprobacion', async () => {
      categoriaServiceMocks.crearCategoria.mockResolvedValue({ id: 2, requiereAprobacion: true, montoMaxSinAprobacion: '500' });
      const token = await generateAccessToken({ userId: 1, email: 'admin@onebusiness.test', rol: 'Admin', negocios: [1], tokenVersion: 0 });
      const request = new Request('http://localhost/api/categorias?negocioId=1', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ nombre: 'Caja chica', tipo: 'egreso', requiereAprobacion: true, montoMaxSinAprobacion: '500' }),
      });
      const response = await categoriasPost(request);
      const body = await response.json();
      expect(body.data.montoMaxSinAprobacion).toBe('500');
    });

    it('POST /api/categorias retorna 400 si requiereAprobacion=false y montoMaxSinAprobacion tiene valor', async () => {
      const token = await generateAccessToken({ userId: 1, email: 'admin@onebusiness.test', rol: 'Admin', negocios: [1], tokenVersion: 0 });
      const request = new Request('http://localhost/api/categorias?negocioId=1', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ nombre: 'Caja chica', tipo: 'egreso', requiereAprobacion: false, montoMaxSinAprobacion: '500' }),
      });
      const response = await categoriasPost(request);
      expect(response.status).toBe(400);
    });

    it('PUT /api/categorias/:id actualiza requiereAprobacion y montoMaxSinAprobacion', async () => {
      categoriaServiceMocks.actualizarCategoria.mockResolvedValue({ id: 3, requiereAprobacion: true, montoMaxSinAprobacion: '100' });
      const token = await generateAccessToken({ userId: 1, email: 'admin@onebusiness.test', rol: 'Admin', negocios: [1], tokenVersion: 0 });
      const request = new Request('http://localhost/api/categorias/3?negocioId=1', {
        method: 'PUT',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ requiereAprobacion: true, montoMaxSinAprobacion: '100' }),
      });
      const response = await categoriasPut(request, { params: { id: '3' } });
      const body = await response.json();
      expect(body.data.montoMaxSinAprobacion).toBe('100');
    });
  });
});
