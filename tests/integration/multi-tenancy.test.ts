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

const movimientoServiceMocks = vi.hoisted(() => ({
  listar: vi.fn(),
}));

vi.mock('@/services/movimiento.service', () => {
  class MovimientoService {
    async listar(...args: unknown[]) {
      return movimientoServiceMocks.listar(...args);
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
    vi.clearAllMocks();
    movimientoServiceMocks.listar.mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 });
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

  it('no retorna 409 para error técnico de enum en DB (mapea a 400)', async () => {
    movimientoServiceMocks.listar.mockRejectedValueOnce(
      new Error('invalid input value for enum estado_movimiento: "PENDIENTE"'),
    );

    const token = await generateAccessToken({
      userId: 2,
      email: 'socio@onebusiness.test',
      rol: 'Socio',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/movimientos?negocioId=1&estado=PENDIENTE&page=1&limit=10', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await movimientosGet(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/estado_movimiento/);
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

