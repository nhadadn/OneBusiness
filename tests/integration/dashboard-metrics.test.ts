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
  obtenerResumenFinanciero: vi.fn(),
  obtenerResumenesFinancierosPorNegocio: vi.fn(),
}));

vi.mock('@/services/movimiento.service', () => {
  return {
    MovimientoService: vi.fn().mockImplementation(() => movimientoServiceMocks),
  };
});

vi.mock('@/services/negocio.service', () => {
  return {
    updateNegocioUmbrales: vi.fn(),
  };
});

import { generateAccessToken } from '@/lib/jwt';
import { updateNegocioUmbrales } from '@/services/negocio.service';
import { GET as negocioResumenGet } from '@/app/api/negocios/[id]/resumen/route';
import { PATCH as negocioUmbralesPatch } from '@/app/api/negocios/[id]/umbrales/route';
import { GET as resumenGlobalGet } from '@/app/api/dashboard/resumen-global/route';

describe('Dashboards métricas integration (handlers)', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = '01234567890123456789012345678901';
    vi.resetAllMocks();
  });

  describe('GET /api/negocios/[id]/resumen', () => {
    it('retorna 401 sin token', async () => {
      const request = new Request('http://localhost/api/negocios/1/resumen');
      const response = await negocioResumenGet(request, { params: { id: '1' } });
      expect(response.status).toBe(401);
    });

    it('retorna 403 si no tiene acceso al negocio', async () => {
      const token = await generateAccessToken({
        userId: 10,
        email: 'socio@onebusiness.test',
        rol: 'Socio',
        negocios: [2],
        tokenVersion: 0,
      });

      const request = new Request('http://localhost/api/negocios/1/resumen?fechaDesde=2026-01-01&fechaHasta=2026-01-31', {
        headers: { authorization: `Bearer ${token}` },
      });

      const response = await negocioResumenGet(request, { params: { id: '1' } });
      expect(response.status).toBe(403);
      expect(movimientoServiceMocks.obtenerResumenFinanciero).not.toHaveBeenCalled();
    });

    it('retorna 200 y usa el período indicado', async () => {
      movimientoServiceMocks.obtenerResumenFinanciero.mockResolvedValue({
        negocioId: 1,
        nombre: 'Negocio 1',
        totalIngresos: 1000,
        totalEgresos: 200,
        balance: 800,
        cantidadMovimientos: 5,
        cantidadPendientes: 1,
        semaforo: 'verde',
      });

      const token = await generateAccessToken({
        userId: 10,
        email: 'socio@onebusiness.test',
        rol: 'Socio',
        negocios: [1],
        tokenVersion: 0,
      });

      const request = new Request('http://localhost/api/negocios/1/resumen?fechaDesde=2026-01-01&fechaHasta=2026-01-31', {
        headers: { authorization: `Bearer ${token}` },
      });

      const response = await negocioResumenGet(request, { params: { id: '1' } });
      expect(response.status).toBe(200);
      expect(movimientoServiceMocks.obtenerResumenFinanciero).toHaveBeenCalledWith({
        negocioId: 1,
        fechaDesde: '2026-01-01',
        fechaHasta: '2026-01-31',
      });
    });
  });

  describe('GET /api/dashboard/resumen-global', () => {
    it('retorna 401 sin token', async () => {
      const request = new Request('http://localhost/api/dashboard/resumen-global');
      const response = await resumenGlobalGet(request);
      expect(response.status).toBe(401);
    });

    it('retorna 403 para rol sin permiso (Admin)', async () => {
      const token = await generateAccessToken({
        userId: 3,
        email: 'admin@onebusiness.test',
        rol: 'Admin',
        negocios: [1],
        tokenVersion: 0,
      });

      const request = new Request('http://localhost/api/dashboard/resumen-global?fechaDesde=2026-01-01&fechaHasta=2026-01-31', {
        headers: { authorization: `Bearer ${token}` },
      });

      const response = await resumenGlobalGet(request);
      expect(response.status).toBe(403);
      expect(movimientoServiceMocks.obtenerResumenesFinancierosPorNegocio).not.toHaveBeenCalled();
    });

    it('retorna 200 para Dueño y hace una sola llamada (all negocios)', async () => {
      movimientoServiceMocks.obtenerResumenesFinancierosPorNegocio.mockResolvedValue([
        { negocioId: 1, nombre: 'N1', totalIngresos: 100, totalEgresos: 0, balance: 100, cantidadMovimientos: 1, cantidadPendientes: 0, semaforo: 'verde' },
        { negocioId: 2, nombre: 'N2', totalIngresos: 0, totalEgresos: 50, balance: -50, cantidadMovimientos: 1, cantidadPendientes: 1, semaforo: 'rojo' },
      ]);

      const token = await generateAccessToken({
        userId: 1,
        email: 'dueno@onebusiness.test',
        rol: 'Dueño',
        negocios: [1, 2],
        tokenVersion: 0,
      });

      const request = new Request('http://localhost/api/dashboard/resumen-global?fechaDesde=2026-01-01&fechaHasta=2026-01-31', {
        headers: { authorization: `Bearer ${token}` },
      });

      const response = await resumenGlobalGet(request);
      expect(response.status).toBe(200);
      expect(movimientoServiceMocks.obtenerResumenesFinancierosPorNegocio).toHaveBeenCalledWith({
        negocioIds: undefined,
        fechaDesde: '2026-01-01',
        fechaHasta: '2026-01-31',
      });
    });

    it('retorna 200 para Socio y usa negocios del token', async () => {
      movimientoServiceMocks.obtenerResumenesFinancierosPorNegocio.mockResolvedValue([
        { negocioId: 10, nombre: 'N10', totalIngresos: 10, totalEgresos: 1, balance: 9, cantidadMovimientos: 1, cantidadPendientes: 0, semaforo: 'verde' },
      ]);

      const token = await generateAccessToken({
        userId: 2,
        email: 'socio@onebusiness.test',
        rol: 'Socio',
        negocios: [10],
        tokenVersion: 0,
      });

      const request = new Request('http://localhost/api/dashboard/resumen-global?fechaDesde=2026-02-01&fechaHasta=2026-02-15', {
        headers: { authorization: `Bearer ${token}` },
      });

      const response = await resumenGlobalGet(request);
      expect(response.status).toBe(200);
      expect(movimientoServiceMocks.obtenerResumenesFinancierosPorNegocio).toHaveBeenCalledWith({
        negocioIds: [10],
        fechaDesde: '2026-02-01',
        fechaHasta: '2026-02-15',
      });
    });
  });

  describe('PATCH /api/negocios/[id]/umbrales', () => {
    it('retorna 401 sin token', async () => {
      const request = new Request('http://localhost/api/negocios/1/umbrales', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ umbralAlerta: 100, umbralCritico: 10 }),
      });
      const response = await negocioUmbralesPatch(request, { params: { id: '1' } });
      expect(response.status).toBe(401);
    });

    it('retorna 403 para rol sin permiso (Socio)', async () => {
      const token = await generateAccessToken({
        userId: 2,
        email: 'socio@onebusiness.test',
        rol: 'Socio',
        negocios: [1],
        tokenVersion: 0,
      });

      const request = new Request('http://localhost/api/negocios/1/umbrales', {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ umbralAlerta: 100, umbralCritico: 10 }),
      });

      const response = await negocioUmbralesPatch(request, { params: { id: '1' } });
      expect(response.status).toBe(403);
      expect(vi.mocked(updateNegocioUmbrales)).not.toHaveBeenCalled();
    });

    it('retorna 400 si umbralCritico no es menor que umbralAlerta', async () => {
      const token = await generateAccessToken({
        userId: 1,
        email: 'dueno@onebusiness.test',
        rol: 'Dueño',
        negocios: [1],
        tokenVersion: 0,
      });

      const request = new Request('http://localhost/api/negocios/1/umbrales', {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ umbralAlerta: 50, umbralCritico: 50 }),
      });

      const response = await negocioUmbralesPatch(request, { params: { id: '1' } });
      expect(response.status).toBe(400);
      expect(vi.mocked(updateNegocioUmbrales)).not.toHaveBeenCalled();
    });

    it('retorna 200 con Dueño y negocio actualizado', async () => {
      vi.mocked(updateNegocioUmbrales).mockResolvedValue({
        id: 1,
        nombre: 'Negocio 1',
        rubro: null,
        modeloIngreso: null,
        tieneSocios: false,
        activo: true,
        umbralAlerta: '100.00',
        umbralCritico: '10.00',
        updatedAt: new Date(),
      });

      const token = await generateAccessToken({
        userId: 1,
        email: 'dueno@onebusiness.test',
        rol: 'Dueño',
        negocios: [1],
        tokenVersion: 0,
      });

      const request = new Request('http://localhost/api/negocios/1/umbrales', {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ umbralAlerta: 100, umbralCritico: 10 }),
      });

      const response = await negocioUmbralesPatch(request, { params: { id: '1' } });
      expect(response.status).toBe(200);
      expect(vi.mocked(updateNegocioUmbrales)).toHaveBeenCalledWith(1, { umbralAlerta: 100, umbralCritico: 10 });
    });
  });
});

