import { describe, expect, it } from 'vitest';

import { authorizeRequest, getRequiredPermission, hasPermission } from '@/middleware/permissions';

describe('Permissions middleware', () => {
  it('hasPermission_Dueño_write', () => {
    expect(hasPermission('Dueño', 'write')).toBe(true);
  });

  it('hasPermission_Externo_write', () => {
    expect(hasPermission('Externo', 'write')).toBe(false);
  });

  it('hasPermission_Externo_read', () => {
    expect(hasPermission('Externo', 'read')).toBe(true);
  });

  it('hasPermission_Socio_export', () => {
    expect(hasPermission('Socio', 'export')).toBe(false);
  });

  it('getRequiredPermission_POST', () => {
    expect(getRequiredPermission('POST')).toBe('write');
  });

  it('getRequiredPermission_GET', () => {
    expect(getRequiredPermission('GET')).toBe('read');
  });

  it('authorizeRequest bloquea si no está autenticado', () => {
    const result = authorizeRequest({ success: false, error: 'Token requerido' }, 'GET');
    expect(result.authorized).toBe(false);
  });

  it('authorizeRequest bloquea rol desconocido por defecto', () => {
    const result = authorizeRequest(
      {
        success: true,
        user: { userId: 1, email: 'x@x.com', rol: 'Otro', negocios: [1] },
      },
      'GET'
    );
    expect(result.authorized).toBe(false);
  });

  it('authorizeRequest bloquea Externo en métodos de escritura', () => {
    const auth = {
      success: true as const,
      user: { userId: 4, email: 'externo@onebusiness.test', rol: 'Externo', negocios: [1] },
    };

    expect(authorizeRequest(auth, 'POST').authorized).toBe(false);
    expect(authorizeRequest(auth, 'PUT').authorized).toBe(false);
    expect(authorizeRequest(auth, 'PATCH').authorized).toBe(false);
    expect(authorizeRequest(auth, 'DELETE').authorized).toBe(false);
  });
});
