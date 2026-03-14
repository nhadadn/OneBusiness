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

vi.mock('@/services/movimiento.service', () => {
  class MovimientoService {
    async listar() {
      return { items: [], total: 0, page: 1, limit: 50 };
    }
    async crear() {
      return { id: 1 };
    }
    async obtener(id: number) {
      return {
        id,
        negocioId: 1,
        centroCostoId: null,
        tipo: 'INGRESO',
        fecha: '2026-01-01',
        concepto: 'Test',
        tercero: null,
        monto: '100',
        cuentaBancoId: 1,
        traspasoRefId: null,
        estado: 'PENDIENTE',
        creadoPor: 4,
        aprobadoPor: null,
        fechaAprobacion: null,
        motivoRechazo: null,
        version: 1,
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    async obtenerDetalle(id: number) {
      return {
        id,
        negocioId: 1,
        fecha: '2026-01-01',
        concepto: 'Test',
        tercero: null,
        tipo: 'INGRESO',
        monto: '100',
        estado: 'PENDIENTE',
        version: 1,
        activo: true,
        createdAt: new Date().toISOString(),
        centroCostoId: null,
        traspasoRefId: null,
        cuentaBanco: { id: 1, nombre: 'Cuenta' },
        creadoPor: { id: 4, nombre: 'Externo', email: 'externo@onebusiness.test' },
        aprobadoPor: null,
        fechaAprobacion: null,
        motivoRechazo: null,
      };
    }
    async actualizar() {
      return { id: 1 };
    }
    async eliminar() {
      return { id: 1 };
    }
  }
  return { MovimientoService };
});

vi.mock('@/services/cuenta_banco.service', () => {
  class CuentaBancoService {
    async listar() {
      return [];
    }
    async obtener() {
      return {
        id: 1,
        nombre: 'Cuenta',
        tipo: 'BANCARIA',
        bancoInstitucion: null,
        titular: null,
        negocioId: 1,
        saldoInicial: '0',
        saldoReal: null,
        fechaSaldoReal: null,
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }
  return { CuentaBancoService };
});

import { generateAccessToken } from '@/lib/jwt';
import { DELETE as movimientoDelete, GET as movimientoGetById, PATCH as movimientoPatch } from '@/app/api/movimientos/[id]/route';
import { GET as movimientosGet, POST as movimientosPost } from '@/app/api/movimientos/route';
import { GET as cuentasBancoGet } from '@/app/api/cuentas-banco/route';
import { POST as categoriasPost } from '@/app/api/categorias/route';
import { POST as usuariosPost } from '@/app/api/usuarios/route';

describe('RBAC integration (handlers)', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = '01234567890123456789012345678901';
  });

  it('Externo GET permitido', async () => {
    const token = await generateAccessToken({
      userId: 4,
      email: 'externo@onebusiness.test',
      rol: 'Externo',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/movimientos?negocioId=1', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await movimientosGet(request);
    expect(response.status).toBe(200);
  });

  it('Externo GET cuentas-banco bloqueado', async () => {
    const token = await generateAccessToken({
      userId: 4,
      email: 'externo@onebusiness.test',
      rol: 'Externo',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/cuentas-banco', {
      headers: { authorization: `Bearer ${token}`, 'x-negocio-id': '1' },
    });

    const response = await cuentasBancoGet(request);
    expect(response.status).toBe(403);
  });

  it('Socio GET cuentas-banco permitido', async () => {
    const token = await generateAccessToken({
      userId: 2,
      email: 'socio@onebusiness.test',
      rol: 'Socio',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/cuentas-banco', {
      headers: { authorization: `Bearer ${token}`, 'x-negocio-id': '1' },
    });

    const response = await cuentasBancoGet(request);
    expect(response.status, await response.text()).toBe(200);
  });

  it('Externo POST bloqueado', async () => {
    const token = await generateAccessToken({
      userId: 4,
      email: 'externo@onebusiness.test',
      rol: 'Externo',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/movimientos', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-negocio-id': '1' },
      body: JSON.stringify({
        negocioId: 1,
        tipo: 'INGRESO',
        fecha: '2026-01-01',
        concepto: 'Test',
        monto: 100,
        cuentaBancoId: 1,
      }),
    });

    const response = await movimientosPost(request);
    expect(response.status, await response.text()).toBe(403);
  });

  it('Externo PATCH bloqueado aunque sea creador', async () => {
    const token = await generateAccessToken({
      userId: 4,
      email: 'externo@onebusiness.test',
      rol: 'Externo',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/movimientos/1?negocioId=1', {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-negocio-id': '1' },
      body: JSON.stringify({ concepto: 'Actualizado' }),
    });

    const response = await movimientoPatch(request, { params: { id: '1' } });
    expect(response.status, await response.text()).toBe(403);
  });

  it('Externo DELETE bloqueado', async () => {
    const token = await generateAccessToken({
      userId: 4,
      email: 'externo@onebusiness.test',
      rol: 'Externo',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/movimientos/1?negocioId=1', {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await movimientoDelete(request, { params: { id: '1' } });
    expect(response.status).toBe(403);
  });

  it('Dueño POST permitido', async () => {
    const token = await generateAccessToken({
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1, 2, 3],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/movimientos', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-negocio-id': '1' },
      body: JSON.stringify({
        negocioId: 1,
        tipo: 'INGRESO',
        fecha: '2026-01-01',
        concepto: 'Test',
        monto: 100,
        cuentaBancoId: 1,
      }),
    });

    const response = await movimientosPost(request);
    expect(response.status, await response.text()).toBe(201);
  });

  it('Socio POST permitido', async () => {
    const token = await generateAccessToken({
      userId: 2,
      email: 'socio@onebusiness.test',
      rol: 'Socio',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/movimientos', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-negocio-id': '1' },
      body: JSON.stringify({
        negocioId: 1,
        tipo: 'INGRESO',
        fecha: '2026-01-01',
        concepto: 'Test',
        monto: 100,
        cuentaBancoId: 1,
      }),
    });

    const response = await movimientosPost(request);
    expect(response.status, await response.text()).toBe(201);
  });

  it('Admin POST permitido con negocio asignado', async () => {
    const token = await generateAccessToken({
      userId: 3,
      email: 'admin@onebusiness.test',
      rol: 'Admin',
      negocios: [2],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/movimientos', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'x-negocio-id': '2',
      },
      body: JSON.stringify({
        negocioId: 2,
        tipo: 'INGRESO',
        fecha: '2026-01-01',
        concepto: 'Test',
        monto: 100,
        cuentaBancoId: 1,
      }),
    });

    const response = await movimientosPost(request);
    expect(response.status, await response.text()).toBe(201);
  });

  it('GET por id requiere read', async () => {
    const token = await generateAccessToken({
      userId: 4,
      email: 'externo@onebusiness.test',
      rol: 'Externo',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/movimientos/1?negocioId=1', {
      method: 'GET',
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await movimientoGetById(request, { params: { id: '1' } });
    expect(response.status, await response.text()).toBe(200);
  });
});

describe('RBAC — Rol Externo es read-only', () => {
  const metodosEscritura = ['POST', 'PUT', 'PATCH', 'DELETE'] as const;
  const endpoints = ['/api/movimientos', '/api/categorias', '/api/cuentas-banco', '/api/usuarios'] as const;

  const handlers = {
    '/api/movimientos': movimientosPost,
    '/api/categorias': categoriasPost,
    '/api/cuentas-banco': cuentasBancoGet,
    '/api/usuarios': usuariosPost,
  } as const;

  metodosEscritura.forEach((metodo) => {
    endpoints.forEach((endpoint) => {
      it(`Externo NO puede ${metodo} ${endpoint} → 403`, async () => {
        process.env.JWT_SECRET = '01234567890123456789012345678901';
        const token = await generateAccessToken({
          userId: 4,
          email: 'externo@onebusiness.test',
          rol: 'Externo',
          negocios: [1],
          tokenVersion: 0,
        });

        const request = new Request(`http://localhost${endpoint}?negocioId=1`, {
          method: metodo,
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-negocio-id': '1' },
          body: JSON.stringify({ any: 'payload' }),
        });

        const response = await handlers[endpoint](request as never);
        expect(response.status, await response.text()).toBe(403);
      });
    });
  });

  it('Externo SÍ puede GET /api/movimientos → 200', async () => {
    process.env.JWT_SECRET = '01234567890123456789012345678901';
    const token = await generateAccessToken({
      userId: 4,
      email: 'externo@onebusiness.test',
      rol: 'Externo',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/movimientos?negocioId=1', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await movimientosGet(request);
    expect(response.status).toBe(200);
  });
});
