import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => {
  return {
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ tokenVersion: 0 }],
          }),
        }),
      }),
    },
  };
});

vi.mock('@/services/negocio.service', () => {
  return {
    getNegocios: vi.fn(),
  };
});

import { generateAccessToken } from '@/lib/jwt';
import { getNegocios } from '@/services/negocio.service';
import { GET as negociosGet } from '@/app/api/negocios/route';

describe('Negocios /api/negocios integration (handlers)', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = '01234567890123456789012345678901';
    vi.resetAllMocks();
  });

  it('GET retorna 400 si falta negocioId para rol no Dueño', async () => {
    const token = await generateAccessToken({
      userId: 4,
      email: 'externo@onebusiness.test',
      rol: 'Externo',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/negocios', { headers: { authorization: `Bearer ${token}` } });
    const response = await negociosGet(request);
    expect(response.status).toBe(400);
    expect(vi.mocked(getNegocios)).not.toHaveBeenCalled();
  });

  it('GET retorna 403 si negocioId no está en accesibles', async () => {
    const token = await generateAccessToken({
      userId: 4,
      email: 'externo@onebusiness.test',
      rol: 'Externo',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/negocios?negocioId=2', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await negociosGet(request);
    expect(response.status).toBe(403);
    expect(vi.mocked(getNegocios)).not.toHaveBeenCalled();
  });

  it('GET retorna 200 y llama service con negocioId del tenant (Externo)', async () => {
    vi.mocked(getNegocios).mockResolvedValue([
      { id: 1, nombre: 'Negocio 1', rubro: null, modeloIngreso: null, tieneSocios: false, activo: true },
    ]);

    const token = await generateAccessToken({
      userId: 4,
      email: 'externo@onebusiness.test',
      rol: 'Externo',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/negocios?negocioId=1', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await negociosGet(request);
    expect(response.status).toBe(200);
    expect(vi.mocked(getNegocios)).toHaveBeenCalledWith({ negocioId: 1 }, { rol: 'Externo', negocios: [1] });
  });

  it('GET retorna 200 y llama service sin negocioId (Dueño)', async () => {
    vi.mocked(getNegocios).mockResolvedValue([
      { id: 1, nombre: 'Negocio 1', rubro: null, modeloIngreso: null, tieneSocios: false, activo: true },
      { id: 2, nombre: 'Negocio 2', rubro: null, modeloIngreso: null, tieneSocios: true, activo: true },
    ]);

    const token = await generateAccessToken({
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1, 2],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/negocios', { headers: { authorization: `Bearer ${token}` } });
    const response = await negociosGet(request);
    expect(response.status).toBe(200);
    expect(vi.mocked(getNegocios)).toHaveBeenCalledWith({ negocioId: undefined }, { rol: 'Dueño', negocios: [1, 2] });
  });
});

