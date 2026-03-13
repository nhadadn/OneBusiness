import { beforeEach, describe, expect, it, vi } from 'vitest';

import { negocios } from '@/lib/drizzle';

vi.mock('@/lib/db', () => {
  const state = {
    rowsFrom: [] as any[],
    rowsWhere: [] as any[],
  };

  const calls = {
    fromCalled: 0,
    whereCalled: 0,
  };

  const db = {
    __reset() {
      state.rowsFrom = [];
      state.rowsWhere = [];
      calls.fromCalled = 0;
      calls.whereCalled = 0;
    },
    __setRows(rowsFrom: any[], rowsWhere: any[]) {
      state.rowsFrom = rowsFrom;
      state.rowsWhere = rowsWhere;
    },
    __getCalls() {
      return { ...calls };
    },
    select: vi.fn(() => ({
      from: vi.fn(() => {
        calls.fromCalled += 1;
        return {
          where: vi.fn(async () => {
            calls.whereCalled += 1;
            return state.rowsWhere;
          }),
          then: (resolve: any) => resolve(state.rowsFrom),
        };
      }),
    })),
  };

  return { db };
});

import { db } from '@/lib/db';
import { getNegocios } from '@/services/negocio.service';

describe('negocio.service', () => {
  beforeEach(() => {
    (db as any).__reset();
  });

  it('Dueño sin filtro retorna todos', async () => {
    (db as any).__setRows(
      [{ id: 1, nombre: 'A', rubro: null, modeloIngreso: null, tieneSocios: false, activo: true }],
      []
    );

    const result = await getNegocios({}, { rol: 'Dueño', negocios: [1, 2] });
    expect(result).toHaveLength(1);
    expect((db as any).__getCalls()).toEqual({ fromCalled: 1, whereCalled: 0 });
  });

  it('Dueño con negocioId usa where', async () => {
    (db as any).__setRows(
      [],
      [{ id: 2, nombre: 'B', rubro: null, modeloIngreso: null, tieneSocios: true, activo: true }]
    );

    const result = await getNegocios({ negocioId: 2 }, { rol: 'Dueño', negocios: [1, 2] });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(2);
    expect((db as any).__getCalls()).toEqual({ fromCalled: 1, whereCalled: 1 });
  });

  it('No Dueño sin filtro retorna inArray de asignados', async () => {
    (db as any).__setRows(
      [],
      [
        { id: 1, nombre: 'A', rubro: null, modeloIngreso: null, tieneSocios: false, activo: true },
        { id: 2, nombre: 'B', rubro: null, modeloIngreso: null, tieneSocios: false, activo: true },
      ]
    );

    const result = await getNegocios({}, { rol: 'Admin', negocios: [1, 2] });
    expect(result).toHaveLength(2);
    expect((db as any).__getCalls()).toEqual({ fromCalled: 1, whereCalled: 1 });
  });

  it('No Dueño con negocioId sin acceso lanza error', async () => {
    (db as any).__setRows([], []);
    await expect(getNegocios({ negocioId: 3 }, { rol: 'Admin', negocios: [1, 2] })).rejects.toThrow(
      'Sin acceso a este negocio'
    );
    expect((db as any).__getCalls()).toEqual({ fromCalled: 0, whereCalled: 0 });
  });

  it('No Dueño con negocioId permitido usa where', async () => {
    (db as any).__setRows(
      [],
      [{ id: 1, nombre: 'A', rubro: null, modeloIngreso: null, tieneSocios: false, activo: true }]
    );

    const result = await getNegocios({ negocioId: 1 }, { rol: 'Externo', negocios: [1] });
    expect(result).toHaveLength(1);
    expect((db as any).__getCalls()).toEqual({ fromCalled: 1, whereCalled: 1 });
  });

  it('No Dueño sin asignaciones retorna []', async () => {
    (db as any).__setRows([], []);
    const result = await getNegocios({}, { rol: 'Socio', negocios: [] });
    expect(result).toEqual([]);
    expect((db as any).__getCalls()).toEqual({ fromCalled: 0, whereCalled: 0 });
  });

  it('Compila import de schema negocios', () => {
    expect(negocios).toBeDefined();
  });
});
