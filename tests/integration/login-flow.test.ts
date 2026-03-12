import { describe, expect, it, vi } from 'vitest';

vi.mock('@/services/auth.service', () => {
  return {
    login: vi.fn(),
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

import { login } from '@/services/auth.service';
import { POST as loginPost } from '@/app/api/auth/login/route';
import { GET as movimientosGet } from '@/app/api/movimientos/route';
import { generateAccessToken } from '@/lib/jwt';

describe('Login flow (API)', () => {
  it('login -> accessToken -> acceso a ruta protegida con negocioId', async () => {
    process.env.JWT_SECRET = '01234567890123456789012345678901';

    const token = await generateAccessToken({
      userId: 2,
      email: 'socio@onebusiness.test',
      rol: 'Socio',
      negocios: [1],
      tokenVersion: 0,
    });

    vi.mocked(login).mockResolvedValue({
      success: true,
      accessToken: token,
      refreshToken: 'refresh.token',
      user: { id: 2, nombre: 'María Socia', email: 'socio@onebusiness.test', rol: 'Socio', negocios: [1] },
    } as any);

    const loginRequest = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'socio@onebusiness.test', password: 'test123456' }),
    });

    const loginResponse = await loginPost(loginRequest);
    expect(loginResponse.status).toBe(200);
    const loginBody = await loginResponse.json();
    expect(loginBody.accessToken).toBe(token);

    const movimientosRequest = new Request('http://localhost/api/movimientos', {
      headers: { authorization: `Bearer ${loginBody.accessToken}`, 'x-negocio-id': '1' },
    });
    const movimientosResponse = await movimientosGet(movimientosRequest);
    expect(movimientosResponse.status).toBe(200);
  });
});

