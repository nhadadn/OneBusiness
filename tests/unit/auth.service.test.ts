import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'crypto';

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
      set: vi.fn((values: any) => ({
        where: vi.fn(async () => {
          if (state.usersById.size === 1) {
            const user = state.usersById.values().next().value;
            if (user) Object.assign(user, values);
          }
          if (state.usersByEmail.size === 1) {
            const user = state.usersByEmail.values().next().value;
            if (user) Object.assign(user, values);
          }
          return undefined;
        }),
      })),
    })),
  };

  return { db, __mockDb: api };
});

vi.mock('@/lib/jwt', () => {
  let refreshCounter = 0;
  return {
    generateAccessToken: vi.fn(async () => 'access.token'),
    generateRefreshToken: vi.fn(async () => `refresh.token.${++refreshCounter}`),
    verifyRefreshToken: vi.fn(async (token: string) => {
      if (token === 'valid.refresh') return { userId: 1 };
      if (token.startsWith('refresh.token.')) return { userId: 1 };
      return null;
    }),
  };
});

import * as dbModule from '@/lib/db';
import { comparePassword, hashPassword, login, logout, refreshAccessToken } from '@/services/auth.service';

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
    const user = {
      id: 1,
      email: 'dueno@onebusiness.test',
      passwordHash,
      rolId: 2,
      activo: true,
      nombreCompleto: 'Juan Dueño',
      refreshTokenHash: null,
      tokenVersion: 0,
    };
    __mockDb.__setUserByEmail('dueno@onebusiness.test', user);
    __mockDb.__setUserNegocios(1, [1, 2, 3]);

    const result = await login('dueno@onebusiness.test', 'test123456');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.accessToken).toBe('access.token');
      expect(result.refreshToken).toMatch(/^refresh\.token\.\d+$/);
      expect(result.user.email).toBe('dueno@onebusiness.test');
      expect(result.user.negocios).toEqual([1, 2, 3]);
      expect(user.refreshTokenHash).toMatch(/^[0-9a-f]{64}$/);
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
      refreshTokenHash: createHash('sha256').update('valid.refresh').digest('hex'),
      tokenVersion: 0,
    });
    __mockDb.__setUserNegocios(1, [1]);

    const result = await refreshAccessToken('valid.refresh');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.accessToken).toBe('access.token');
      expect(result.refreshToken).toMatch(/^refresh\.token\.\d+$/);
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
      refreshTokenHash: createHash('sha256').update('valid.refresh').digest('hex'),
      tokenVersion: 0,
    });

    const result = await refreshAccessToken('valid.refresh');
    expect(result.success).toBe(false);
  });

  describe('Refresh Token Rotation', () => {
    it('login guarda hash del refresh token en BD', async () => {
      __mockDb.__reset();
      const passwordHash = await hashPassword('test123456');
      __mockDb.__setRoleById(2, { id: 2, nombre: 'Dueño' });
      const user = {
        id: 1,
        email: 'dueno@onebusiness.test',
        passwordHash,
        rolId: 2,
        activo: true,
        nombreCompleto: 'Juan Dueño',
        refreshTokenHash: null,
        tokenVersion: 0,
      };
      __mockDb.__setUserByEmail('dueno@onebusiness.test', user);
      __mockDb.__setUserNegocios(1, [1]);

      const result = await login('dueno@onebusiness.test', 'test123456');
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(user.refreshTokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(user.refreshTokenHash).toBe(createHash('sha256').update(result.refreshToken).digest('hex'));
    });

    it('refresh genera nuevo token y actualiza hash en BD', async () => {
      __mockDb.__reset();
      const passwordHash = await hashPassword('test123456');
      __mockDb.__setRoleById(2, { id: 2, nombre: 'Admin' });
      const user = {
        id: 1,
        email: 'u@t.com',
        passwordHash,
        rolId: 2,
        activo: true,
        nombreCompleto: 'User U',
        refreshTokenHash: null,
        tokenVersion: 0,
      };
      __mockDb.__setUserByEmail('u@t.com', user);
      __mockDb.__setUserNegocios(1, [1]);

      const loginResult = await login('u@t.com', 'test123456');
      expect(loginResult.success).toBe(true);
      if (!loginResult.success) return;
      const refreshToken1 = loginResult.refreshToken;
      const hash1 = user.refreshTokenHash;
      expect(hash1).toBe(createHash('sha256').update(refreshToken1).digest('hex'));

      const refreshResult = await refreshAccessToken(refreshToken1);
      expect(refreshResult.success).toBe(true);
      if (!refreshResult.success) return;
      const refreshToken2 = refreshResult.refreshToken;

      const hash2 = user.refreshTokenHash;
      expect(hash2).toBe(createHash('sha256').update(refreshToken2).digest('hex'));
      expect(hash1).not.toBe(hash2);
    });

    it('replay attack: usar refresh token viejo retorna 401', async () => {
      __mockDb.__reset();
      const passwordHash = await hashPassword('test123456');
      __mockDb.__setRoleById(2, { id: 2, nombre: 'Admin' });
      const user = {
        id: 1,
        email: 'u@t.com',
        passwordHash,
        rolId: 2,
        activo: true,
        nombreCompleto: 'User U',
        refreshTokenHash: null,
        tokenVersion: 0,
      };
      __mockDb.__setUserByEmail('u@t.com', user);
      __mockDb.__setUserNegocios(1, [1]);

      const loginResult = await login('u@t.com', 'test123456');
      expect(loginResult.success).toBe(true);
      if (!loginResult.success) return;
      const refreshToken1 = loginResult.refreshToken;

      const refreshResult1 = await refreshAccessToken(refreshToken1);
      expect(refreshResult1.success).toBe(true);
      if (!refreshResult1.success) return;

      const replay = await refreshAccessToken(refreshToken1);
      expect(replay.success).toBe(false);
      expect(user.refreshTokenHash).toBeNull();
    });

    it('logout invalida el refresh token server-side', async () => {
      __mockDb.__reset();
      const passwordHash = await hashPassword('test123456');
      __mockDb.__setRoleById(2, { id: 2, nombre: 'Admin' });
      const user = {
        id: 1,
        email: 'u@t.com',
        passwordHash,
        rolId: 2,
        activo: true,
        nombreCompleto: 'User U',
        refreshTokenHash: null,
        tokenVersion: 0,
      };
      __mockDb.__setUserByEmail('u@t.com', user);
      __mockDb.__setUserNegocios(1, [1]);

      const loginResult = await login('u@t.com', 'test123456');
      expect(loginResult.success).toBe(true);
      if (!loginResult.success) return;

      await logout(1);
      expect(user.refreshTokenHash).toBeNull();

      const refreshResult = await refreshAccessToken(loginResult.refreshToken);
      expect(refreshResult.success).toBe(false);
    });

    it('refresh con token revocado (hash null) retorna 401', async () => {
      __mockDb.__reset();
      __mockDb.__setRoleById(2, { id: 2, nombre: 'Admin' });
      const passwordHash = await hashPassword('test123456');
      const user = {
        id: 1,
        email: 'u@t.com',
        passwordHash,
        rolId: 2,
        activo: true,
        nombreCompleto: 'User U',
        refreshTokenHash: null,
        tokenVersion: 0,
      };
      __mockDb.__setUserByEmail('u@t.com', user);
      __mockDb.__setUserNegocios(1, [1]);

      const loginResult = await login('u@t.com', 'test123456');
      expect(loginResult.success).toBe(true);
      if (!loginResult.success) return;

      user.refreshTokenHash = null;
      const refreshResult = await refreshAccessToken(loginResult.refreshToken);
      expect(refreshResult.success).toBe(false);
    });
  });
});

