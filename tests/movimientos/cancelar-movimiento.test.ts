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
  obtener: vi.fn(),
  cancelarMovimiento: vi.fn(),
}));

vi.mock('@/services/movimiento.service', () => {
  return {
    MovimientoService: vi.fn().mockImplementation(() => serviceMocks),
  };
});

import { generateAccessToken } from '@/lib/jwt';
import { PATCH as movimientosCancelar } from '@/app/api/movimientos/[id]/cancelar/route';

describe('Cancelar movimiento', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = '01234567890123456789012345678901';
    vi.resetAllMocks();
  });

  describe('PATCH /api/movimientos/:id/cancelar', () => {
    it('cancela movimiento en PENDIENTE sin crear reversión', async () => {
      serviceMocks.obtener.mockResolvedValue({ id: 1, activo: true, negocioId: 1, estado: 'PENDIENTE' });
      serviceMocks.cancelarMovimiento.mockResolvedValue({ id: 1, estado: 'CANCELADO' });
      const token = await generateAccessToken({
        userId: 10,
        email: 'admin@onebusiness.test',
        rol: 'Admin',
        negocios: [1],
        tokenVersion: 0,
      });
      const request = new Request('http://localhost/api/movimientos/1/cancelar', {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}`, 'x-negocio-id': '1' },
      });
      const response = await movimientosCancelar(request, { params: { id: '1' } });
      const body = await response.json();
      expect(body.data.estado).toBe('CANCELADO');
    });

    it('cancela movimiento en APROBADO sin crear reversión', async () => {
      serviceMocks.obtener.mockResolvedValue({ id: 2, activo: true, negocioId: 1, estado: 'APROBADO' });
      serviceMocks.cancelarMovimiento.mockResolvedValue({ id: 2, estado: 'CANCELADO' });
      const token = await generateAccessToken({
        userId: 10,
        email: 'admin@onebusiness.test',
        rol: 'Admin',
        negocios: [1],
        tokenVersion: 0,
      });
      const request = new Request('http://localhost/api/movimientos/2/cancelar', {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}`, 'x-negocio-id': '1' },
      });
      const response = await movimientosCancelar(request, { params: { id: '2' } });
      const body = await response.json();
      expect(body.data.estado).toBe('CANCELADO');
    });

    it('cancela movimiento en PAGADO y crea movimiento de reversión', async () => {
      serviceMocks.obtener.mockResolvedValue({ id: 3, activo: true, negocioId: 1, estado: 'PAGADO' });
      serviceMocks.cancelarMovimiento.mockResolvedValue({ id: 3, estado: 'CANCELADO' });
      const token = await generateAccessToken({
        userId: 10,
        email: 'admin@onebusiness.test',
        rol: 'Admin',
        negocios: [1],
        tokenVersion: 0,
      });
      const request = new Request('http://localhost/api/movimientos/3/cancelar', {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}`, 'x-negocio-id': '1' },
      });
      const response = await movimientosCancelar(request, { params: { id: '3' } });
      const body = await response.json();
      expect(body.data.estado).toBe('CANCELADO');
    });

    it('retorna 400 si el movimiento está en RECHAZADO', async () => {
      serviceMocks.obtener.mockResolvedValue({ id: 4, activo: true, negocioId: 1, estado: 'RECHAZADO' });
      serviceMocks.cancelarMovimiento.mockRejectedValue(new Error('No se puede cancelar un movimiento rechazado'));
      const token = await generateAccessToken({
        userId: 10,
        email: 'admin@onebusiness.test',
        rol: 'Admin',
        negocios: [1],
        tokenVersion: 0,
      });
      const request = new Request('http://localhost/api/movimientos/4/cancelar', {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}`, 'x-negocio-id': '1' },
      });
      const response = await movimientosCancelar(request, { params: { id: '4' } });
      expect(response.status).toBe(400);
    });

    it('retorna 400 si el movimiento está en CANCELADO', async () => {
      serviceMocks.obtener.mockResolvedValue({ id: 5, activo: true, negocioId: 1, estado: 'CANCELADO' });
      serviceMocks.cancelarMovimiento.mockRejectedValue(new Error('El movimiento ya está cancelado'));
      const token = await generateAccessToken({
        userId: 10,
        email: 'admin@onebusiness.test',
        rol: 'Admin',
        negocios: [1],
        tokenVersion: 0,
      });
      const request = new Request('http://localhost/api/movimientos/5/cancelar', {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}`, 'x-negocio-id': '1' },
      });
      const response = await movimientosCancelar(request, { params: { id: '5' } });
      expect(response.status).toBe(400);
    });

    it('retorna 403 si el rol es Socio', async () => {
      const token = await generateAccessToken({
        userId: 11,
        email: 'socio@onebusiness.test',
        rol: 'Socio',
        negocios: [1],
        tokenVersion: 0,
      });
      const request = new Request('http://localhost/api/movimientos/1/cancelar', {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}`, 'x-negocio-id': '1' },
      });
      const response = await movimientosCancelar(request, { params: { id: '1' } });
      expect(response.status).toBe(403);
    });

    it('retorna 403 si el rol es Externo', async () => {
      const token = await generateAccessToken({
        userId: 12,
        email: 'externo@onebusiness.test',
        rol: 'Externo',
        negocios: [1],
        tokenVersion: 0,
      });
      const request = new Request('http://localhost/api/movimientos/1/cancelar', {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}`, 'x-negocio-id': '1' },
      });
      const response = await movimientosCancelar(request, { params: { id: '1' } });
      expect(response.status).toBe(403);
    });

    it('acepta motivo opcional en el body', async () => {
      serviceMocks.obtener.mockResolvedValue({ id: 6, activo: true, negocioId: 1, estado: 'APROBADO' });
      serviceMocks.cancelarMovimiento.mockResolvedValue({ id: 6, estado: 'CANCELADO' });
      const token = await generateAccessToken({
        userId: 10,
        email: 'admin@onebusiness.test',
        rol: 'Admin',
        negocios: [1],
        tokenVersion: 0,
      });
      const request = new Request('http://localhost/api/movimientos/6/cancelar', {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}`, 'x-negocio-id': '1', 'content-type': 'application/json' },
        body: JSON.stringify({ motivo: 'Error de captura' }),
      });
      await movimientosCancelar(request, { params: { id: '6' } });
      expect(serviceMocks.cancelarMovimiento).toHaveBeenCalledWith(6, 10, 'Error de captura');
    });
  });
});

