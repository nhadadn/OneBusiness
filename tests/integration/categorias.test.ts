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

const serviceMocks = vi.hoisted(() => ({
  listarCategorias: vi.fn(),
  crearCategoria: vi.fn(),
  actualizarCategoria: vi.fn(),
  desactivarCategoria: vi.fn(),
  obtenerCategoriaPorId: vi.fn(),
}));

vi.mock('@/services/categoria.service', () => {
  return {
    CategoriaService: vi.fn().mockImplementation(() => serviceMocks),
  };
});

import { generateAccessToken } from '@/lib/jwt';
import { GET as categoriasGet, POST as categoriasPost } from '@/app/api/categorias/route';
import { DELETE as categoriaDelete, GET as categoriaGet, PUT as categoriaPut } from '@/app/api/categorias/[id]/route';

describe('Categorías /api/categorias integration (handlers)', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = '01234567890123456789012345678901';
    vi.resetAllMocks();
  });

  it('GET retorna 401 sin token', async () => {
    const request = new Request('http://localhost/api/categorias?negocioId=1');
    const response = await categoriasGet(request);
    expect(response.status).toBe(401);
  });

  it('GET retorna 200 con lista de categorías para rol Admin', async () => {
    serviceMocks.listarCategorias.mockResolvedValue([{ id: 1 }]);
    const token = await generateAccessToken({
      userId: 3,
      email: 'admin@onebusiness.test',
      rol: 'Admin',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/categorias?negocioId=1', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await categoriasGet(request);
    expect(response.status).toBe(200);
    expect(serviceMocks.listarCategorias).toHaveBeenCalledWith(1, undefined);
  });

  it('GET retorna 200 con filtro tipo=ingreso', async () => {
    serviceMocks.listarCategorias.mockResolvedValue([{ id: 1, tipo: 'INGRESO' }]);
    const token = await generateAccessToken({
      userId: 3,
      email: 'admin@onebusiness.test',
      rol: 'Admin',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/categorias?negocioId=1&tipo=ingreso', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await categoriasGet(request);
    expect(response.status).toBe(200);
    expect(serviceMocks.listarCategorias).toHaveBeenCalledWith(1, 'ingreso');
  });

  it('POST retorna 403 para rol Externo', async () => {
    const token = await generateAccessToken({
      userId: 4,
      email: 'externo@onebusiness.test',
      rol: 'Externo',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/categorias?negocioId=1', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ nombre: 'Test Cat', tipo: 'ingreso' }),
    });

    const response = await categoriasPost(request);
    expect(response.status).toBe(403);
    expect(serviceMocks.crearCategoria).not.toHaveBeenCalled();
  });

  it('POST crea categoría con rol Admin y retorna 201', async () => {
    serviceMocks.crearCategoria.mockResolvedValue({ id: 10, nombre: 'Test Cat' });

    const token = await generateAccessToken({
      userId: 3,
      email: 'admin@onebusiness.test',
      rol: 'Admin',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/categorias?negocioId=1', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ nombre: 'Test Cat', tipo: 'ingreso' }),
    });

    const response = await categoriasPost(request);
    expect(response.status).toBe(201);
    expect(serviceMocks.crearCategoria).toHaveBeenCalledWith(1, 'Admin', { nombre: 'Test Cat', tipo: 'ingreso', esGlobal: false });
  });

  it('POST retorna 409 si el nombre ya existe en el negocio', async () => {
    serviceMocks.crearCategoria.mockRejectedValue(new Error('Ya existe una categoría con ese nombre'));

    const token = await generateAccessToken({
      userId: 3,
      email: 'admin@onebusiness.test',
      rol: 'Admin',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/categorias?negocioId=1', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ nombre: 'Ventas', tipo: 'ingreso' }),
    });

    const response = await categoriasPost(request);
    expect(response.status).toBe(409);
  });

  it('POST retorna 400 con datos inválidos (nombre vacío)', async () => {
    const token = await generateAccessToken({
      userId: 3,
      email: 'admin@onebusiness.test',
      rol: 'Admin',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/categorias?negocioId=1', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ nombre: '', tipo: 'ingreso' }),
    });

    const response = await categoriasPost(request);
    expect(response.status).toBe(400);
    expect(serviceMocks.crearCategoria).not.toHaveBeenCalled();
  });

  it('GET /api/categorias/[id] retorna 200 con la categoría correcta', async () => {
    serviceMocks.obtenerCategoriaPorId.mockResolvedValue({ id: 55, nombre: 'Test' });
    const token = await generateAccessToken({
      userId: 3,
      email: 'admin@onebusiness.test',
      rol: 'Admin',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/categorias/55?negocioId=1', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await categoriaGet(request, { params: { id: '55' } });
    expect(response.status).toBe(200);
    expect(serviceMocks.obtenerCategoriaPorId).toHaveBeenCalledWith(55, 1);
  });

  it('GET /api/categorias/[id] retorna 404 si no existe', async () => {
    serviceMocks.obtenerCategoriaPorId.mockRejectedValue(new Error('Categoría no encontrada'));
    const token = await generateAccessToken({
      userId: 3,
      email: 'admin@onebusiness.test',
      rol: 'Admin',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/categorias/999?negocioId=1', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await categoriaGet(request, { params: { id: '999' } });
    expect(response.status).toBe(404);
  });

  it('PUT /api/categorias/[id] retorna 403 para rol Externo', async () => {
    const token = await generateAccessToken({
      userId: 4,
      email: 'externo@onebusiness.test',
      rol: 'Externo',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/categorias/1?negocioId=1', {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ nombre: 'Nombre Actualizado' }),
    });

    const response = await categoriaPut(request, { params: { id: '1' } });
    expect(response.status).toBe(403);
    expect(serviceMocks.actualizarCategoria).not.toHaveBeenCalled();
  });

  it('PUT /api/categorias/[id] actualiza nombre con rol Admin y retorna 200', async () => {
    serviceMocks.actualizarCategoria.mockResolvedValue({ id: 1, nombre: 'Nombre Actualizado' });
    const token = await generateAccessToken({
      userId: 3,
      email: 'admin@onebusiness.test',
      rol: 'Admin',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/categorias/1?negocioId=1', {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ nombre: 'Nombre Actualizado' }),
    });

    const response = await categoriaPut(request, { params: { id: '1' } });
    expect(response.status).toBe(200);
    expect(serviceMocks.actualizarCategoria).toHaveBeenCalledWith(1, 1, 'Admin', { nombre: 'Nombre Actualizado' });
  });

  it('DELETE /api/categorias/[id] desactiva categoría con rol Admin y retorna 200', async () => {
    serviceMocks.desactivarCategoria.mockResolvedValue({ id: 1, activa: false });
    const token = await generateAccessToken({
      userId: 3,
      email: 'admin@onebusiness.test',
      rol: 'Admin',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/categorias/1?negocioId=1', {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await categoriaDelete(request, { params: { id: '1' } });
    expect(response.status).toBe(200);
    expect(serviceMocks.desactivarCategoria).toHaveBeenCalledWith(1, 1, 'Admin');
  });
});
