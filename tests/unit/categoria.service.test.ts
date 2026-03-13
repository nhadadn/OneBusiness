import { describe, expect, it, vi } from 'vitest';

import { categorias } from '@/lib/drizzle';

vi.mock('@/lib/db', () => {
  const state = {
    selectQueue: [] as any[][],
    insertReturningQueue: [] as any[][],
    updateReturningQueue: [] as any[][],
    lastInsertValues: null as any,
    lastUpdateValues: null as any,
  };

  const db = {
    __reset() {
      state.selectQueue = [];
      state.insertReturningQueue = [];
      state.updateReturningQueue = [];
      state.lastInsertValues = null;
      state.lastUpdateValues = null;
    },
    __queueSelect(result: any[]) {
      state.selectQueue.push(result);
    },
    __queueInsertReturning(result: any[]) {
      state.insertReturningQueue.push(result);
    },
    __queueUpdateReturning(result: any[]) {
      state.updateReturningQueue.push(result);
    },
    __getLastInsertValues() {
      return state.lastInsertValues;
    },
    __getLastUpdateValues() {
      return state.lastUpdateValues;
    },
    select: vi.fn((_shape?: any) => {
      return {
        from: (table: any) => {
          if (table !== categorias) {
            return {
              where: () => ({
                limit: async () => [],
                orderBy: async () => [],
              }),
            };
          }

          return {
            where: () => {
              const next = state.selectQueue.shift() ?? [];
              return {
                limit: async () => next,
                orderBy: async () => next,
              };
            },
          };
        },
      };
    }),
    insert: vi.fn((table: any) => {
      if (table !== categorias) {
        return {
          values: () => ({
            returning: async () => [],
          }),
        };
      }

      return {
        values: (values: any) => {
          state.lastInsertValues = values;
          return {
            returning: async () => state.insertReturningQueue.shift() ?? [],
          };
        },
      };
    }),
    update: vi.fn((table: any) => {
      if (table !== categorias) {
        return {
          set: () => ({
            where: () => ({
              returning: async () => [],
            }),
          }),
        };
      }

      return {
        set: (values: any) => {
          state.lastUpdateValues = values;
          return {
            where: () => ({
              returning: async () => state.updateReturningQueue.shift() ?? [],
            }),
          };
        },
      };
    }),
  };

  return { db };
});

import { db } from '@/lib/db';
import { CategoriaService } from '@/services/categoria.service';

