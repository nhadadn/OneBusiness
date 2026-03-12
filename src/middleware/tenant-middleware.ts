import type { TenantContext, TenantUser } from '@/types/tenant.types';

export class TenantError extends Error {
  constructor(
    message: string,
    public code: 'ACCESO_DENEGADO' | 'SIN_NEGOCIO' | 'NEGOCIO_INVALIDO'
  ) {
    super(message);
    this.name = 'TenantError';
  }
}

function parseNegocioId(raw: string): number | null {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export function extractNegocioId(request: Request): number | null {
  const headerNegocioId = request.headers.get('x-negocio-id');
  if (headerNegocioId) {
    return parseNegocioId(headerNegocioId);
  }

  const url = new URL(request.url);
  const queryNegocioId = url.searchParams.get('negocioId');
  if (queryNegocioId) {
    return parseNegocioId(queryNegocioId);
  }

  return null;
}

export function validateTenantAccess(request: Request, user: TenantUser): TenantContext {
  const isOwner = user.rol === 'Dueño';
  const rawHeader = request.headers.get('x-negocio-id');
  const rawQuery = new URL(request.url).searchParams.get('negocioId');

  const negocioId = extractNegocioId(request);

  if ((rawHeader || rawQuery) && negocioId === null) {
    throw new TenantError('NEGOCIO_INVALIDO: negocioId inválido', 'NEGOCIO_INVALIDO');
  }

  if (isOwner) {
    return {
      negocioId,
      isOwner: true,
      negociosAccesibles: user.negocios,
    };
  }

  if (negocioId === null) {
    throw new TenantError('SIN_NEGOCIO: Negocio requerido', 'SIN_NEGOCIO');
  }

  if (!user.negocios.includes(negocioId)) {
    throw new TenantError('ACCESO_DENEGADO: No tienes acceso a este negocio', 'ACCESO_DENEGADO');
  }

  return {
    negocioId,
    isOwner: false,
    negociosAccesibles: user.negocios,
  };
}

