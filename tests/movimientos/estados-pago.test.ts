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
  obtener: vi.fn(),
  aprobar: vi.fn(),
  marcarPagado: vi.fn(),
}));

vi.mock('@/services/movimiento.service', () => {
  return {
    MovimientoService: vi.fn().mockImplementation(() => serviceMocks),
  };
});

import { generateAccessToken } from '@/lib/jwt';
import { POST as movimientosPost } from '@/app/api/movimientos/route';
import { PATCH as movimientosAprobar } from '@/app/api/movimientos/[id]/aprobar/route';
import { PATCH as movimientosPagar } from '@/app/api/movimientos/[id]/pagar/route';

describe('Estados de Pago/Aprobación', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = '01234567890123456789012345678901';
    vi.resetAllMocks();
  });

  describe('POST /api/movimientos con efectuado=true', () => {
    it('crea el movimiento en estado PAGADO directamente', async () => {
      serviceMocks.crear.mockResolvedValue({ id: 1, negocioId: 1, estado: 'PAGADO' });
      const token = await generateAccessToken({
        userId: 10,
        email: 'admin@onebusiness.test',
        rol: 'Admin',
        negocios: [1],
        tokenVersion: 0,
      });

      const request = new Request('http://localhost/api/movimientos?negocioId=1', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-negocio-id': '1' },
        body: JSON.stringify({
          negocioId: 1,
          tipo: 'INGRESO',
          fecha: '2026-01-10',
          concepto: 'Ingreso',
          monto: 100,
          cuentaBancoId: 1,
          efectuado: true,
        }),
      });

      const response = await movimientosPost(request);
      const body = await response.json();
      expect(body.data.estado).toBe('PAGADO');
    });

    it('registra fechaPago y pagadoPor en la respuesta', async () => {
      serviceMocks.crear.mockResolvedValue({
        id: 1,
        negocioId: 1,
        estado: 'PAGADO',
        fechaPago: new Date('2026-01-10T12:00:00.000Z'),
        pagadoPor: 10,
      });
      const token = await generateAccessToken({
        userId: 10,
        email: 'admin@onebusiness.test',
        rol: 'Admin',
        negocios: [1],
        tokenVersion: 0,
      });

      const request = new Request('http://localhost/api/movimientos?negocioId=1', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-negocio-id': '1' },
        body: JSON.stringify({
          negocioId: 1,
          tipo: 'INGRESO',
          fecha: '2026-01-10',
          concepto: 'Ingreso',
          monto: 100,
          cuentaBancoId: 1,
          efectuado: true,
        }),
      });

      const response = await movimientosPost(request);
      const body = await response.json();
      expect(body.data.pagadoPor).toBe(10);
    });
  });

  describe('PATCH /api/movimientos/:id/aprobar', () => {
    it('cambia estado a APROBADO', async () => {
      serviceMocks.obtener.mockResolvedValue({ id: 1, activo: true, negocioId: 1, estado: 'PENDIENTE' });
      serviceMocks.aprobar.mockResolvedValue({ id: 1, estado: 'APROBADO' });
      const token = await generateAccessToken({
        userId: 10,
        email: 'admin@onebusiness.test',
        rol: 'Admin',
        negocios: [1],
        tokenVersion: 0,
      });

      const request = new Request('http://localhost/api/movimientos/1/aprobar', {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}`, 'x-negocio-id': '1' },
      });

      const response = await movimientosAprobar(request, { params: { id: '1' } });
      const body = await response.json();
      expect(body.data.estado).toBe('APROBADO');
    });

    it('retorna 403 si el movimiento no está en PENDIENTE', async () => {
      serviceMocks.obtener.mockResolvedValue({ id: 1, activo: true, negocioId: 1, estado: 'APROBADO' });
      serviceMocks.aprobar.mockRejectedValue(new Error('Solo se pueden aprobar movimientos en estado PENDIENTE'));
      const token = await generateAccessToken({
        userId: 10,
        email: 'admin@onebusiness.test',
        rol: 'Admin',
        negocios: [1],
        tokenVersion: 0,
      });

      const request = new Request('http://localhost/api/movimientos/1/aprobar', {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}`, 'x-negocio-id': '1' },
      });

      const response = await movimientosAprobar(request, { params: { id: '1' } });
      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /api/movimientos/:id/pagar', () => {
    it('cambia estado a PAGADO cuando está en APROBADO', async () => {
      serviceMocks.obtener.mockResolvedValue({ id: 1, activo: true, negocioId: 1, estado: 'APROBADO' });
      serviceMocks.marcarPagado.mockResolvedValue({ id: 1, estado: 'PAGADO' });
      const token = await generateAccessToken({
        userId: 10,
        email: 'admin@onebusiness.test',
        rol: 'Admin',
        negocios: [1],
        tokenVersion: 0,
      });

      const request = new Request('http://localhost/api/movimientos/1/pagar', {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}`, 'x-negocio-id': '1' },
      });

      const response = await movimientosPagar(request, { params: { id: '1' } });
      const body = await response.json();
      expect(body.data.estado).toBe('PAGADO');
    });

    it('retorna 403 si el movimiento no está en APROBADO', async () => {
      serviceMocks.obtener.mockResolvedValue({ id: 1, activo: true, negocioId: 1, estado: 'PENDIENTE' });
      serviceMocks.marcarPagado.mockRejectedValue(new Error('Solo se pueden marcar como pagados movimientos en estado APROBADO'));
      const token = await generateAccessToken({
        userId: 10,
        email: 'admin@onebusiness.test',
        rol: 'Admin',
        negocios: [1],
        tokenVersion: 0,
      });

      const request = new Request('http://localhost/api/movimientos/1/pagar', {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}`, 'x-negocio-id': '1' },
      });

      const response = await movimientosPagar(request, { params: { id: '1' } });
      expect(response.status).toBe(403);
    });

    it('retorna 403 si el rol es Socio', async () => {
      const token = await generateAccessToken({
        userId: 11,
        email: 'socio@onebusiness.test',
        rol: 'Socio',
        negocios: [1],
        tokenVersion: 0,
      });
      const request = new Request('http://localhost/api/movimientos/1/pagar', {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}`, 'x-negocio-id': '1' },
      });
      const response = await movimientosPagar(request, { params: { id: '1' } });
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
      const request = new Request('http://localhost/api/movimientos/1/pagar', {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}`, 'x-negocio-id': '1' },
      });
      const response = await movimientosPagar(request, { params: { id: '1' } });
      expect(response.status).toBe(403);
    });

    it('acepta fechaPago opcional en el body', async () => {
      serviceMocks.obtener.mockResolvedValue({ id: 1, activo: true, negocioId: 1, estado: 'APROBADO' });
      serviceMocks.marcarPagado.mockResolvedValue({ id: 1, estado: 'PAGADO' });
      const token = await generateAccessToken({
        userId: 10,
        email: 'admin@onebusiness.test',
        rol: 'Admin',
        negocios: [1],
        tokenVersion: 0,
      });
      const fechaPago = '2026-01-10T12:00:00.000Z';
      const request = new Request('http://localhost/api/movimientos/1/pagar', {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}`, 'x-negocio-id': '1', 'content-type': 'application/json' },
        body: JSON.stringify({ fechaPago }),
      });
      await movimientosPagar(request, { params: { id: '1' } });
      expect(serviceMocks.marcarPagado).toHaveBeenCalledWith(1, 10, fechaPago);
    });
  });
});

