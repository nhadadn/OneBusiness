import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { roles, usuarioNegocio, usuarios } from '@/lib/drizzle';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '@/lib/jwt';

const SALT_ROUNDS = process.env.NODE_ENV === 'test' ? 4 : 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function login(email: string, password: string) {
  const userRows = await db.select().from(usuarios).where(eq(usuarios.email, email)).limit(1);
  const user = userRows[0];

  if (!user) {
    return { success: false as const, error: 'Credenciales inválidas' };
  }

  if (!user.activo) {
    return { success: false as const, error: 'Usuario inactivo' };
  }

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    return { success: false as const, error: 'Credenciales inválidas' };
  }

  const rolRows = await db.select().from(roles).where(eq(roles.id, user.rolId)).limit(1);
  const rol = rolRows[0];

  if (!rol) {
    return { success: false as const, error: 'Rol no encontrado' };
  }

  const negociosAsignados = await db
    .select({ negocioId: usuarioNegocio.negocioId })
    .from(usuarioNegocio)
    .where(eq(usuarioNegocio.usuarioId, user.id));

  const negociosIds = negociosAsignados.map((n) => n.negocioId);

  const accessToken = await generateAccessToken({
    userId: user.id,
    email: user.email,
    rol: rol.nombre,
    negocios: negociosIds,
    tokenVersion: user.tokenVersion,
  });

  const refreshToken = await generateRefreshToken(user.id);

  await db.update(usuarios).set({ fechaUltimoAcceso: new Date() }).where(eq(usuarios.id, user.id));

  return {
    success: true as const,
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      nombre: user.nombreCompleto,
      email: user.email,
      rol: rol.nombre,
      negocios: negociosIds,
    },
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) {
    return { success: false as const, error: 'Refresh token inválido' };
  }

  const userRows = await db.select().from(usuarios).where(eq(usuarios.id, payload.userId)).limit(1);
  const user = userRows[0];

  if (!user || !user.activo) {
    return { success: false as const, error: 'Usuario no encontrado o inactivo' };
  }

  const rolRows = await db.select().from(roles).where(eq(roles.id, user.rolId)).limit(1);
  const rol = rolRows[0];

  if (!rol) {
    return { success: false as const, error: 'Rol no encontrado' };
  }

  const negociosAsignados = await db
    .select({ negocioId: usuarioNegocio.negocioId })
    .from(usuarioNegocio)
    .where(eq(usuarioNegocio.usuarioId, user.id));

  const negociosIds = negociosAsignados.map((n) => n.negocioId);

  const accessToken = await generateAccessToken({
    userId: user.id,
    email: user.email,
    rol: rol.nombre,
    negocios: negociosIds,
    tokenVersion: user.tokenVersion,
  });

  return { success: true as const, accessToken };
}
