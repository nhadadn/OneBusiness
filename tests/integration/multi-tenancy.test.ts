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
import { GET as movimientosGet } from '@/app/api/movimientos/route';

describe('Multi-tenancy integration (handlers)', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = '01234567890123456789012345678901';
  });

  it('bloquea request sin negocioId para rol no Dueño', async () => {
    const token = await generateAccessToken({
      userId: 2,
      email: 'socio@onebusiness.test',
      rol: 'Socio',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/movimientos', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await movimientosGet(request);
    expect(response.status).toBe(400);
  });

  it('retorna 403 si negocioId no está asignado', async () => {
    const token = await generateAccessToken({
      userId: 2,
      email: 'socio@onebusiness.test',
      rol: 'Socio',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/movimientos', {
      headers: { authorization: `Bearer ${token}`, 'x-negocio-id': '9' },
    });

    const response = await movimientosGet(request);
    expect(response.status).toBe(403);
  });

  it('permite request con header X-Negocio-Id asignado', async () => {
    const token = await generateAccessToken({
      userId: 2,
      email: 'socio@onebusiness.test',
      rol: 'Socio',
      negocios: [1, 2],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/movimientos', {
      headers: { authorization: `Bearer ${token}`, 'x-negocio-id': '2' },
    });

    const response = await movimientosGet(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.tenant.negocioId).toBe(2);
  });

  it('permite request con negocioId en query', async () => {
    const token = await generateAccessToken({
      userId: 2,
      email: 'socio@onebusiness.test',
      rol: 'Socio',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/movimientos?negocioId=1', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await movimientosGet(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.tenant.negocioId).toBe(1);
  });

  it('Dueño puede omitir negocioId y ver todos', async () => {
    const token = await generateAccessToken({
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1, 2, 3],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/movimientos', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await movimientosGet(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.tenant.isOwner).toBe(true);
    expect(body.tenant.negocioId).toBeNull();
  });
});

