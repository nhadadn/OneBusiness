import { describe, expect, it, vi } from 'vitest';

import { roles, usuarioNegocio, usuarios } from '@/lib/drizzle';

vi.mock('@/lib/db', () => {
  const state = {
    tokenVersionByUserId: new Map<number, number>(),
    negociosByUserId: new Map<number, number[]>(),
  };

  const txCalls = {
    deleteCalled: 0,
    insertCalled: 0,
    updateCalled: 0,
  };

  const db = {
    __setUser(userId: number, tokenVersion: number, negocios: number[]) {
      state.tokenVersionByUserId.set(userId, tokenVersion);
      state.negociosByUserId.set(userId, negocios);
    },
    __getTokenVersion(userId: number) {
      return state.tokenVersionByUserId.get(userId);
    },
    __getNegocios(userId: number) {
      return state.negociosByUserId.get(userId) ?? [];
    },
    __getTxCalls() {
      return { ...txCalls };
    },
    select: vi.fn((shape?: any) => {
      return {
        from: (table: any) => {
          if (table === usuarios) {
            return {
              where: () => ({
                limit: async () => {
                  return [{ id: 10 }];
                },
              }),
              innerJoin: () => ({
                where: () => ({
                  limit: async () => {
                    return [
                      {
                        id: 10,
                        nombreCompleto: 'Usuario',
                        email: 'u@t.com',
                        activo: true,
                        rolId: 2,
                        rol: 'Admin',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      },
                    ];
                  },
                }),
              }),
            };
          }

          if (table === roles) {
            return {
              where: () => ({
                limit: async () => [{ nombre: 'Admin' }],
              }),
            };
          }

          if (table === usuarioNegocio) {
            return {
              where: async () => {
                return (state.negociosByUserId.get(10) ?? []).map((negocioId) => ({ negocioId }));
              },
            };
          }

          return {
            where: () => ({
              limit: async () => [],
            }),
          };
        },
      };
    }),
    transaction: vi.fn(async (fn: any) => {
      const tx = {
        delete: (table: any) => {
          txCalls.deleteCalled += 1;
          return {
            where: async () => {
              if (table === usuarioNegocio) {
                state.negociosByUserId.set(10, []);
              }
            },
          };
        },
        insert: (table: any) => {
          txCalls.insertCalled += 1;
          return {
            values: async (rows: Array<{ usuarioId: number; negocioId: number }>) => {
              if (table === usuarioNegocio) {
                const userId = rows[0]?.usuarioId;
                if (typeof userId === 'number') {
                  state.negociosByUserId.set(
                    userId,
                    rows.map((r) => r.negocioId)
                  );
                }
              }
            },
          };
        },
        update: (table: any) => {
          txCalls.updateCalled += 1;
          return {
            set: () => ({
              where: async () => {
                if (table === usuarios) {
                  state.tokenVersionByUserId.set(10, (state.tokenVersionByUserId.get(10) ?? 0) + 1);
                }
              },
            }),
          };
        },
      };

      await fn({
        ...tx,
      });
    }),
  };

  return { db };
});

import { db } from '@/lib/db';
import { assignNegociosToUsuario } from '@/services/usuario.service';

describe('usuario.service', () => {
  it('assignNegociosToUsuario reemplaza asignaciones e incrementa tokenVersion', async () => {
    (db as any).__setUser(10, 0, [1]);

    const result = await assignNegociosToUsuario(10, [2, 3]);
    expect(result.negocios).toEqual([2, 3]);

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect((db as any).__getTokenVersion(10)).toBe(1);
    expect((db as any).__getNegocios(10)).toEqual([2, 3]);
    expect((db as any).__getTxCalls()).toEqual({ deleteCalled: 1, insertCalled: 1, updateCalled: 1 });
  });
});
