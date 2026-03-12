import { describe, expect, it, vi } from 'vitest';

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

import {
  authenticateRequest,
  extractBearerToken,
  hasNegocioAccess,
  hasRole,
  unauthorizedResponse,
} from '@/middleware/auth-middleware';
import * as jwt from '@/lib/jwt';

describe('Auth middleware', () => {
  it('extrae token del header Authorization Bearer', () => {
    const request = new Request('http://localhost/api/test', {
      headers: { authorization: 'Bearer my-token-123' },
    });

    const token = extractBearerToken(request);
    expect(token).toBe('my-token-123');
  });

  it('retorna null si no hay Authorization o no es Bearer', () => {
    const req1 = new Request('http://localhost/api/test');
    const req2 = new Request('http://localhost/api/test', { headers: { authorization: 'Basic abc' } });

    expect(extractBearerToken(req1)).toBeNull();
    expect(extractBearerToken(req2)).toBeNull();
  });

  it('hasRole valida roles permitidos', () => {
    expect(hasRole('Dueño', ['Dueño', 'Admin'])).toBe(true);
    expect(hasRole('Externo', ['Dueño', 'Admin'])).toBe(false);
  });

  it('hasNegocioAccess permite Dueño en cualquier negocio', () => {
    expect(hasNegocioAccess([1], 999, 'Dueño')).toBe(true);
  });

  it('hasNegocioAccess valida asignación para roles no Dueño', () => {
    expect(hasNegocioAccess([1, 2, 3], 2, 'Socio')).toBe(true);
    expect(hasNegocioAccess([1, 2, 3], 9, 'Socio')).toBe(false);
  });

  it('authenticateRequest retorna error si falta token', async () => {
    const request = new Request('http://localhost/api/test');
    const result = await authenticateRequest(request);
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('authenticateRequest retorna error si verifyJWT retorna null', async () => {
    vi.spyOn(jwt, 'verifyJWT').mockResolvedValue(null);

    const request = new Request('http://localhost/api/test', {
      headers: { authorization: 'Bearer bad' },
    });

    const result = await authenticateRequest(request);
    expect(result.success).toBe(false);
  });

  it('authenticateRequest retorna user si token es válido', async () => {
    vi.spyOn(jwt, 'verifyJWT').mockResolvedValue({
      userId: 1,
      email: 'u@t.com',
      rol: 'Admin',
      negocios: [1, 2],
      tokenVersion: 0,
    });

    const request = new Request('http://localhost/api/test', {
      headers: { authorization: 'Bearer good' },
    });

    const result = await authenticateRequest(request);
    expect(result.success).toBe(true);
    expect(result.user?.email).toBe('u@t.com');
    expect(result.user?.rol).toBe('Admin');
    expect(result.user?.negocios).toEqual([1, 2]);
  });

  it('authenticateRequest retorna error genérico si verifyJWT lanza', async () => {
    vi.spyOn(jwt, 'verifyJWT').mockRejectedValue(new Error('boom'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const request = new Request('http://localhost/api/test', {
      headers: { authorization: 'Bearer any' },
    });

    const result = await authenticateRequest(request);
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('unauthorizedResponse retorna 401 con mensaje', async () => {
    const res = unauthorizedResponse('No autorizado');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('No autorizado');
  });
});

