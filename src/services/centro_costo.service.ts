import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { centrosCosto } from '@/lib/drizzle';
import type {
  CentroCostoListItem,
  CentroCostoTree,
  CreateCentroCostoInput,
  TipoCentroCosto,
  UpdateCentroCostoInput,
} from '@/types/centro_costo.types';

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function normalizeOptionalText(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

const baseSelect = {
  id: centrosCosto.id,
  nombre: centrosCosto.nombre,
  codigo: centrosCosto.codigo,
  tipo: centrosCosto.tipo,
  negocioId: centrosCosto.negocioId,
  padreId: centrosCosto.padreId,
  descripcion: centrosCosto.descripcion,
  activo: centrosCosto.activo,
} as const;

function toListItem(row: (typeof baseSelect extends infer T ? { [K in keyof T]: unknown } : never) & { [k: string]: unknown }) {
  return {
    id: row.id as number,
    nombre: row.nombre as string,
    codigo: (row.codigo as string | null) ?? null,
    tipo: row.tipo as TipoCentroCosto,
    negocioId: row.negocioId as number,
    padreId: (row.padreId as number | null) ?? null,
    descripcion: (row.descripcion as string | null) ?? null,
    activo: (row.activo as boolean | null) ?? true,
  } satisfies CentroCostoListItem;
}

export class CentroCostoService {
  async listar(negocioId: number): Promise<CentroCostoListItem[]> {
    if (!isPositiveInt(negocioId)) {
      throw new Error('negocioId inválido');
    }

    const rows = await db
      .select(baseSelect)
      .from(centrosCosto)
      .where(and(eq(centrosCosto.negocioId, negocioId), eq(centrosCosto.activo, true)))
      .orderBy(asc(centrosCosto.tipo), asc(centrosCosto.nombre));

    return rows.map(toListItem);
  }

  async obtenerArbol(negocioId: number): Promise<CentroCostoTree[]> {
    const todos = await this.listar(negocioId);
    const raices = todos.filter((c) => c.tipo === 'DIVISION' || !c.padreId);
    const raicesDedup = Array.from(new Map(raices.map((r) => [r.id, r])).values());

    return raicesDedup.map((r) => ({
      ...r,
      hijos: todos
        .filter((c) => c.padreId === r.id)
        .map((c) => ({
          ...c,
          hijos: [],
        })),
    }));
  }

  async crear(input: CreateCentroCostoInput): Promise<CentroCostoListItem> {
    if (!isPositiveInt(input.negocioId)) {
      throw new Error('negocioId inválido');
    }

    const nombre = input.nombre.trim();
    if (!nombre) {
      throw new Error('Nombre inválido');
    }
    if (nombre.length > 255) {
      throw new Error('Nombre demasiado largo');
    }

    if (input.tipo === 'SUBDIVISION') {
      if (!isPositiveInt(input.padreId)) {
        throw new Error('padreId es requerido para SUBDIVISION');
      }

      const [padre] = await db
        .select({ id: centrosCosto.id, tipo: centrosCosto.tipo })
        .from(centrosCosto)
        .where(and(eq(centrosCosto.id, input.padreId), eq(centrosCosto.negocioId, input.negocioId), eq(centrosCosto.activo, true)))
        .limit(1);

      if (!padre) {
        throw new Error('Centro de costo padre no encontrado');
      }
      if (padre.tipo !== 'DIVISION') {
        throw new Error('El centro padre debe ser una DIVISION');
      }
    }

    if (input.tipo === 'DIVISION') {
      if (input.padreId != null) {
        throw new Error('padreId debe ser null para DIVISION');
      }
    }

    const [created] = await db
      .insert(centrosCosto)
      .values({
        negocioId: input.negocioId,
        nombre,
        codigo: normalizeOptionalText(input.codigo) ?? null,
        tipo: input.tipo,
        padreId: input.tipo === 'SUBDIVISION' ? (input.padreId ?? null) : null,
        descripcion: normalizeOptionalText(input.descripcion) ?? null,
        activo: true,
      })
      .returning(baseSelect);

    if (!created) {
      throw new Error('No se pudo crear el centro de costo');
    }

    return toListItem(created);
  }

  async actualizar(id: number, input: UpdateCentroCostoInput): Promise<CentroCostoListItem> {
    if (!isPositiveInt(id)) {
      throw new Error('ID inválido');
    }

    const updateData: {
      nombre?: string;
      codigo?: string | null;
      descripcion?: string | null;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (input.nombre !== undefined) {
      const nombre = input.nombre.trim();
      if (!nombre) {
        throw new Error('Nombre inválido');
      }
      if (nombre.length > 255) {
        throw new Error('Nombre demasiado largo');
      }
      updateData.nombre = nombre;
    }

    if (input.codigo !== undefined) {
      updateData.codigo = normalizeOptionalText(input.codigo) ?? null;
    }

    if (input.descripcion !== undefined) {
      updateData.descripcion = normalizeOptionalText(input.descripcion) ?? null;
    }

    const [updated] = await db
      .update(centrosCosto)
      .set(updateData)
      .where(and(eq(centrosCosto.id, id), eq(centrosCosto.activo, true)))
      .returning(baseSelect);

    if (!updated) {
      throw new Error('Centro de costo no encontrado');
    }

    return toListItem(updated);
  }

  async desactivar(id: number): Promise<void> {
    if (!isPositiveInt(id)) {
      throw new Error('ID inválido');
    }

    await db.transaction(async (tx) => {
      await tx
        .update(centrosCosto)
        .set({ activo: false, updatedAt: new Date() })
        .where(eq(centrosCosto.padreId, id));

      const [updated] = await tx
        .update(centrosCosto)
        .set({ activo: false, updatedAt: new Date() })
        .where(eq(centrosCosto.id, id))
        .returning({ id: centrosCosto.id });

      if (!updated) {
        throw new Error('Centro de costo no encontrado');
      }
    });
  }
}
