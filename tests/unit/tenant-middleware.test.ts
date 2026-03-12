import { describe, expect, it } from 'vitest';

import { extractNegocioId, TenantError, validateTenantAccess } from '@/middleware/tenant-middleware';

describe('Tenant middleware', () => {
  it('extrae negocioId desde header x-negocio-id', () => {
    const request = new Request('http://localhost/api/test', { headers: { 'x-negocio-id': '123' } });
    expect(extractNegocioId(request)).toBe(123);
  });

  it('extrae negocioId desde query param negocioId', () => {
    const request = new Request('http://localhost/api/test?negocioId=55');
    expect(extractNegocioId(request)).toBe(55);
  });

  it('retorna null si no se provee negocioId', () => {
    const request = new Request('http://localhost/api/test');
    expect(extractNegocioId(request)).toBeNull();
  });

  it('Dueño puede omitir negocioId', () => {
    const request = new Request('http://localhost/api/test');
    const ctx = validateTenantAccess(request, {
      userId: 1,
      email: 'dueno@onebusiness.test',
      rol: 'Dueño',
      negocios: [1, 2, 3],
    });

    expect(ctx.isOwner).toBe(true);
    expect(ctx.negocioId).toBeNull();
  });

  it('Usuario no Dueño sin negocioId retorna SIN_NEGOCIO', () => {
    const request = new Request('http://localhost/api/test');
    expect(() =>
      validateTenantAccess(request, {
        userId: 2,
        email: 'socio@onebusiness.test',
        rol: 'Socio',
        negocios: [1],
      })
    ).toThrowError(TenantError);
  });

  it('Usuario no Dueño sin acceso retorna ACCESO_DENEGADO', () => {
    const request = new Request('http://localhost/api/test', { headers: { 'x-negocio-id': '9' } });
    try {
      validateTenantAccess(request, {
        userId: 2,
        email: 'socio@onebusiness.test',
        rol: 'Socio',
        negocios: [1],
      });
      expect(false).toBe(true);
    } catch (error) {
      expect(error).toBeInstanceOf(TenantError);
      expect((error as TenantError).code).toBe('ACCESO_DENEGADO');
    }
  });

  it('Usuario no Dueño con acceso retorna contexto con negocioId', () => {
    const request = new Request('http://localhost/api/test', { headers: { 'x-negocio-id': '1' } });
    const ctx = validateTenantAccess(request, {
      userId: 2,
      email: 'socio@onebusiness.test',
      rol: 'Socio',
      negocios: [1, 2],
    });

    expect(ctx.isOwner).toBe(false);
    expect(ctx.negocioId).toBe(1);
  });

  it('negocioId inválido en header o query retorna NEGOCIO_INVALIDO', () => {
    const request = new Request('http://localhost/api/test?negocioId=abc');
    try {
      validateTenantAccess(request, {
        userId: 2,
        email: 'socio@onebusiness.test',
        rol: 'Socio',
        negocios: [1],
      });
      expect(false).toBe(true);
    } catch (error) {
      expect(error).toBeInstanceOf(TenantError);
      expect((error as TenantError).code).toBe('NEGOCIO_INVALIDO');
    }
  });
});

