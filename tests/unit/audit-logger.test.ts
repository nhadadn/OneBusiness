import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

import { auditLog, getRequestContext } from '@/lib/audit-logger';

describe('auditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registra un evento exitoso sin lanzar excepción', async () => {
    await expect(
      auditLog({
        evento: 'LOGIN_SUCCESS',
        exitoso: true,
        userId: 1,
        recurso: '/api/auth/login',
      })
    ).resolves.toBeUndefined();
  });

  it('NO lanza excepción si la BD falla (fire-and-forget)', async () => {
    const { db } = await import('@/lib/db');

    vi.mocked(db.insert).mockReturnValueOnce({
      values: vi.fn().mockRejectedValueOnce(new Error('DB connection lost')),
    } as never);

    await expect(
      auditLog({
        evento: 'LOGIN_FAILURE',
        exitoso: false,
      })
    ).resolves.toBeUndefined();
  });

  it('trunca userAgent a 300 caracteres', async () => {
    const { db } = await import('@/lib/db');

    const valuesMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(db.insert).mockReturnValueOnce({
      values: valuesMock,
    } as never);

    const longUserAgent = 'A'.repeat(400);
    await auditLog({
      evento: 'LOGIN_SUCCESS',
      exitoso: true,
      userAgent: longUserAgent,
    });

    const insertedData = valuesMock.mock.calls[0]?.[0] as { userAgent?: string } | undefined;
    expect(insertedData?.userAgent?.length).toBeLessThanOrEqual(300);
  });

  it('nunca incluye passwords en detalles', async () => {
    const { db } = await import('@/lib/db');

    const valuesMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(db.insert).mockReturnValueOnce({
      values: valuesMock,
    } as never);

    await auditLog({
      evento: 'LOGIN_FAILURE',
      exitoso: false,
      detalles: { email: 'user@test.com', password: 'secret', token: 'abc' },
    });

    const insertedData = valuesMock.mock.calls[0]?.[0] as { detalles?: string } | undefined;
    const detallesStr = insertedData?.detalles ?? '';
    expect(detallesStr).not.toContain('password');
    expect(detallesStr).not.toContain('contraseña');
    expect(detallesStr).not.toContain('token');
  });
});

describe('getRequestContext', () => {
  it('extrae IP de x-forwarded-for', () => {
    const req = new Request('http://localhost/test', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    const ctx = getRequestContext(req);
    expect(ctx.ipAddress).toBe('1.2.3.4');
  });

  it('retorna "unknown" si no hay headers de IP', () => {
    const req = new Request('http://localhost/test');
    const ctx = getRequestContext(req);
    expect(ctx.ipAddress).toBe('unknown');
  });

  it('genera requestId si no viene en headers', () => {
    const req = new Request('http://localhost/test');
    const ctx = getRequestContext(req);
    expect(ctx.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});
