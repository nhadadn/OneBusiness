import { and, eq, inArray, ne, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { roles, usuarioNegocio, usuarios } from '@/lib/drizzle';
import { hashPassword } from '@/services/auth.service';
import type { RoleName } from '@/types/permissions.types';
import type { CreateUsuarioData, UpdateUsuarioData, UsuarioDetail, UsuarioListItem } from '@/types/usuario.types';

export type { CreateUsuarioData, UpdateUsuarioData, UsuarioDetail, UsuarioListItem } from '@/types/usuario.types';

export interface GetUsuariosFiltros {
  negocioId?: number;
  rol?: RoleName;
  activo?: boolean;
}

function groupNegociosByUsuarioId(rows: Array<{ usuarioId: number; negocioId: number }>): Map<number, number[]> {
  const map = new Map<number, number[]>();
  for (const row of rows) {
    const current = map.get(row.usuarioId);
    if (current) {
      current.push(row.negocioId);
      continue;
    }
    map.set(row.usuarioId, [row.negocioId]);
  }
  return map;
}

export async function getUsuarios(
  filtros: GetUsuariosFiltros,
  userContext: { rol: RoleName; negocios: number[] }
): Promise<UsuarioListItem[]> {
  if (userContext.rol !== 'Dueño') {
    if (filtros.negocioId === undefined) {
      throw new Error('Negocio requerido');
    }
    if (!userContext.negocios.includes(filtros.negocioId)) {
      throw new Error('Sin acceso a este negocio');
    }
  }

  const baseSelect = {
    id: usuarios.id,
    nombreCompleto: usuarios.nombreCompleto,
    email: usuarios.email,
    activo: usuarios.activo,
    rol: roles.nombre,
  } as const;

  const whereParts: Array<ReturnType<typeof eq>> = [];

  if (filtros.activo !== undefined) {
    whereParts.push(eq(usuarios.activo, filtros.activo));
  }

  if (filtros.rol) {
    whereParts.push(eq(roles.nombre, filtros.rol));
  }

  const hasNegocioFilter = filtros.negocioId !== undefined;

  const rows = hasNegocioFilter
    ? await db
        .select(baseSelect)
        .from(usuarios)
        .innerJoin(roles, eq(usuarios.rolId, roles.id))
        .innerJoin(usuarioNegocio, eq(usuarioNegocio.usuarioId, usuarios.id))
        .where(
          and(eq(usuarioNegocio.negocioId, filtros.negocioId as number), ...(whereParts.length ? whereParts : []))
        )
    : whereParts.length
      ? await db
          .select(baseSelect)
          .from(usuarios)
          .innerJoin(roles, eq(usuarios.rolId, roles.id))
          .where(and(...whereParts))
      : await db.select(baseSelect).from(usuarios).innerJoin(roles, eq(usuarios.rolId, roles.id));

  const usuarioIds = rows.map((r) => r.id);
  if (usuarioIds.length === 0) {
    return [];
  }

  const asignaciones = await db
    .select({ usuarioId: usuarioNegocio.usuarioId, negocioId: usuarioNegocio.negocioId })
    .from(usuarioNegocio)
    .where(inArray(usuarioNegocio.usuarioId, usuarioIds));

  const negociosByUsuarioId = groupNegociosByUsuarioId(asignaciones);

  return rows.map((row) => ({
    id: row.id,
    nombreCompleto: row.nombreCompleto,
    email: row.email,
    activo: row.activo ?? true,
    rol: row.rol,
    negocios: negociosByUsuarioId.get(row.id) ?? [],
  }));
}

export async function getUsuarioById(id: number): Promise<UsuarioDetail | null> {
  const row = await db
    .select({
      id: usuarios.id,
      nombreCompleto: usuarios.nombreCompleto,
      email: usuarios.email,
      activo: usuarios.activo,
      rolId: usuarios.rolId,
      rol: roles.nombre,
      createdAt: usuarios.createdAt,
      updatedAt: usuarios.updatedAt,
    })
    .from(usuarios)
    .innerJoin(roles, eq(usuarios.rolId, roles.id))
    .where(eq(usuarios.id, id))
    .limit(1);

  const usuario = row[0];
  if (!usuario) return null;

  const negociosAsignados = await db
    .select({ negocioId: usuarioNegocio.negocioId })
    .from(usuarioNegocio)
    .where(eq(usuarioNegocio.usuarioId, id));

  return {
    ...usuario,
    negocios: negociosAsignados.map((n) => n.negocioId),
  };
}

export async function createUsuario(data: CreateUsuarioData): Promise<UsuarioDetail> {
  const existeEmail = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, data.email))
    .limit(1);

  if (existeEmail[0]) {
    throw new Error('El email ya está registrado');
  }

  const passwordHash = await hashPassword(data.password);

  const inserted = await db
    .insert(usuarios)
    .values({
      nombreCompleto: data.nombreCompleto,
      email: data.email,
      passwordHash,
      rolId: data.rolId,
      activo: true,
      updatedAt: new Date(),
    })
    .returning({ id: usuarios.id });

  const newId = inserted[0]?.id;
  if (!newId) {
    throw new Error('No se pudo crear el usuario');
  }

  if (data.negocios.length > 0) {
    await db.insert(usuarioNegocio).values(
      data.negocios.map((negocioId) => ({
        usuarioId: newId,
        negocioId,
      }))
    );
  }

  const created = await getUsuarioById(newId);
  if (!created) {
    throw new Error('No se pudo obtener el usuario creado');
  }

  return created;
}

