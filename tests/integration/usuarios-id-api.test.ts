import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/usuario.service', () => {
  return {
    getUsuarioById: vi.fn(),
    updateUsuario: vi.fn(),
    deleteUsuario: vi.fn(),
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

import { deleteUsuario, getUsuarioById, updateUsuario } from '@/services/usuario.service';
import { generateAccessToken } from '@/lib/jwt';
import { DELETE as usuarioDelete, GET as usuarioGet, PUT as usuarioPut } from '@/app/api/usuarios/[id]/route';

describe('Usuarios /api/usuarios/[id] integration (handlers)', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = '01234567890123456789012345678901';
    vi.resetAllMocks();
  });

  it('GET retorna 400 si id inválido', async () => {
    const token = await generateAccessToken({
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/usuarios/abc?negocioId=1', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await usuarioGet(request, { params: { id: 'abc' } });
    expect(response.status).toBe(400);
  });

  it('GET retorna 404 si usuario no existe', async () => {
    vi.mocked(getUsuarioById).mockResolvedValue(null);

    const token = await generateAccessToken({
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/usuarios/999?negocioId=1', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await usuarioGet(request, { params: { id: '999' } });
    expect(response.status).toBe(404);
  });

  it('GET bloquea acceso si usuario no pertenece al negocio (rol no Dueño)', async () => {
    vi.mocked(getUsuarioById).mockResolvedValue({
      id: 10,
      nombreCompleto: 'Usuario X',
      email: 'x@onebusiness.test',
      activo: true,
      rolId: 2,
      rol: 'Admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      negocios: [2],
    });

    const token = await generateAccessToken({
      userId: 2,
      email: 'socio@onebusiness.test',
      rol: 'Socio',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/usuarios/10?negocioId=1', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await usuarioGet(request, { params: { id: '10' } });
    expect(response.status).toBe(403);
  });

  it('PUT bloquea Externo (403)', async () => {
    const token = await generateAccessToken({
      userId: 4,
      email: 'externo@onebusiness.test',
      rol: 'Externo',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/usuarios/10?negocioId=1', {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ nombreCompleto: 'Nuevo' }),
    });

    const response = await usuarioPut(request, { params: { id: '10' } });
    expect(response.status).toBe(403);
  });

  it('PUT retorna 200 si Admin actualiza usuario en su negocio', async () => {
    vi.mocked(getUsuarioById).mockResolvedValue({
      id: 10,
      nombreCompleto: 'Usuario X',
      email: 'x@onebusiness.test',
      activo: true,
      rolId: 2,
      rol: 'Admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      negocios: [1],
    });

    vi.mocked(updateUsuario).mockResolvedValue({
      id: 10,
      nombreCompleto: 'Usuario Actualizado',
      email: 'x@onebusiness.test',
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

    const request = new Request('http://localhost/api/usuarios/10?negocioId=1', {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ nombreCompleto: 'Usuario Actualizado' }),
    });

    const response = await usuarioPut(request, { params: { id: '10' } });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it('DELETE bloquea Socio (403)', async () => {
    const token = await generateAccessToken({
      userId: 2,
      email: 'socio@onebusiness.test',
      rol: 'Socio',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/usuarios/10?negocioId=1', {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await usuarioDelete(request, { params: { id: '10' } });
    expect(response.status).toBe(403);
  });

  it('DELETE retorna 200 si Dueño desactiva usuario', async () => {
    vi.mocked(getUsuarioById).mockResolvedValue({
      id: 10,
      nombreCompleto: 'Usuario X',
      email: 'x@onebusiness.test',
      activo: true,
      rolId: 2,
      rol: 'Admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      negocios: [1],
    });

    vi.mocked(deleteUsuario).mockResolvedValue({ success: true });

    const token = await generateAccessToken({
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/usuarios/10?negocioId=1', {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await usuarioDelete(request, { params: { id: '10' } });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});
