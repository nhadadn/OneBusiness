import { and, eq } from 'drizzle-orm';
import type { AnyColumn, SQL } from 'drizzle-orm';

import type { TenantContext } from '@/types/tenant.types';
import { TenantError } from '@/middleware/tenant-middleware';

function isSql(value: SQL | undefined): value is SQL {
  return value !== undefined;
}

export function requireTenantNegocioId(tenant: TenantContext): number {
  if (tenant.negocioId === null) {
    throw new TenantError('SIN_NEGOCIO: Negocio requerido', 'SIN_NEGOCIO');
  }
  return tenant.negocioId;
}

export function tenantWhere(negocioIdColumn: AnyColumn, tenant: TenantContext): SQL {
  return eq(negocioIdColumn, requireTenantNegocioId(tenant));
}

export function tenantAnd(
  negocioIdColumn: AnyColumn,
  tenant: TenantContext,
  ...conditions: Array<SQL | undefined>
): SQL {
  const base = tenantWhere(negocioIdColumn, tenant);
  return and(base, ...conditions.filter(isSql)) ?? base;
}