function makeCategoria(overrides: Partial<any> = {}) {
  return {
    id: 1,
    nombre: 'Ventas',
    tipo: 'INGRESO',
    negocioId: null,
    activa: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('CategoriaService', () => {
  const service = new CategoriaService();

  it('listarCategorias retorna categorías globales y específicas del negocio', async () => {
    (db as any).__reset();
    (db as any).__queueSelect([makeCategoria({ id: 1, negocioId: null }), makeCategoria({ id: 2, nombre: 'Renta', tipo: 'EGRESO', negocioId: null })]);
    (db as any).__queueSelect([makeCategoria({ id: 3, nombre: 'Gasolina', tipo: 'EGRESO', negocioId: 1 })]);

    const result = await service.listarCategorias(1);
    expect(result).toHaveLength(3);
    expect(result.every((c) => c.activa === true)).toBe(true);
    expect(result[0]?.negocioId).toBeNull();
    expect(result[2]?.negocioId).toBe(1);
  });

  it('listarCategorias filtra por tipo ingreso cuando se especifica', async () => {
    (db as any).__reset();
    (db as any).__queueSelect([makeCategoria({ id: 1, tipo: 'INGRESO', negocioId: null })]);
    (db as any).__queueSelect([makeCategoria({ id: 2, tipo: 'INGRESO', negocioId: 1 })]);

    const result = await service.listarCategorias(1, 'ingreso');
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.tipo === 'INGRESO')).toBe(true);
  });

  it('listarCategorias filtra por tipo egreso cuando se especifica', async () => {
    (db as any).__reset();
    (db as any).__queueSelect([makeCategoria({ id: 1, tipo: 'EGRESO', negocioId: null })]);
    (db as any).__queueSelect([makeCategoria({ id: 2, tipo: 'EGRESO', negocioId: 1 })]);

    const result = await service.listarCategorias(1, 'egreso');
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.tipo === 'EGRESO')).toBe(true);
  });

  it('listarCategorias retorna array vacío si no hay categorías', async () => {
    (db as any).__reset();
    (db as any).__queueSelect([]);
    (db as any).__queueSelect([]);
    const result = await service.listarCategorias(1);
    expect(result).toEqual([]);
  });

  it('crearCategoria crea categoría específica para rol Admin', async () => {
    (db as any).__reset();
    (db as any).__queueSelect([]);
    (db as any).__queueInsertReturning([makeCategoria({ id: 10, nombre: 'Test', tipo: 'INGRESO', negocioId: 1 })]);

    const created = await service.crearCategoria(1, 'Admin', { nombre: '  Test  ', tipo: 'ingreso' });
    expect(created.id).toBe(10);
    expect(created.negocioId).toBe(1);

    const lastInsert = (db as any).__getLastInsertValues();
    expect(lastInsert).toMatchObject({ nombre: 'Test', tipo: 'INGRESO', negocioId: 1 });
  });

  it('crearCategoria crea categoría global para rol Dueño con esGlobal = true', async () => {
    (db as any).__reset();
    (db as any).__queueSelect([]);
    (db as any).__queueInsertReturning([makeCategoria({ id: 11, nombre: 'Global', tipo: 'EGRESO', negocioId: null })]);

    const created = await service.crearCategoria(1, 'Dueño', { nombre: 'Global', tipo: 'egreso', esGlobal: true });
    expect(created.negocioId).toBeNull();

    const lastInsert = (db as any).__getLastInsertValues();
    expect(lastInsert).toMatchObject({ nombre: 'Global', tipo: 'EGRESO', negocioId: null });
  });

  it('crearCategoria lanza error para rol Externo', async () => {
    (db as any).__reset();
    await expect(service.crearCategoria(1, 'Externo', { nombre: 'Test', tipo: 'ingreso' })).rejects.toThrow('Sin permisos');
  });

  it('crearCategoria lanza error si ya existe categoría con mismo nombre en el negocio', async () => {
    (db as any).__reset();
    (db as any).__queueSelect([{ id: 1 }]);
    await expect(service.crearCategoria(1, 'Admin', { nombre: 'Test', tipo: 'ingreso' })).rejects.toThrow('Ya existe');
  });

  it('crearCategoria lanza error si ya existe categoría global con mismo nombre', async () => {
    (db as any).__reset();
    (db as any).__queueSelect([{ id: 2 }]);
    await expect(service.crearCategoria(1, 'Dueño', { nombre: 'Ventas', tipo: 'ingreso', esGlobal: true })).rejects.toThrow('Ya existe');
  });

  it('actualizarCategoria actualiza nombre de categoría específica del negocio', async () => {
    (db as any).__reset();
    (db as any).__queueSelect([makeCategoria({ id: 5, nombre: 'Anterior', tipo: 'INGRESO', negocioId: 1, activa: true })]);
    (db as any).__queueSelect([]);
    (db as any).__queueUpdateReturning([makeCategoria({ id: 5, nombre: 'Nuevo', tipo: 'INGRESO', negocioId: 1, activa: true })]);

    const updated = await service.actualizarCategoria(5, 1, 'Admin', { nombre: 'Nuevo' });
    expect(updated.nombre).toBe('Nuevo');
    expect((db as any).__getLastUpdateValues()).toMatchObject({ nombre: 'Nuevo' });
  });

  it('actualizarCategoria lanza error para rol Externo', async () => {
    (db as any).__reset();
    await expect(service.actualizarCategoria(1, 1, 'Externo', { nombre: 'X' })).rejects.toThrow('Sin permisos');
  });

  it('actualizarCategoria lanza error si intenta modificar categoría global sin ser Dueño', async () => {
    (db as any).__reset();
    (db as any).__queueSelect([makeCategoria({ id: 6, negocioId: null, activa: true })]);
    await expect(service.actualizarCategoria(6, 1, 'Admin', { nombre: 'X' })).rejects.toThrow('Solo el Dueño');
  });

  it('actualizarCategoria lanza error si la categoría pertenece a otro negocio', async () => {
    (db as any).__reset();
    (db as any).__queueSelect([makeCategoria({ id: 7, negocioId: 2, activa: true })]);
    await expect(service.actualizarCategoria(7, 1, 'Admin', { nombre: 'X' })).rejects.toThrow('Sin acceso');
  });

  it('actualizarCategoria lanza error si la categoría no existe', async () => {
    (db as any).__reset();
    (db as any).__queueSelect([]);
    await expect(service.actualizarCategoria(123, 1, 'Admin', { nombre: 'X' })).rejects.toThrow('no encontrada');
  });

  it('desactivarCategoria desactiva categoría específica del negocio', async () => {
    (db as any).__reset();
    (db as any).__queueSelect([makeCategoria({ id: 8, negocioId: 1, activa: true })]);
    (db as any).__queueUpdateReturning([makeCategoria({ id: 8, negocioId: 1, activa: false })]);

    const updated = await service.desactivarCategoria(8, 1, 'Admin');
    expect(updated.activa).toBe(false);
    expect((db as any).__getLastUpdateValues()).toMatchObject({ activa: false });
  });

  it('desactivarCategoria lanza error si la categoría ya está desactivada', async () => {
    (db as any).__reset();
    (db as any).__queueSelect([makeCategoria({ id: 9, negocioId: 1, activa: false })]);
    await expect(service.desactivarCategoria(9, 1, 'Admin')).rejects.toThrow('ya está desactivada');
  });

  it('desactivarCategoria lanza error para rol Externo', async () => {
    (db as any).__reset();
    await expect(service.desactivarCategoria(1, 1, 'Externo')).rejects.toThrow('Sin permisos');
  });

  it('obtenerCategoriaPorId retorna categoría global accesible desde cualquier negocio', async () => {
    (db as any).__reset();
    (db as any).__queueSelect([makeCategoria({ id: 12, negocioId: null, activa: true })]);
    const result = await service.obtenerCategoriaPorId(12, 99);
    expect(result.id).toBe(12);
    expect(result.negocioId).toBeNull();
  });

  it('obtenerCategoriaPorId retorna categoría específica del negocio correcto', async () => {
    (db as any).__reset();
    (db as any).__queueSelect([makeCategoria({ id: 13, negocioId: 1, activa: true })]);
    const result = await service.obtenerCategoriaPorId(13, 1);
    expect(result.id).toBe(13);
    expect(result.negocioId).toBe(1);
  });

  it('obtenerCategoriaPorId lanza error si la categoría no existe o no es accesible', async () => {
    (db as any).__reset();
    (db as any).__queueSelect([]);
    await expect(service.obtenerCategoriaPorId(999, 1)).rejects.toThrow('no encontrada');
  });
});

