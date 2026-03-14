import { describe, expect, it } from 'vitest';

import { checkRateLimit, getClientIP, RATE_LIMIT_CONFIGS, resetRateLimit } from '@/lib/rate-limiter';

describe('RateLimiter', () => {
  describe('checkRateLimit — comportamiento básico', () => {
    it('permite el primer intento', () => {
      const result = checkRateLimit('test-basic-1', RATE_LIMIT_CONFIGS.LOGIN);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(RATE_LIMIT_CONFIGS.LOGIN.maxAttempts - 1);
    });

    it('permite intentos dentro del límite', () => {
      const id = 'test-within-limit';
      for (let i = 0; i < RATE_LIMIT_CONFIGS.LOGIN.maxAttempts - 1; i++) {
        const result = checkRateLimit(id, RATE_LIMIT_CONFIGS.LOGIN);
        expect(result.allowed).toBe(true);
      }
    });

    it('bloquea al exceder el límite', () => {
      const id = 'test-exceed-limit';
      for (let i = 0; i < RATE_LIMIT_CONFIGS.LOGIN.maxAttempts; i++) {
        checkRateLimit(id, RATE_LIMIT_CONFIGS.LOGIN);
      }
      const result = checkRateLimit(id, RATE_LIMIT_CONFIGS.LOGIN);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('mantiene el bloqueo en intentos posteriores', () => {
      const id = 'test-stays-blocked';
      for (let i = 0; i <= RATE_LIMIT_CONFIGS.LOGIN.maxAttempts; i++) {
        checkRateLimit(id, RATE_LIMIT_CONFIGS.LOGIN);
      }
      expect(checkRateLimit(id, RATE_LIMIT_CONFIGS.LOGIN).allowed).toBe(false);
      expect(checkRateLimit(id, RATE_LIMIT_CONFIGS.LOGIN).allowed).toBe(false);
    });
  });

  describe('resetRateLimit', () => {
    it('limpia el contador y permite intentos de nuevo', () => {
      const id = 'test-reset';
      for (let i = 0; i <= RATE_LIMIT_CONFIGS.LOGIN.maxAttempts; i++) {
        checkRateLimit(id, RATE_LIMIT_CONFIGS.LOGIN);
      }
      expect(checkRateLimit(id, RATE_LIMIT_CONFIGS.LOGIN).allowed).toBe(false);

      resetRateLimit(id);

      expect(checkRateLimit(id, RATE_LIMIT_CONFIGS.LOGIN).allowed).toBe(true);
    });
  });

  describe('RATE_LIMIT_CONFIGS', () => {
    it('LOGIN tiene maxAttempts = 5', () => {
      expect(RATE_LIMIT_CONFIGS.LOGIN.maxAttempts).toBe(5);
    });

    it('REFRESH es más permisivo que LOGIN', () => {
      expect(RATE_LIMIT_CONFIGS.REFRESH.maxAttempts).toBeGreaterThan(RATE_LIMIT_CONFIGS.LOGIN.maxAttempts);
    });
  });

  describe('getClientIP', () => {
    it('extrae IP de x-forwarded-for', () => {
      const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
      expect(getClientIP(headers)).toBe('1.2.3.4');
    });

    it('retorna "unknown" si no hay headers de IP', () => {
      const headers = new Headers();
      expect(getClientIP(headers)).toBe('unknown');
    });
  });
});
