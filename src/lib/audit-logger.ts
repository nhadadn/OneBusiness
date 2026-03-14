import { randomUUID } from 'crypto';

import { db } from '@/lib/db';
import { auditLogs } from '@/lib/drizzle';

export type AuditEvento =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'TOKEN_REFRESH_SUCCESS'
  | 'TOKEN_REFRESH_FAILURE'
  | 'REPLAY_ATTACK_DETECTED'
  | 'ACCESS_DENIED'
  | 'RATE_LIMIT_HIT'
  | 'MOVIMIENTO_CREADO'
  | 'MOVIMIENTO_APROBADO'
  | 'MOVIMIENTO_RECHAZADO'
  | 'MOVIMIENTO_ELIMINADO'
  | 'USUARIO_CREADO'
  | 'ROL_CAMBIADO'
  | 'NEGOCIO_ASIGNADO';

export interface AuditLogParams {
  evento: AuditEvento;
  exitoso: boolean;
  userId?: number | null;
  negocioId?: number | null;
  recurso?: string;
  recursoId?: string | number | null;
  detalles?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

function sanitizeDetalles(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((v) => sanitizeDetalles(v));
  }

  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('password') || lowerKey.includes('contraseña') || lowerKey.includes('contrasena')) {
      continue;
    }
    if (lowerKey.includes('token') || lowerKey.includes('authorization') || lowerKey.includes('cookie')) {
      continue;
    }
    out[key] = sanitizeDetalles(val);
  }

  return out;
}

export async function auditLog(params: AuditLogParams): Promise<void> {
  try {
    const userAgentTruncated = params.userAgent ? params.userAgent.slice(0, 300) : null;

    const detallesJson = params.detalles ? JSON.stringify(sanitizeDetalles(params.detalles)) : null;

    await db.insert(auditLogs).values({
      userId: params.userId ?? null,
      negocioId: params.negocioId ?? null,
      evento: params.evento,
      recurso: params.recurso ?? null,
      recursoId: params.recursoId != null ? String(params.recursoId) : null,
      exitoso: params.exitoso,
      detalles: detallesJson,
      ipAddress: params.ipAddress ?? null,
      userAgent: userAgentTruncated,
      requestId: params.requestId ?? randomUUID(),
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[AuditLog] Failed to write audit log', {
        evento: params.evento,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export function getRequestContext(request: Request): { ipAddress: string; userAgent: string; requestId: string } {
  const forwarded = request.headers.get('x-forwarded-for');
  const cf = request.headers.get('cf-connecting-ip');
  const real = request.headers.get('x-real-ip');

  const ipAddress = (forwarded ? forwarded.split(',')[0]?.trim() : null) ?? cf ?? real ?? 'unknown';
  const userAgent = request.headers.get('user-agent') ?? 'unknown';
  const requestId = request.headers.get('x-request-id') ?? randomUUID();

  return { ipAddress, userAgent, requestId };
}
