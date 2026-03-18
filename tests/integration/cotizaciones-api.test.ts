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

vi.mock('@/lib/audit-logger', () => {
  return {
    auditLog: vi.fn(async () => undefined),
    getRequestContext: () => ({ ipAddress: 'test', userAgent: 'test', requestId: 'req-1' }),
  };
});

vi.mock('@/services/cotizacion.service', () => {
  const mocks = {
    listar: vi.fn(),
    crear: vi.fn(),
    obtener: vi.fn(),
    actualizar: vi.fn(),
    cambiarEstado: vi.fn(),
    eliminar: vi.fn(),
  };

  class CotizacionError extends Error {
    code: 'FORBIDDEN' | 'NOT_FOUND' | 'INVALID_STATE' | 'INVALID_TRANSITION';
    constructor(message: string, code: CotizacionError['code']) {
      super(message);
      this.code = code;
      this.name = 'CotizacionError';
    }
  }

  class CotizacionService {
    listarCotizaciones = mocks.listar;
    crearCotizacion = mocks.crear;
    obtenerCotizacion = mocks.obtener;
    actualizarCotizacion = mocks.actualizar;
    cambiarEstado = mocks.cambiarEstado;
    eliminarCotizacion = mocks.eliminar;
  }

  return { CotizacionService, CotizacionError, __cotizacionMocks: mocks };
});

import { generateAccessToken } from '@/lib/jwt';
import * as cotizacionServiceModule from '@/services/cotizacion.service';
import { DELETE, GET as getById, PATCH as patchById } from '@/app/api/cotizaciones/[id]/route';
import { PATCH as patchEstado } from '@/app/api/cotizaciones/[id]/estado/route';
import { GET as listCotizaciones, POST as postCotizaciones } from '@/app/api/cotizaciones/route';

function makeCotizacion(overrides: Partial<any> = {}) {
  return {
    id: 1,
    negocioId: 1,
    folio: 'COT-2026-001',
    clienteNombre: 'Cliente',
    fecha: '2026-01-01',
    estado: 'BORRADOR',
    subtotal: '100.00',
    iva: '16.00',
    total: '116.00',
    movimientoId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      { id: 1, cotizacionId: 1, orden: 1, descripcion: 'A', cantidad: null, unidadMedida: null, precioUnitario: null, importe: '100.00' },
    ],
    ...overrides,
  };
}

