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
  crear: vi.fn(),
  listar: vi.fn(),
  asignarNegocio: vi.fn(),
  removerNegocio: vi.fn(),
}));

vi.mock('@/services/cuenta_banco.service', () => {
  return {
    CuentaBancoService: vi.fn().mockImplementation(() => serviceMocks),
  };
});

import { generateAccessToken } from '@/lib/jwt';
import { DELETE as asignarDelete, POST as asignarPost } from '@/app/api/cuentas-banco/[id]/asignar/route';
import { GET as cuentasGet, POST as cuentasPost } from '@/app/api/cuentas-banco/route';

describe('Cuentas compartidas', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = '01234567890123456789012345678901';
    vi.resetAllMocks();
  });

  describe('POST /api/cuentas-banco', () => {
    it('crea cuenta global con esGlobal=true', async () => {
      serviceMocks.crear.mockResolvedValue({ id: 1, esGlobal: true });
      const token = await generateAccessToken({
        userId: 1,
        email: 'owner@onebusiness.test',
        rol: 'Dueño',
        negocios: [],
        tokenVersion: 0,
      });

      const request = new Request('http://localhost/api/cuentas-banco?negocioId=1', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ nombre: 'Global', tipo: 'BANCARIA', esGlobal: true }),
      });

      const response = await cuentasPost(request);
      const body = await response.json();
      expect(body.data.esGlobal).toBe(true);
    });

    it('crea cuenta compartida con negociosCompartidos', async () => {
      serviceMocks.crear.mockResolvedValue({ id: 2, esGlobal: false, negociosCompartidos: [{ negocioId: 1 }, { negocioId: 2 }] });
      const token = await generateAccessToken({
        userId: 1,
        email: 'owner@onebusiness.test',
        rol: 'Dueño',
        negocios: [],
        tokenVersion: 0,
      });

      const request = new Request('http://localhost/api/cuentas-banco?negocioId=1', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ nombre: 'Compartida', tipo: 'BANCARIA', esGlobal: false, negociosCompartidos: [1, 2] }),
      });

      const response = await cuentasPost(request);
      expect(response.status).toBe(201);
    });

    it('retorna 400 si esGlobal=false y no hay negocioId ni negociosCompartidos', async () => {
      const token = await generateAccessToken({
        userId: 1,
        email: 'owner@onebusiness.test',
        rol: 'Dueño',
        negocios: [],
        tokenVersion: 0,
      });

      const request = new Request('http://localhost/api/cuentas-banco?negocioId=1', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ nombre: 'Invalida', tipo: 'BANCARIA', esGlobal: false }),
      });

      const response = await cuentasPost(request);
      expect(response.status).toBe(400);
    });

    it('retorna 403 si rol Admin intenta crear cuenta global', async () => {
      const token = await generateAccessToken({
        userId: 3,
        email: 'admin@onebusiness.test',
        rol: 'Admin',
        negocios: [1],
        tokenVersion: 0,
      });

      const request = new Request('http://localhost/api/cuentas-banco?negocioId=1', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ nombre: 'Global', tipo: 'BANCARIA', esGlobal: true }),
      });

      const response = await cuentasPost(request);
      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/cuentas-banco/:id/asignar', () => {
    it('asigna cuenta a un negocio adicional (solo Dueño)', async () => {
      serviceMocks.asignarNegocio.mockResolvedValue({ id: 1 });
      const token = await generateAccessToken({
        userId: 1,
        email: 'owner@onebusiness.test',
        rol: 'Dueño',
        negocios: [],
        tokenVersion: 0,
      });
      const request = new Request('http://localhost/api/cuentas-banco/1/asignar', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ negocioId: 2 }),
      });
      const response = await asignarPost(request, { params: { id: '1' } });
      expect(response.status).toBe(200);
    });

    it('retorna 403 si el rol no es Dueño', async () => {
      const token = await generateAccessToken({
        userId: 3,
        email: 'admin@onebusiness.test',
        rol: 'Admin',
        negocios: [1],
        tokenVersion: 0,
      });
      const request = new Request('http://localhost/api/cuentas-banco/1/asignar', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ negocioId: 2 }),
      });
      const response = await asignarPost(request, { params: { id: '1' } });
      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/cuentas-banco/:id/asignar', () => {
    it('remueve cuenta de un negocio (solo Dueño)', async () => {
      serviceMocks.removerNegocio.mockResolvedValue({ id: 1 });
      const token = await generateAccessToken({
        userId: 1,
        email: 'owner@onebusiness.test',
        rol: 'Dueño',
        negocios: [],
        tokenVersion: 0,
      });
      const request = new Request('http://localhost/api/cuentas-banco/1/asignar', {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ negocioId: 2 }),
      });
      const response = await asignarDelete(request, { params: { id: '1' } });
      expect(response.status).toBe(200);
    });

    it('retorna 403 si el rol no es Dueño', async () => {
      const token = await generateAccessToken({
        userId: 3,
        email: 'admin@onebusiness.test',
        rol: 'Admin',
        negocios: [1],
        tokenVersion: 0,
      });
      const request = new Request('http://localhost/api/cuentas-banco/1/asignar', {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ negocioId: 2 }),
      });
      const response = await asignarDelete(request, { params: { id: '1' } });
      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/cuentas-banco con negocioId', () => {
    it('retorna cuentas directas, globales y compartidas del negocio', async () => {
      serviceMocks.listar.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
      const token = await generateAccessToken({
        userId: 3,
        email: 'admin@onebusiness.test',
        rol: 'Admin',
        negocios: [1],
        tokenVersion: 0,
      });
      const request = new Request('http://localhost/api/cuentas-banco', {
        headers: { authorization: `Bearer ${token}`, 'x-negocio-id': '1' },
      });
      const response = await cuentasGet(request);
      const body = await response.json();
      expect(body.data.length).toBe(3);
    });

    it('no retorna cuentas de otros negocios no compartidas', async () => {
      serviceMocks.listar.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const token = await generateAccessToken({
        userId: 3,
        email: 'admin@onebusiness.test',
        rol: 'Admin',
        negocios: [1],
        tokenVersion: 0,
      });
      const request = new Request('http://localhost/api/cuentas-banco', {
        headers: { authorization: `Bearer ${token}`, 'x-negocio-id': '1' },
      });
      const response = await cuentasGet(request);
      const body = await response.json();
      expect(body.data.length).toBe(2);
    });
  });
});

