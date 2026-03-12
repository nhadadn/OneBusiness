import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/usuario.service', () => {
  return {
    getUsuarios: vi.fn(),
    createUsuario: vi.fn(),
  };
});

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

import { createUsuario, getUsuarios } from '@/services/usuario.service';
import { generateAccessToken } from '@/lib/jwt';
import { GET as usuariosGet, POST as usuariosPost } from '@/app/api/usuarios/route';

describe('Usuarios API integration (handlers)', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = '01234567890123456789012345678901';
    vi.resetAllMocks();
  });

  it('GET /api/usuarios retorna 400 si falta negocioId para rol no Dueño', async () => {
    const token = await generateAccessToken({
      userId: 2,
      email: 'socio@onebusiness.test',
      rol: 'Socio',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/usuarios', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await usuariosGet(request);
    expect(response.status).toBe(400);
  });

  it('GET /api/usuarios permite Externo con negocioId', async () => {
    vi.mocked(getUsuarios).mockResolvedValue([]);

    const token = await generateAccessToken({
      userId: 4,
      email: 'externo@onebusiness.test',
      rol: 'Externo',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/usuarios?negocioId=1', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await usuariosGet(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it('POST /api/usuarios bloquea Externo (403)', async () => {
    const token = await generateAccessToken({
      userId: 4,
      email: 'externo@onebusiness.test',
      rol: 'Externo',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/usuarios', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-negocio-id': '1' },
      body: JSON.stringify({}),
    });

    const response = await usuariosPost(request);
    expect(response.status).toBe(403);
  });

  it('POST /api/usuarios retorna 400 si payload inválido', async () => {
    const token = await generateAccessToken({
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1, 2],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/usuarios', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'bad', password: '123', rolId: -1, negocios: [] }),
    });

    const response = await usuariosPost(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  it('POST /api/usuarios (Admin) bloquea si intenta asignar negocio no permitido', async () => {
    const token = await generateAccessToken({
      userId: 3,
      email: 'admin@onebusiness.test',
      rol: 'Admin',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/usuarios', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        nombreCompleto: 'Nuevo Usuario',
        email: 'nuevo@onebusiness.test',
        password: '123456',
        rolId: 2,
        negocios: [1, 2],
      }),
    });

    const response = await usuariosPost(request);
    expect(response.status).toBe(403);
  });

  it('POST /api/usuarios retorna 201 si Dueño crea usuario', async () => {
    vi.mocked(createUsuario).mockResolvedValue({
      id: 10,
      nombreCompleto: 'Nuevo Usuario',
      email: 'nuevo@onebusiness.test',
      activo: true,
      rolId: 2,
      rol: 'Admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      negocios: [1],
    });

    const token = await generateAccessToken({
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1, 2],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/usuarios', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        nombreCompleto: 'Nuevo Usuario',
        email: 'nuevo@onebusiness.test',
        password: '123456',
        rolId: 2,
        negocios: [1],
      }),
    });

    const response = await usuariosPost(request);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});
