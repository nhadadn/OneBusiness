import { eq, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import { negocios } from '@/lib/drizzle';
import type { RoleName } from '@/types/permissions.types';
import type { NegocioListItem } from '@/types/negocio.types';

export async function getNegocios(
  filtros: { negocioId?: number },
  userContext: { rol: RoleName; negocios: number[] }
): Promise<NegocioListItem[]> {
  const baseSelect = {
    id: negocios.id,
    nombre: negocios.nombre,
    rubro: negocios.rubro,
    modeloIngreso: negocios.modeloIngreso,
    tieneSocios: negocios.tieneSocios,
    activo: negocios.activo,
  } as const;

  if (userContext.rol === 'Dueño') {
    if (typeof filtros.negocioId === 'number') {
      return db.select(baseSelect).from(negocios).where(eq(negocios.id, filtros.negocioId));
    }
    return db.select(baseSelect).from(negocios);
  }

  if (typeof filtros.negocioId === 'number') {
    if (!userContext.negocios.includes(filtros.negocioId)) {
      throw new Error('Sin acceso a este negocio');
    }
    return db.select(baseSelect).from(negocios).where(eq(negocios.id, filtros.negocioId));
  }

  if (userContext.negocios.length === 0) {
    return [];
  }

  return db.select(baseSelect).from(negocios).where(inArray(negocios.id, userContext.negocios));
}

export async function updateNegocioUmbrales(
  negocioId: number,
  input: { umbralAlerta: number | null; umbralCritico: number | null }
) {
  const [updated] = await db
    .update(negocios)
    .set({
      umbralAlerta: input.umbralAlerta === null ? null : input.umbralAlerta.toString(),
      umbralCritico: input.umbralCritico === null ? null : input.umbralCritico.toString(),
      updatedAt: new Date(),
    })
    .where(eq(negocios.id, negocioId))
    .returning({
      id: negocios.id,
      nombre: negocios.nombre,
      rubro: negocios.rubro,
      modeloIngreso: negocios.modeloIngreso,
      tieneSocios: negocios.tieneSocios,
      activo: negocios.activo,
      umbralAlerta: negocios.umbralAlerta,
      umbralCritico: negocios.umbralCritico,
      updatedAt: negocios.updatedAt,
    });

  return updated ?? null;
}