export async function updateUsuario(id: number, data: UpdateUsuarioData): Promise<UsuarioDetail> {
  const existe = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.id, id)).limit(1);
  if (!existe[0]) {
    throw new Error('Usuario no encontrado');
  }

  if (data.email) {
    const emailExiste = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(and(eq(usuarios.email, data.email), ne(usuarios.id, id)))
      .limit(1);

    if (emailExiste[0]) {
      throw new Error('El email ya está en uso');
    }
  }

  const updateData: Partial<typeof usuarios.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.nombreCompleto !== undefined) updateData.nombreCompleto = data.nombreCompleto;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.rolId !== undefined) updateData.rolId = data.rolId;
  if (data.activo !== undefined) updateData.activo = data.activo;
  if (data.password !== undefined) {
    updateData.passwordHash = await hashPassword(data.password);
  }

  await db.update(usuarios).set(updateData).where(eq(usuarios.id, id));

  const updated = await getUsuarioById(id);
  if (!updated) {
    throw new Error('Usuario no encontrado');
  }

  return updated;
}

export async function deleteUsuario(id: number): Promise<{ success: true }> {
  const userRows = await db.select({ id: usuarios.id, rolId: usuarios.rolId }).from(usuarios).where(eq(usuarios.id, id)).limit(1);
  const user = userRows[0];
  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  const rolRows = await db.select({ nombre: roles.nombre }).from(roles).where(eq(roles.id, user.rolId)).limit(1);
  const rol = rolRows[0];

  if (rol?.nombre === 'Dueño') {
    const rolDuenoRows = await db.select({ id: roles.id }).from(roles).where(eq(roles.nombre, 'Dueño')).limit(1);
    const duenoRoleId = rolDuenoRows[0]?.id;
    if (!duenoRoleId) {
      throw new Error('Rol Dueño no encontrado');
    }

    const duenosActivos = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(and(eq(usuarios.rolId, duenoRoleId), eq(usuarios.activo, true)));

    if (duenosActivos.length <= 1) {
      throw new Error('No se puede desactivar el último Dueño activo');
    }
  }

  await db.update(usuarios).set({ activo: false, updatedAt: new Date() }).where(eq(usuarios.id, id));
  return { success: true };
}

export async function assignNegociosToUsuario(id: number, negocios: number[]): Promise<UsuarioDetail> {
  const existe = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.id, id)).limit(1);
  if (!existe[0]) {
    throw new Error('Usuario no encontrado');
  }

  const uniqueNegocios = Array.from(new Set(negocios)).filter((n) => Number.isInteger(n) && n > 0);
  if (uniqueNegocios.length === 0) {
    throw new Error('Al menos un negocio requerido');
  }

  await db.transaction(async (tx) => {
    await tx.delete(usuarioNegocio).where(eq(usuarioNegocio.usuarioId, id));

    await tx.insert(usuarioNegocio).values(
      uniqueNegocios.map((negocioId) => ({
        usuarioId: id,
        negocioId,
      }))
    );

    await tx
      .update(usuarios)
      .set({ tokenVersion: sql`${usuarios.tokenVersion} + 1`, updatedAt: new Date() })
      .where(eq(usuarios.id, id));
  });

  const updated = await getUsuarioById(id);
  if (!updated) {
    throw new Error('Usuario no encontrado');
  }
  return updated;
}

