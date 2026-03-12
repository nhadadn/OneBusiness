import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/auth.service', () => {
  return {
    login: vi.fn(),
    refreshAccessToken: vi.fn(),
  };
});

import { login, refreshAccessToken } from '@/services/auth.service';
import { POST as loginPost } from '@/app/api/auth/login/route';
import { POST as refreshPost } from '@/app/api/auth/refresh/route';
import { POST as logoutPost } from '@/app/api/auth/logout/route';
import { generateAccessToken } from '@/lib/jwt';

describe('Auth API integration (handlers)', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = '01234567890123456789012345678901';
    vi.resetAllMocks();
  });

  it('POST /api/auth/login retorna 200 con tokens para credenciales válidas', async () => {
    vi.mocked(login).mockResolvedValue({
      success: true,
      accessToken: 'access.token',
      refreshToken: 'refresh.token',
      user: { id: 1, nombre: 'Juan', email: 'dueno@onebusiness.test', rol: 'Dueño', negocios: [1] },
    } as any);

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'dueno@onebusiness.test', password: 'test123456' }),
    });

    const response = await loginPost(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.accessToken).toBe('access.token');
    expect(data.refreshToken).toBe('refresh.token');
    expect(data.user.email).toBe('dueno@onebusiness.test');
  });

  it('POST /api/auth/login retorna 401 si credenciales inválidas', async () => {
    vi.mocked(login).mockResolvedValue({ success: false, error: 'Credenciales inválidas' } as any);

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'dueno@onebusiness.test', password: 'wrongpw' }),
    });

    const response = await loginPost(request);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('Credenciales inválidas');
  });

  it('POST /api/auth/login retorna 400 para payload inválido', async () => {
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'invalid-email', password: '123456' }),
    });

    const response = await loginPost(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  it('POST /api/auth/login retorna 500 si el servicio lanza error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(login).mockRejectedValue(new Error('boom'));

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'dueno@onebusiness.test', password: 'test123456' }),
    });

    const response = await loginPost(request);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  it('POST /api/auth/refresh retorna 200 con access token para refresh válido', async () => {
    vi.mocked(refreshAccessToken).mockResolvedValue({ success: true, accessToken: 'new.access' } as any);

    const request = new Request('http://localhost/api/auth/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'valid.refresh' }),
    });

    const response = await refreshPost(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.accessToken).toBe('new.access');
  });

  it('POST /api/auth/refresh retorna 401 para refresh inválido', async () => {
    vi.mocked(refreshAccessToken).mockResolvedValue({ success: false, error: 'Refresh token inválido' } as any);

    const request = new Request('http://localhost/api/auth/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'bad' }),
    });

    const response = await refreshPost(request);
    expect(response.status).toBe(401);
  });

  it('POST /api/auth/refresh retorna 500 si el servicio lanza error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(refreshAccessToken).mockRejectedValue(new Error('boom'));

    const request = new Request('http://localhost/api/auth/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'valid.refresh' }),
    });

    const response = await refreshPost(request);
    expect(response.status).toBe(500);
  });

  it('POST /api/auth/logout retorna 401 si falta token', async () => {
    const request = new Request('http://localhost/api/auth/logout', { method: 'POST' });
    const response = await logoutPost(request);
    expect(response.status).toBe(401);
  });

  it('POST /api/auth/logout retorna 401 si Authorization no es Bearer', async () => {
    const request = new Request('http://localhost/api/auth/logout', {
      method: 'POST',
      headers: { authorization: 'Basic abc' },
    });
    const response = await logoutPost(request);
    expect(response.status).toBe(401);
  });

  it('POST /api/auth/logout retorna 401 si token inválido', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const request = new Request('http://localhost/api/auth/logout', {
      method: 'POST',
      headers: { authorization: 'Bearer invalid' },
    });
    const response = await logoutPost(request);
    expect(response.status).toBe(401);
  });

  it('POST /api/auth/logout retorna 200 si token válido', async () => {
    const token = await generateAccessToken({
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/auth/logout', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await logoutPost(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});

