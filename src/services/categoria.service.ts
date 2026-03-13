import { and, asc, eq, isNull, ne, or } from 'drizzle-orm';

import { db } from '@/lib/db';
import { categorias } from '@/lib/drizzle';
import type { Categoria, CategoriaFormData, CategoriaUpdate } from '@/types/categoria.types';

type TipoCategoriaInput = 'ingreso' | 'egreso';
type TipoCategoriaDb = 'INGRESO' | 'EGRESO';

function isValidTipo(tipo: unknown): tipo is TipoCategoriaInput {
  return tipo === 'ingreso' || tipo === 'egreso';
}

function toDbTipo(tipo: unknown): TipoCategoriaDb | undefined {
  if (!isValidTipo(tipo)) return undefined;
  return tipo === 'ingreso' ? 'INGRESO' : 'EGRESO';
}

function normalizeNombre(nombre: string): string {
  return nombre.trim();
}

export class CategoriaService {
  async listarCategorias(negocioId: number, tipo?: TipoCategoriaInput): Promise<Categoria[]> {
    if (!Number.isFinite(negocioId) || Number.isNaN(negocioId) || negocioId <= 0) {
      throw new Error('negocioId inválido');
    }

    const tipoDb = toDbTipo(tipo);

    const globalConditions = [isNull(categorias.negocioId), eq(categorias.activa, true)];
    if (tipoDb) globalConditions.push(eq(categorias.tipo, tipoDb));

    const specificConditions = [eq(categorias.negocioId, negocioId), eq(categorias.activa, true)];
    if (tipoDb) specificConditions.push(eq(categorias.tipo, tipoDb));

    const globales = await db
      .select()
      .from(categorias)
      .where(and(...globalConditions))
      .orderBy(asc(categorias.nombre));

    const especificas = await db
      .select()
      .from(categorias)
      .where(and(...specificConditions))
      .orderBy(asc(categorias.nombre));

    return [...globales, ...especificas] as Categoria[];
  }

  async crearCategoria(negocioId: number, rol: string, data: CategoriaFormData): Promise<Categoria> {
    if (rol === 'Externo') {
      throw new Error('Sin permisos');
    }
    if (!Number.isFinite(negocioId) || Number.isNaN(negocioId) || negocioId <= 0) {
      throw new Error('negocioId inválido');
    }

    const nombre = normalizeNombre(data.nombre);
    if (!nombre) {
      throw new Error('Nombre inválido');
    }
    if (nombre.length > 100) {
      throw new Error('Nombre demasiado largo');
    }

    const tipoDb = toDbTipo(data.tipo);
    if (!tipoDb) {
      throw new Error('Tipo inválido');
    }

    const isGlobal = rol === 'Dueño' && data.esGlobal === true;
    const targetNegocioId = isGlobal ? null : negocioId;

    if (targetNegocioId === null && rol !== 'Dueño') {
      throw new Error('Sin permisos');
    }

    const existsWhere =
      targetNegocioId === null
        ? and(eq(categorias.nombre, nombre), isNull(categorias.negocioId), eq(categorias.activa, true))
        : and(eq(categorias.nombre, nombre), eq(categorias.negocioId, targetNegocioId), eq(categorias.activa, true));

    const existing = await db.select({ id: categorias.id }).from(categorias).where(existsWhere).limit(1);
    if (existing[0]) {
      throw new Error('Ya existe una categoría con ese nombre');
    }

    const [created] = await db
      .insert(categorias)
      .values({
        nombre,
        tipo: tipoDb,
        negocioId: targetNegocioId,
      })
      .returning();

    return created as Categoria;
  }

