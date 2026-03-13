import { describe, expect, it, vi } from 'vitest';

import { roles, usuarioNegocio, usuarios } from '@/lib/drizzle';

vi.mock('@/lib/db', () => {
  const state = {
    usersByEmail: new Map<string, any>(),
    usersById: new Map<number, any>(),
    rolesById: new Map<number, any>(),
    rolesByName: new Map<string, any>(),
    userNegociosByUserId: new Map<number, number[]>(),
  };

  const api = {
    __setUserByEmail(email: string, user: any) {
      state.usersByEmail.set(email, user);
      if (typeof user?.id === 'number') {
        state.usersById.set(user.id, user);
      }
    },
    __setRoleById(id: number, role: any) {
      state.rolesById.set(id, role);
      state.rolesByName.set(role.nombre, role);
    },
    __setUserNegocios(userId: number, negocios: number[]) {
      state.userNegociosByUserId.set(userId, negocios);
    },
    __reset() {
      state.usersByEmail.clear();
      state.usersById.clear();
      state.rolesById.clear();
      state.rolesByName.clear();
      state.userNegociosByUserId.clear();
    },
  };

  const db = {
    select: vi.fn((shape?: any) => {
      return {
        from: (table: any) => {
          if (table === usuarios) {
            return {
              where: () => ({
                limit: async () => {
                  const user =
                    state.usersByEmail.size === 1
                      ? state.usersByEmail.values().next().value
                      : state.usersById.size === 1
                        ? state.usersById.values().next().value
                        : undefined;
                  return user ? [user] : [];
                },
              }),
            };
          }

          if (table === roles) {
            return {
              where: () => ({
                limit: async () => {
                  const role = state.rolesById.size === 1 ? state.rolesById.values().next().value : undefined;
                  return role ? [role] : [];
                },
              }),
            };
          }

          if (table === usuarioNegocio) {
            return {
              where: async () => {
                const negocios =
                  state.userNegociosByUserId.size === 1
                    ? state.userNegociosByUserId.values().next().value
                    : [];
                return (negocios ?? []).map((negocioId) => ({ negocioId }));
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
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => undefined),
      })),
    })),
  };

  return { db, __mockDb: api };
});

vi.mock('@/lib/jwt', () => {
  return {
    generateAccessToken: vi.fn(async () => 'access.token'),
    generateRefreshToken: vi.fn(async () => 'refresh.token'),
    verifyRefreshToken: vi.fn(async (token: string) => {
      if (token === 'valid.refresh') return { userId: 1 };
      return null;
    }),
  };
});

import * as dbModule from '@/lib/db';
import { comparePassword, hashPassword, login, refreshAccessToken } from '@/services/auth.service';

const __mockDb = (dbModule as any).__mockDb;

describe('Auth service', () => {
  it('hashPassword y comparePassword funcionan', async () => {
    const hash = await hashPassword('test123456');
    expect(hash).toBeTruthy();
    expect(await comparePassword('test123456', hash)).toBe(true);
    expect(await comparePassword('wrong', hash)).toBe(false);
  }, 15000);

  it('login retorna error si usuario no existe', async () => {
    __mockDb.__reset();
    const result = await login('missing@test.com', 'test123456');
    expect(result.success).toBe(false);
  });

  it('login retorna error si password es inválido', async () => {
    __mockDb.__reset();
    const passwordHash = await hashPassword('correct123');
    __mockDb.__setRoleById(1, { id: 1, nombre: 'Admin' });
    __mockDb.__setUserByEmail('a@b.com', {
      id: 1,
      email: 'a@b.com',
      passwordHash,
      rolId: 1,
      activo: true,
      nombreCompleto: 'User A',
    });

    const result = await login('a@b.com', 'wrong');
    expect(result.success).toBe(false);
  });

  it('login retorna error si usuario está inactivo', async () => {
    __mockDb.__reset();
    const passwordHash = await hashPassword('test123456');
    __mockDb.__setRoleById(1, { id: 1, nombre: 'Admin' });
    __mockDb.__setUserByEmail('inactive@b.com', {
      id: 10,
      email: 'inactive@b.com',
      passwordHash,
      rolId: 1,
      activo: false,
      nombreCompleto: 'Inactive',
    });

    const result = await login('inactive@b.com', 'test123456');
    expect(result.success).toBe(false);
  });

  it('login retorna error si rol no existe', async () => {
    __mockDb.__reset();
    const passwordHash = await hashPassword('test123456');
    __mockDb.__setUserByEmail('norole@b.com', {
      id: 11,
      email: 'norole@b.com',
      passwordHash,
      rolId: 999,
      activo: true,
      nombreCompleto: 'No Role',
    });

    const result = await login('norole@b.com', 'test123456');
    expect(result.success).toBe(false);
  });

  it('login retorna tokens para credenciales válidas', async () => {
    __mockDb.__reset();
    const passwordHash = await hashPassword('test123456');
    __mockDb.__setRoleById(2, { id: 2, nombre: 'Dueño' });
    __mockDb.__setUserByEmail('dueno@onebusiness.test', {
      id: 1,
      email: 'dueno@onebusiness.test',
      passwordHash,
      rolId: 2,
      activo: true,
      nombreCompleto: 'Juan Dueño',
    });
    __mockDb.__setUserNegocios(1, [1, 2, 3]);

    const result = await login('dueno@onebusiness.test', 'test123456');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.accessToken).toBe('access.token');
      expect(result.refreshToken).toBe('refresh.token');
      expect(result.user.email).toBe('dueno@onebusiness.test');
      expect(result.user.negocios).toEqual([1, 2, 3]);
    }
  });

  it('refreshAccessToken retorna error si refresh token inválido', async () => {
    const result = await refreshAccessToken('invalid.refresh');
    expect(result.success).toBe(false);
  });

  it('refreshAccessToken retorna nuevo access token si refresh token válido', async () => {
    __mockDb.__reset();
    __mockDb.__setRoleById(2, { id: 2, nombre: 'Admin' });
    const passwordHash = await hashPassword('test123456');
    __mockDb.__setUserByEmail('u@t.com', {
      id: 1,
      email: 'u@t.com',
      passwordHash,
      rolId: 2,
      activo: true,
      nombreCompleto: 'User U',
    });
    __mockDb.__setUserNegocios(1, [1]);

    const result = await refreshAccessToken('valid.refresh');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.accessToken).toBe('access.token');
    }
  });

  it('refreshAccessToken retorna error si usuario no existe', async () => {
    __mockDb.__reset();
    const result = await refreshAccessToken('valid.refresh');
    expect(result.success).toBe(false);
  });

  it('refreshAccessToken retorna error si usuario está inactivo', async () => {
    __mockDb.__reset();
    __mockDb.__setRoleById(2, { id: 2, nombre: 'Admin' });
    const passwordHash = await hashPassword('test123456');
    __mockDb.__setUserByEmail('inactive2@b.com', {
      id: 1,
      email: 'inactive2@b.com',
      passwordHash,
      rolId: 2,
      activo: false,
      nombreCompleto: 'Inactive 2',
    });

    const result = await refreshAccessToken('valid.refresh');
    expect(result.success).toBe(false);
  });

  it('refreshAccessToken retorna error si rol no existe', async () => {
    __mockDb.__reset();
    const passwordHash = await hashPassword('test123456');
    __mockDb.__setUserByEmail('u@t.com', {
      id: 1,
      email: 'u@t.com',
      passwordHash,
      rolId: 999,
      activo: true,
      nombreCompleto: 'User U',
    });

    const result = await refreshAccessToken('valid.refresh');
    expect(result.success).toBe(false);
  });
});

