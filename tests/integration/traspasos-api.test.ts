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
  crearTraspasoBancario: vi.fn(),
}));

vi.mock('@/services/movimiento.service', () => {
  return {
    MovimientoService: vi.fn().mockImplementation(() => movimientoServiceMocks),
  };
});

import { generateAccessToken } from '@/lib/jwt';
import { POST as traspasosPost } from '@/app/api/traspasos/route';

describe('Traspasos /api/traspasos integration (handlers)', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = '01234567890123456789012345678901';
    vi.resetAllMocks();
  });

  it('POST retorna 401 sin token', async () => {
    const request = new Request('http://localhost/api/traspasos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const response = await traspasosPost(request);
    expect(response.status).toBe(401);
  });

  it('POST retorna 400 si cuentaOrigen === cuentaDestino', async () => {
    const token = await generateAccessToken({
      userId: 2,
      email: 'admin@onebusiness.test',
      rol: 'Admin',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/traspasos', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        negocioId: 1,
        cuentaOrigenId: 10,
        cuentaDestinoId: 10,
        monto: 100,
        concepto: 'Traspaso',
        fecha: '2026-01-01',
      }),
    });

    const response = await traspasosPost(request);
    expect(response.status).toBe(400);
    expect(movimientoServiceMocks.crearTraspasoBancario).not.toHaveBeenCalled();
  });

  it('POST retorna 400 si monto <= 0', async () => {
    const token = await generateAccessToken({
      userId: 2,
      email: 'admin@onebusiness.test',
      rol: 'Admin',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/traspasos', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        negocioId: 1,
        cuentaOrigenId: 10,
        cuentaDestinoId: 11,
        monto: 0,
        concepto: 'Traspaso',
        fecha: '2026-01-01',
      }),
    });

    const response = await traspasosPost(request);
    expect(response.status).toBe(400);
    expect(movimientoServiceMocks.crearTraspasoBancario).not.toHaveBeenCalled();
  });

  it('POST retorna 201 con ambos movimientos y vínculo correcto', async () => {
    movimientoServiceMocks.crearTraspasoBancario.mockResolvedValue({
      movimientoOrigen: { id: 100, traspasoRefId: 101 },
      movimientoDestino: { id: 101, traspasoRefId: 100 },
    });

    const token = await generateAccessToken({
      userId: 2,
      email: 'admin@onebusiness.test',
      rol: 'Admin',
      negocios: [1],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/traspasos', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        negocioId: 1,
        cuentaOrigenId: 10,
        cuentaDestinoId: 11,
        monto: 250,
        concepto: 'Traspaso nómina',
        fecha: '2026-01-01',
      }),
    });

    const response = await traspasosPost(request);
    expect(response.status).toBe(201);

    const json = (await response.json()) as { success: boolean; data: any };
    expect(json.success).toBe(true);
    expect(json.data.movimientoOrigen.traspasoRefId).toBe(json.data.movimientoDestino.id);
    expect(json.data.movimientoDestino.traspasoRefId).toBe(json.data.movimientoOrigen.id);
  });
});