describe('Cotizaciones /api/cotizaciones integration (handlers)', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = '01234567890123456789012345678901';
    vi.resetAllMocks();
  });

  it('CRUD básico — crear cotización (201) y folio formato', async () => {
    const __cotizacionMocks = (cotizacionServiceModule as any).__cotizacionMocks;
    vi.mocked(__cotizacionMocks.crear).mockResolvedValue(makeCotizacion());

    const token = await generateAccessToken({
      userId: 2,
      email: 'socio@onebusiness.test',
      rol: 'Socio',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/cotizaciones', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        negocioId: 1,
        clienteNombre: 'Cliente',
        fecha: '2026-01-01',
        items: [{ descripcion: 'A', importe: 100 }],
      }),
    });

    const response = await postCotizaciones(request);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.folio).toMatch(/^COT-2026-\d{3}$/);
  });

  it('CRUD básico — listar (200) con paginación y filtro estado', async () => {
    const __cotizacionMocks = (cotizacionServiceModule as any).__cotizacionMocks;
    vi.mocked(__cotizacionMocks.listar).mockResolvedValue({ items: [makeCotizacion()], total: 1, page: 1, totalPages: 1 });

    const token = await generateAccessToken({
      userId: 2,
      email: 'socio@onebusiness.test',
      rol: 'Socio',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/cotizaciones?estado=BORRADOR&page=1&limit=20', {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await listCotizaciones(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.page).toBe(1);
    expect(body.data.totalPages).toBe(1);
  });

  it('CRUD básico — obtener por id (200) con ítems', async () => {
    const __cotizacionMocks = (cotizacionServiceModule as any).__cotizacionMocks;
    vi.mocked(__cotizacionMocks.obtener).mockResolvedValue(makeCotizacion());

    const token = await generateAccessToken({
      userId: 2,
      email: 'socio@onebusiness.test',
      rol: 'Socio',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/cotizaciones/1', { headers: { authorization: `Bearer ${token}` } });
    const response = await getById(request, { params: { id: '1' } });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.items)).toBe(true);
    expect(body.data.items[0].orden).toBe(1);
  });

  it('CRUD básico — actualizar (200) recalcula totales si se pasan ítems', async () => {
    const __cotizacionMocks = (cotizacionServiceModule as any).__cotizacionMocks;
    vi.mocked(__cotizacionMocks.actualizar).mockResolvedValue(
      makeCotizacion({ subtotal: '200.00', iva: '32.00', total: '232.00' }),
    );

    const token = await generateAccessToken({
      userId: 2,
      email: 'socio@onebusiness.test',
      rol: 'Socio',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/cotizaciones/1', {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        items: [{ descripcion: 'A', importe: 200 }],
      }),
    });

    const response = await patchById(request, { params: { id: '1' } });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.total).toBe('232.00');
  });

  it('CRUD básico — eliminar (200) si BORRADOR, 400 si otro estado', async () => {
    const __cotizacionMocks = (cotizacionServiceModule as any).__cotizacionMocks;
    const CotizacionError = (cotizacionServiceModule as any).CotizacionError;
    vi.mocked(__cotizacionMocks.eliminar).mockResolvedValue(makeCotizacion());

    const token = await generateAccessToken({
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1],
      tokenVersion: 0,
    });

    const requestOk = new Request('http://localhost/api/cotizaciones/1', { method: 'DELETE', headers: { authorization: `Bearer ${token}` } });
    const responseOk = await DELETE(requestOk, { params: { id: '1' } });
    expect(responseOk.status).toBe(200);

    vi.mocked(__cotizacionMocks.eliminar).mockRejectedValue(new CotizacionError('Solo se pueden eliminar cotizaciones en estado BORRADOR', 'INVALID_STATE'));
    const requestBad = new Request('http://localhost/api/cotizaciones/1', { method: 'DELETE', headers: { authorization: `Bearer ${token}` } });
    const responseBad = await DELETE(requestBad, { params: { id: '1' } });
    expect(responseBad.status).toBe(400);
  });

  it('Folio auto-incremental — dos cotizaciones mismo año → folios consecutivos', async () => {
    const __cotizacionMocks = (cotizacionServiceModule as any).__cotizacionMocks;
    vi.mocked(__cotizacionMocks.crear)
      .mockResolvedValueOnce(makeCotizacion({ folio: 'COT-2026-001' }))
      .mockResolvedValueOnce(makeCotizacion({ id: 2, folio: 'COT-2026-002' }));

    const token = await generateAccessToken({
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1],
      tokenVersion: 0,
    });

    const req1 = new Request('http://localhost/api/cotizaciones', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ negocioId: 1, clienteNombre: 'Cliente', fecha: '2026-01-01', items: [{ descripcion: 'A', importe: 10 }] }),
    });
    const req2 = new Request('http://localhost/api/cotizaciones', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ negocioId: 1, clienteNombre: 'Cliente', fecha: '2026-01-02', items: [{ descripcion: 'A', importe: 10 }] }),
    });

    const res1 = await postCotizaciones(req1);
    const res2 = await postCotizaciones(req2);
    const b1 = await res1.json();
    const b2 = await res2.json();
    expect(b1.data.folio).toBe('COT-2026-001');
    expect(b2.data.folio).toBe('COT-2026-002');
  });

  it('Transición BORRADOR → ENVIADA (200)', async () => {
    const __cotizacionMocks = (cotizacionServiceModule as any).__cotizacionMocks;
    vi.mocked(__cotizacionMocks.cambiarEstado).mockResolvedValue(makeCotizacion({ estado: 'ENVIADA' }));

    const token = await generateAccessToken({
      userId: 2,
      email: 'socio@onebusiness.test',
      rol: 'Socio',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/cotizaciones/1/estado', {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ estado: 'ENVIADA' }),
    });

    const response = await patchEstado(request, { params: { id: '1' } });
    expect(response.status).toBe(200);
  });

  it('Transición ENVIADA → APROBADA sin numeroOc (400)', async () => {
    const __cotizacionMocks = (cotizacionServiceModule as any).__cotizacionMocks;
    const token = await generateAccessToken({
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/cotizaciones/1/estado', {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ estado: 'APROBADA' }),
    });

    const response = await patchEstado(request, { params: { id: '1' } });
    expect(response.status).toBe(400);
    expect(vi.mocked(__cotizacionMocks.cambiarEstado)).not.toHaveBeenCalled();
  });

  it('Transición ENVIADA → APROBADA con numeroOc (200)', async () => {
    const __cotizacionMocks = (cotizacionServiceModule as any).__cotizacionMocks;
    vi.mocked(__cotizacionMocks.cambiarEstado).mockResolvedValue(makeCotizacion({ estado: 'APROBADA', numeroOc: 'OC-001' }));

    const token = await generateAccessToken({
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/cotizaciones/1/estado', {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ estado: 'APROBADA', numeroOc: 'OC-001' }),
    });

    const response = await patchEstado(request, { params: { id: '1' } });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.numeroOc).toBe('OC-001');
  });

  it('Transición APROBADA → FACTURADA (200) y movimientoId asociado', async () => {
    const __cotizacionMocks = (cotizacionServiceModule as any).__cotizacionMocks;
    vi.mocked(__cotizacionMocks.cambiarEstado).mockResolvedValue(
      makeCotizacion({ estado: 'FACTURADA', movimientoId: 99, numeroFactura: 'F-1' }),
    );

    const token = await generateAccessToken({
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/cotizaciones/1/estado', {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ estado: 'FACTURADA', numeroFactura: 'F-1', cuentaBancoId: 1 }),
    });

    const response = await patchEstado(request, { params: { id: '1' } });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.movimientoId).toBe(99);
  });

  it('Transición APROBADA → FACTURADA sin cuentaBancoId (400)', async () => {
    const token = await generateAccessToken({
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/cotizaciones/1/estado', {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ estado: 'FACTURADA', numeroFactura: 'F-1' }),
    });

    const response = await patchEstado(request, { params: { id: '1' } });
    expect(response.status).toBe(400);
  });

  it('Transición inválida (400) con mensaje claro', async () => {
    const __cotizacionMocks = (cotizacionServiceModule as any).__cotizacionMocks;
    const CotizacionError = (cotizacionServiceModule as any).CotizacionError;
    vi.mocked(__cotizacionMocks.cambiarEstado).mockRejectedValue(new CotizacionError('Transición de estado no permitida: FACTURADA → BORRADOR', 'INVALID_TRANSITION'));

    const token = await generateAccessToken({
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/cotizaciones/1/estado', {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ estado: 'BORRADOR' }),
    });

    const response = await patchEstado(request, { params: { id: '1' } });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/Transición de estado no permitida/);
  });

  it('Cancelar cotización facturada (400) con mensaje sobre movimiento asociado', async () => {
    const __cotizacionMocks = (cotizacionServiceModule as any).__cotizacionMocks;
    vi.mocked(__cotizacionMocks.cambiarEstado).mockRejectedValue(
      new Error('Esta cotización ya tiene un movimiento asociado. Rechaza el movimiento antes de cancelar.'),
    );

    const token = await generateAccessToken({
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/cotizaciones/1/estado', {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ estado: 'CANCELADA' }),
    });

    const response = await patchEstado(request, { params: { id: '1' } });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/movimiento asociado/);
  });

  it('Acceso tenant — usuario sin acceso no puede ver cotización (403)', async () => {
    const __cotizacionMocks = (cotizacionServiceModule as any).__cotizacionMocks;
    const CotizacionError = (cotizacionServiceModule as any).CotizacionError;
    vi.mocked(__cotizacionMocks.obtener).mockRejectedValue(new CotizacionError('No tienes acceso a esta cotización', 'FORBIDDEN'));

    const token = await generateAccessToken({
      userId: 3,
      email: 'socio@onebusiness.test',
      rol: 'Socio',
      negocios: [2],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/cotizaciones/1', { headers: { authorization: `Bearer ${token}` } });
    const response = await getById(request, { params: { id: '1' } });
    expect(response.status).toBe(403);
  });

  it('Externo puede crear (201)', async () => {
    const __cotizacionMocks = (cotizacionServiceModule as any).__cotizacionMocks;
    vi.mocked(__cotizacionMocks.crear).mockResolvedValue(makeCotizacion());

    const token = await generateAccessToken({
      userId: 4,
      email: 'externo@onebusiness.test',
      rol: 'Externo',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/cotizaciones', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        negocioId: 1,
        clienteNombre: 'Cliente',
        fecha: '2026-01-01',
        items: [{ descripcion: 'A', importe: 100 }],
      }),
    });

    const response = await postCotizaciones(request);
    expect(response.status).toBe(201);
  });

  it('Externo no puede actualizar (403)', async () => {
    const __cotizacionMocks = (cotizacionServiceModule as any).__cotizacionMocks;
    const token = await generateAccessToken({
      userId: 4,
      email: 'externo@onebusiness.test',
      rol: 'Externo',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/cotizaciones/1', {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ clienteNombre: 'Nuevo' }),
    });

    const response = await patchById(request, { params: { id: '1' } });
    expect(response.status).toBe(403);
    expect(vi.mocked(__cotizacionMocks.actualizar)).not.toHaveBeenCalled();
  });

  it('Solo Dueño/Admin puede aprobar — Socio intenta aprobar (403)', async () => {
    const __cotizacionMocks = (cotizacionServiceModule as any).__cotizacionMocks;
    const CotizacionError = (cotizacionServiceModule as any).CotizacionError;
    vi.mocked(__cotizacionMocks.cambiarEstado).mockRejectedValue(new CotizacionError('Solo Dueño y Admin pueden aprobar cotizaciones', 'FORBIDDEN'));

    const token = await generateAccessToken({
      userId: 2,
      email: 'socio@onebusiness.test',
      rol: 'Socio',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/cotizaciones/1/estado', {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ estado: 'APROBADA', numeroOc: 'OC-1' }),
    });

    const response = await patchEstado(request, { params: { id: '1' } });
    expect(response.status).toBe(403);
  });
});
