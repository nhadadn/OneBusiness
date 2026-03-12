import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyJWT, verifyRefreshToken } from '@/lib/jwt';

describe('JWT utilities', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = '01234567890123456789012345678901';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
    vi.restoreAllMocks();
  });

  it('genera access token válido y verificable', async () => {
    const token = await generateAccessToken({
      userId: 1,
      email: 'test@test.com',
      rol: 'Dueño',
      negocios: [1, 2, 3],
      tokenVersion: 0,
    });

    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const payload = await verifyAccessToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe(1);
    expect(payload?.email).toBe('test@test.com');
    expect(payload?.rol).toBe('Dueño');
    expect(payload?.negocios).toEqual([1, 2, 3]);
    expect(payload?.tokenVersion).toBe(0);
  });

  it('verifyJWT delega a access token y retorna payload', async () => {
    const token = await generateAccessToken({
      userId: 2,
      email: 'a@b.com',
      rol: 'Admin',
      negocios: [1],
      tokenVersion: 0,
    });

    const payload = await verifyJWT(token);
    expect(payload?.userId).toBe(2);
    expect(payload?.rol).toBe('Admin');
  });

  it('retorna null para access token inválido', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const payload = await verifyAccessToken('invalid.token.here');
    expect(payload).toBeNull();
    expect(spy).toHaveBeenCalled();
  });

  it('genera refresh token válido y verificable', async () => {
    const token = await generateRefreshToken(123);
    expect(typeof token).toBe('string');

    const payload = await verifyRefreshToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe(123);
  });

  it('retorna null para refresh token inválido', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const payload = await verifyRefreshToken('invalid.token.here');
    expect(payload).toBeNull();
  });

  it('falla si JWT_SECRET no está configurado', async () => {
    delete process.env.JWT_SECRET;
    await expect(
      generateAccessToken({
        userId: 1,
        email: 'test@test.com',
        rol: 'Dueño',
        negocios: [1],
        tokenVersion: 0,
      })
    ).rejects.toThrow();
  });
});