  async actualizarCategoria(categoriaId: number, negocioId: number, rol: string, data: CategoriaUpdate): Promise<Categoria> {
    if (rol === 'Externo') {
      throw new Error('Sin permisos');
    }
    if (!Number.isFinite(categoriaId) || Number.isNaN(categoriaId) || categoriaId <= 0) {
      throw new Error('ID inválido');
    }
    if (!Number.isFinite(negocioId) || Number.isNaN(negocioId) || negocioId <= 0) {
      throw new Error('negocioId inválido');
    }

    const [existing] = await db.select().from(categorias).where(eq(categorias.id, categoriaId)).limit(1);
    if (!existing || existing.activa !== true) {
      throw new Error('Categoría no encontrada');
    }

    const isGlobal = existing.negocioId === null;
    if (isGlobal && rol !== 'Dueño') {
      throw new Error('Solo el Dueño puede modificar categorías globales');
    }
    if (!isGlobal && existing.negocioId !== negocioId) {
      throw new Error('Sin acceso a esta categoría');
    }

    const update: Record<string, unknown> = {};

    if (typeof data.nombre === 'string') {
      const nombre = normalizeNombre(data.nombre);
      if (!nombre) throw new Error('Nombre inválido');
      if (nombre.length > 100) throw new Error('Nombre demasiado largo');

      if (nombre !== existing.nombre) {
        const existsWhere = isGlobal
          ? and(eq(categorias.nombre, nombre), isNull(categorias.negocioId), eq(categorias.activa, true), ne(categorias.id, categoriaId))
          : and(eq(categorias.nombre, nombre), eq(categorias.negocioId, negocioId), eq(categorias.activa, true), ne(categorias.id, categoriaId));

        const dup = await db.select({ id: categorias.id }).from(categorias).where(existsWhere).limit(1);
        if (dup[0]) {
          throw new Error('Ya existe una categoría con ese nombre');
        }
      }

      update.nombre = nombre;
    }

    if (typeof data.activa === 'boolean') {
      update.activa = data.activa;
    }

    if (Object.keys(update).length === 0) {
      return existing as Categoria;
    }

    update.updatedAt = new Date();

    const [updated] = await db.update(categorias).set(update).where(eq(categorias.id, categoriaId)).returning();
    return updated as Categoria;
  }

  async desactivarCategoria(categoriaId: number, negocioId: number, rol: string): Promise<Categoria> {
    if (rol === 'Externo') {
      throw new Error('Sin permisos');
    }
    if (!Number.isFinite(categoriaId) || Number.isNaN(categoriaId) || categoriaId <= 0) {
      throw new Error('ID inválido');
    }
    if (!Number.isFinite(negocioId) || Number.isNaN(negocioId) || negocioId <= 0) {
      throw new Error('negocioId inválido');
    }

    const [existing] = await db.select().from(categorias).where(eq(categorias.id, categoriaId)).limit(1);
    if (!existing) {
      throw new Error('Categoría no encontrada');
    }
    if (existing.activa !== true) {
      throw new Error('La categoría ya está desactivada');
    }

    const isGlobal = existing.negocioId === null;
    if (isGlobal && rol !== 'Dueño') {
      throw new Error('Solo el Dueño puede modificar categorías globales');
    }
    if (!isGlobal && existing.negocioId !== negocioId) {
      throw new Error('Sin acceso a esta categoría');
    }

    const [updated] = await db
      .update(categorias)
      .set({ activa: false, updatedAt: new Date() })
      .where(eq(categorias.id, categoriaId))
      .returning();

    return updated as Categoria;
  }

  async obtenerCategoriaPorId(categoriaId: number, negocioId: number): Promise<Categoria> {
    if (!Number.isFinite(categoriaId) || Number.isNaN(categoriaId) || categoriaId <= 0) {
      throw new Error('ID inválido');
    }
    if (!Number.isFinite(negocioId) || Number.isNaN(negocioId) || negocioId <= 0) {
      throw new Error('negocioId inválido');
    }

    const [categoria] = await db
      .select()
      .from(categorias)
      .where(
        and(
          eq(categorias.id, categoriaId),
          eq(categorias.activa, true),
          or(isNull(categorias.negocioId), eq(categorias.negocioId, negocioId))
        )
      )
      .limit(1);

    if (!categoria) {
      throw new Error('Categoría no encontrada');
    }

    return categoria as Categoria;
  }
}

