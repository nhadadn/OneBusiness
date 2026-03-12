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

vi.mock('@/services/usuario.service', () => {
  return {
    getUsuarioById: vi.fn(),
    assignNegociosToUsuario: vi.fn(),
  };
});

import { generateAccessToken } from '@/lib/jwt';
import { assignNegociosToUsuario, getUsuarioById } from '@/services/usuario.service';
import { PUT as assignNegociosPut } from '@/app/api/usuarios/[id]/negocios/route';

describe('Usuarios /api/usuarios/[id]/negocios integration (handlers)', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = '01234567890123456789012345678901';
    vi.resetAllMocks();
  });

  it('PUT retorna 400 si id inválido', async () => {
    const token = await generateAccessToken({
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1, 2],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/usuarios/abc/negocios', {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ negocios: [1] }),
    });

    const response = await assignNegociosPut(request, { params: { id: 'abc' } });
    expect(response.status).toBe(400);
  });

  it('PUT retorna 404 si usuario no existe', async () => {
    vi.mocked(getUsuarioById).mockResolvedValue(null);

    const token = await generateAccessToken({
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1, 2],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/usuarios/10/negocios', {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ negocios: [1] }),
    });

    const response = await assignNegociosPut(request, { params: { id: '10' } });
    expect(response.status).toBe(404);
  });

  it('PUT bloquea Socio por permisos (403)', async () => {
    const token = await generateAccessToken({
      userId: 2,
      email: 'socio@onebusiness.test',
      rol: 'Socio',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/usuarios/10/negocios?negocioId=1', {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ negocios: [1] }),
    });

    const response = await assignNegociosPut(request, { params: { id: '10' } });
    expect(response.status).toBe(403);
  });

  it('PUT bloquea Admin si intenta asignar negocio no permitido (403)', async () => {
    vi.mocked(getUsuarioById).mockResolvedValue({
      id: 10,
      nombreCompleto: 'Usuario',
      email: 'u@t.com',
      activo: true,
      rolId: 2,
      rol: 'Admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      negocios: [1],
    });

    const token = await generateAccessToken({
      userId: 3,
      email: 'admin@onebusiness.test',
      rol: 'Admin',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/usuarios/10/negocios', {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'x-negocio-id': '1',
      },
      body: JSON.stringify({ negocios: [2] }),
    });

    const response = await assignNegociosPut(request, { params: { id: '10' } });
    expect(response.status).toBe(403);
  });

  it('PUT retorna 200 si Dueño asigna negocios', async () => {
    vi.mocked(getUsuarioById).mockResolvedValue({
      id: 10,
      nombreCompleto: 'Usuario',
      email: 'u@t.com',
      activo: true,
      rolId: 2,
      rol: 'Admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      negocios: [1],
    });

    vi.mocked(assignNegociosToUsuario).mockResolvedValue({
      id: 10,
      nombreCompleto: 'Usuario',
      email: 'u@t.com',
      activo: true,
      rolId: 2,
      rol: 'Admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      negocios: [1, 2],
    });

    const token = await generateAccessToken({
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1, 2],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/usuarios/10/negocios', {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ negocios: [1, 2] }),
    });

    const response = await assignNegociosPut(request, { params: { id: '10' } });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(vi.mocked(assignNegociosToUsuario)).toHaveBeenCalledWith(10, [1, 2]);
  });
});

