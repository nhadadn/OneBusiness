// src/lib/rate-limiter.ts
//
// Rate limiter en memoria — single instance.
// Interfaz estable: migrar a Redis solo requiere
// reemplazar el store interno, no los callers.

interface RateLimitEntry {
  count: number;
  resetAt: number;
  blockedUntil?: number;
}

interface RateLimitConfig {
  windowMs: number; // Ventana de tiempo en ms
  maxAttempts: number; // Intentos permitidos en la ventana
  blockDurationMs: number; // Bloqueo tras exceder el límite
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  blockedUntil?: number;
  retryAfterSeconds?: number;
}

// Store en memoria — una entrada por identificador (IP, email, etc.)
const store = new Map<string, RateLimitEntry>();

// Limpieza periódica para evitar memory leak en servidores
// de larga duración. Solo se registra si setInterval existe
// (no en entornos de test que mockean timers).
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of Array.from(store.entries())) {
        const expired = entry.resetAt < now && (!entry.blockedUntil || entry.blockedUntil < now);
        if (expired) store.delete(key);
      }
    },
    5 * 60 * 1000 // cada 5 minutos
  );
}

export function checkRateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = store.get(identifier);

  // Caso 1: está bloqueado activamente
  if (entry?.blockedUntil && entry.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      blockedUntil: entry.blockedUntil,
      retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000),
    };
  }

  // Caso 2: ventana expirada o primera vez → resetear
  if (!entry || entry.resetAt < now) {
    store.set(identifier, { count: 1, resetAt: now + config.windowMs });
    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetAt: now + config.windowMs,
    };
  }

  // Caso 3: dentro de la ventana → incrementar
  entry.count += 1;

  if (entry.count > config.maxAttempts) {
    entry.blockedUntil = now + config.blockDurationMs;
    store.set(identifier, entry);
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      blockedUntil: entry.blockedUntil,
      retryAfterSeconds: Math.ceil(config.blockDurationMs / 1000),
    };
  }

  store.set(identifier, entry);
  return {
    allowed: true,
    remaining: config.maxAttempts - entry.count,
    resetAt: entry.resetAt,
  };
}

// Limpiar una entrada específica (útil en tests y en login exitoso)
export function resetRateLimit(identifier: string): void {
  store.delete(identifier);
}

// Configuraciones predefinidas
export const RATE_LIMIT_CONFIGS = {
  // Login: 5 intentos / 15 min → bloqueo 15 min
  LOGIN: {
    windowMs: 15 * 60 * 1000,
    maxAttempts: 5,
    blockDurationMs: 15 * 60 * 1000,
  },
  // Refresh: 20 intentos / 1 min → bloqueo 5 min
  // Más permisivo porque el refresh es automático (silencioso)
  REFRESH: {
    windowMs: 60 * 1000,
    maxAttempts: 20,
    blockDurationMs: 5 * 60 * 1000,
  },
} satisfies Record<string, RateLimitConfig>;

// Helper: obtener IP del cliente desde headers de Next.js
// Soporta Vercel, Cloudflare y proxies estándar
export function getClientIP(headers: Headers | { get: (key: string) => string | null }): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0];
    if (first) return first.trim();
  }

  const cf = headers.get('cf-connecting-ip');
  if (cf) return cf;

  const real = headers.get('x-real-ip');
  if (real) return real;

  return 'unknown';
}
