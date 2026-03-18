import { and, desc, eq, gte, inArray, lte, sql, type SQL } from 'drizzle-orm';

import { db } from '@/lib/db';
import { cotizacionItems, cotizaciones, movimientos, negocios, usuarioNegocio } from '@/lib/drizzle';
import type {
  ActualizarCotizacionInput,
  CambiarEstadoCotizacionInput,
  CrearCotizacionInput,
  EstadoCotizacion,
  ListarCotizacionesParams,
} from '@/types/cotizacion.types';

type NegocioEmisor = {
  nombre: string;
  rfc: string | null;
  direccion: string | null;
  telefono: string | null;
};

export class CotizacionError extends Error {
  code: 'FORBIDDEN' | 'NOT_FOUND' | 'INVALID_STATE' | 'INVALID_TRANSITION';

  constructor(message: string, code: CotizacionError['code']) {
    super(message);
    this.name = 'CotizacionError';
    this.code = code;
  }
}

export class CotizacionService {
  private currentTx: (Pick<typeof db, 'select' | 'insert' | 'update' | 'delete'> & { execute?: (query: SQL) => Promise<unknown> }) | null = null;

  private parseNumeric(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private toDecimal(value: number, decimals: number): string {
    return value.toFixed(decimals);
  }

  private toMoney(value: number): string {
    return this.toDecimal(value, 2);
  }

  private async runInTransaction<T>(
    tx: Pick<typeof db, 'select' | 'insert' | 'update' | 'delete'> & { execute?: (query: SQL) => Promise<unknown> },
    fn: () => Promise<T>,
  ): Promise<T> {
    const previous = this.currentTx;
    this.currentTx = tx;
    try {
      return await fn();
    } finally {
      this.currentTx = previous;
    }
  }

  async generarFolio(_negocioId: number, fecha: Date): Promise<string> {
    if (!this.currentTx) {
      throw new Error('generarFolio debe ejecutarse dentro de una transacción');
    }

    const year = fecha.getUTCFullYear();
    const prefix = `COT-${year}-`;

    if (this.currentTx.execute) {
      await this.currentTx.execute(sql`SELECT pg_advisory_xact_lock(${year})`);
    }

    const { count } = await this.currentTx
      .select({ count: sql<number>`COUNT(*)` })
      .from(cotizaciones)
      .where(sql`${cotizaciones.folio} LIKE ${`${prefix}%`}`)
      .then((rows: Array<{ count: number }>) => rows[0] ?? { count: 0 });
    const next = count + 1;
    const suffix = String(next).padStart(3, '0');
    return `${prefix}${suffix}`;
  }

  async listarCotizaciones(params: ListarCotizacionesParams) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;
    const offset = (page - 1) * limit;

    const baseConditions: SQL[] = [];

    if (params.estado) {
      baseConditions.push(eq(cotizaciones.estado, params.estado));
    }

    if (params.fechaDesde) {
      baseConditions.push(gte(cotizaciones.fecha, params.fechaDesde));
    }
    if (params.fechaHasta) {
      baseConditions.push(lte(cotizaciones.fecha, params.fechaHasta));
    }

    if (params.busqueda) {
      const term = `%${params.busqueda}%`;
      baseConditions.push(sql`(${cotizaciones.folio} ILIKE ${term} OR ${cotizaciones.clienteNombre} ILIKE ${term})`);
    }

    if (params.rol !== 'Dueño') {
      const accessibleNegocios = await db
        .select({ negocioId: usuarioNegocio.negocioId })
        .from(usuarioNegocio)
        .where(eq(usuarioNegocio.usuarioId, params.userId));
      const ids = accessibleNegocios.map((n) => n.negocioId);
      if (ids.length === 0) {
        return { items: [], total: 0, page, totalPages: 0 };
      }

      if (params.negocioId && !ids.includes(params.negocioId)) {
        throw new CotizacionError('No tienes acceso a este negocio', 'FORBIDDEN');
      }

      baseConditions.push(inArray(cotizaciones.negocioId, ids));
    }

    if (params.negocioId) {
      baseConditions.push(eq(cotizaciones.negocioId, params.negocioId));
    }

    const whereClause = baseConditions.length > 0 ? and(...baseConditions) : sql`true`;

    const totalRows = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(cotizaciones)
      .where(whereClause);
    const total = totalRows[0]?.total ?? 0;

    const items = await db
      .select({
        id: cotizaciones.id,
        negocioId: cotizaciones.negocioId,
        folio: cotizaciones.folio,
        folioExterno: cotizaciones.folioExterno,
        clienteNombre: cotizaciones.clienteNombre,
        clienteRfc: cotizaciones.clienteRfc,
        fecha: cotizaciones.fecha,
        estado: cotizaciones.estado,
        subtotal: cotizaciones.subtotal,
        iva: cotizaciones.iva,
        total: cotizaciones.total,
        movimientoId: cotizaciones.movimientoId,
        categoriaId: cotizaciones.categoriaId,
        creadoPor: cotizaciones.creadoPor,
        createdAt: cotizaciones.createdAt,
        itemCount: sql<number>`(SELECT COUNT(*) FROM ${cotizacionItems} WHERE ${cotizacionItems.cotizacionId} = ${cotizaciones.id})`,
        primerConcepto: sql<string | null>`LEFT((SELECT ${cotizacionItems.descripcion} FROM ${cotizacionItems} WHERE ${cotizacionItems.cotizacionId} = ${cotizaciones.id} AND ${cotizacionItems.orden} = 1 LIMIT 1), 80)`,
      })
      .from(cotizaciones)
      .where(whereClause)
      .orderBy(desc(cotizaciones.fecha), desc(cotizaciones.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

    return { items, total, page, totalPages };
  }

  async obtenerCotizacion(id: number, context: { userId: number; rol: string }) {
    const [cotizacion] = await db
      .select()
      .from(cotizaciones)
      .where(eq(cotizaciones.id, id))
      .limit(1);

    if (!cotizacion) {
      return null;
    }

    if (context.rol !== 'Dueño') {
      const [access] = await db
        .select({ id: usuarioNegocio.id })
        .from(usuarioNegocio)
        .where(
          and(
            eq(usuarioNegocio.usuarioId, context.userId),
            eq(usuarioNegocio.negocioId, cotizacion.negocioId),
          ),
        )
        .limit(1);

      if (!access) {
        throw new CotizacionError('No tienes acceso a esta cotización', 'FORBIDDEN');
      }
    }

    const [negocioRow] = await db
      .select({
        nombre: negocios.nombre,
        rfc: negocios.rfc,
        direccion: negocios.direccion,
        telefono: negocios.telefono,
      })
      .from(negocios)
      .where(eq(negocios.id, cotizacion.negocioId))
      .limit(1);

    const negocio: NegocioEmisor = {
      nombre: negocioRow?.nombre ?? `Negocio ${cotizacion.negocioId}`,
      rfc: negocioRow?.rfc ?? null,
      direccion: negocioRow?.direccion ?? null,
      telefono: negocioRow?.telefono ?? null,
    };

    const items = await db
      .select()
      .from(cotizacionItems)
      .where(eq(cotizacionItems.cotizacionId, cotizacion.id))
      .orderBy(cotizacionItems.orden);

    return { ...cotizacion, items, negocio };
  }

  async crearCotizacion(input: CrearCotizacionInput) {
    if (!input.items || input.items.length === 0) {
      throw new Error('La cotización debe tener al menos un ítem');
    }

    const subtotalNumber = input.items.reduce((acc, item) => acc + item.importe, 0);
    const ivaNumber = Math.round(subtotalNumber * 0.16 * 100) / 100;
    const totalNumber = subtotalNumber + ivaNumber;

    const fechaDate = new Date(input.fecha);
    if (Number.isNaN(fechaDate.getTime())) {
      throw new Error('Fecha inválida');
    }

    const created = await db.transaction(async (tx) => {
      return this.runInTransaction(tx, async () => {
        const folio = await this.generarFolio(input.negocioId, fechaDate);

        const [cotizacion] = await tx
          .insert(cotizaciones)
          .values({
            negocioId: input.negocioId,
            folio,
            folioExterno: null,
            clienteNombre: input.clienteNombre,
            clienteRfc: input.clienteRfc ?? null,
            clienteDireccion: input.clienteDireccion ?? null,
            fecha: input.fecha,
            estado: 'BORRADOR',
            numeroOc: null,
            numeroFactura: null,
            cuentaBancoId: null,
            categoriaId: input.categoriaId ?? null,
            fechaAprobacion: null,
            fechaFacturacion: null,
            movimientoId: null,
            subtotal: this.toMoney(subtotalNumber),
            iva: this.toMoney(ivaNumber),
            total: this.toMoney(totalNumber),
            notas: input.notas ?? null,
            creadoPor: input.creadoPor,
            aprobadoPor: null,
          })
          .returning();

        if (!cotizacion) {
          throw new Error('No se pudo crear cotización');
        }

        const values = input.items.map((item, index) => ({
          cotizacionId: cotizacion.id,
          orden: index + 1,
          descripcion: item.descripcion,
          cantidad: typeof item.cantidad === 'number' ? this.toDecimal(item.cantidad, 4) : null,
          unidadMedida: item.unidadMedida ?? null,
          precioUnitario: typeof item.precioUnitario === 'number' ? this.toDecimal(item.precioUnitario, 2) : null,
          importe: this.toMoney(item.importe),
        }));

        await tx.insert(cotizacionItems).values(values);

        const items = await tx
          .select()
          .from(cotizacionItems)
          .where(eq(cotizacionItems.cotizacionId, cotizacion.id))
          .orderBy(cotizacionItems.orden);

        return { ...cotizacion, items };
      });
    });

    return created;
  }

  async actualizarCotizacion(
    id: number,
    input: ActualizarCotizacionInput,
    context: { userId: number; rol: string },
  ) {
    const actualizada = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(cotizaciones)
        .where(eq(cotizaciones.id, id))
        .limit(1);

      if (!existing) {
        throw new CotizacionError('Cotización no encontrada', 'NOT_FOUND');
      }

      if (existing.estado !== 'BORRADOR' && existing.estado !== 'ENVIADA') {
        throw new CotizacionError('Solo se pueden actualizar cotizaciones en estado BORRADOR o ENVIADA', 'INVALID_STATE');
      }

      if (context.rol !== 'Dueño') {
        const [access] = await tx
          .select({ id: usuarioNegocio.id })
          .from(usuarioNegocio)
          .where(
            and(
              eq(usuarioNegocio.usuarioId, context.userId),
              eq(usuarioNegocio.negocioId, existing.negocioId),
            ),
          )
          .limit(1);
        if (!access) {
          throw new CotizacionError('No tienes acceso a esta cotización', 'FORBIDDEN');
        }
      }

      let subtotalNumber = this.parseNumeric(existing.subtotal);
      let ivaNumber = this.parseNumeric(existing.iva);
      let totalNumber = this.parseNumeric(existing.total);

      if (input.items) {
        await tx
          .delete(cotizacionItems)
          .where(eq(cotizacionItems.cotizacionId, existing.id));

        subtotalNumber = input.items.reduce(
          (acc, item) => acc + item.importe,
          0,
        );
        ivaNumber = Math.round(subtotalNumber * 0.16 * 100) / 100;
        totalNumber = subtotalNumber + ivaNumber;

        const values = input.items.map((item, index) => ({
          cotizacionId: existing.id,
          orden: index + 1,
          descripcion: item.descripcion,
          cantidad:
            typeof item.cantidad === 'number' ? this.toDecimal(item.cantidad, 4) : null,
          unidadMedida: item.unidadMedida ?? null,
          precioUnitario:
            typeof item.precioUnitario === 'number'
              ? this.toDecimal(item.precioUnitario, 2)
              : null,
          importe: this.toMoney(item.importe),
        }));

        await tx.insert(cotizacionItems).values(values);
      }

      const update: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.clienteNombre !== undefined) {
        update.clienteNombre = input.clienteNombre;
      }
      if (input.clienteRfc !== undefined) {
        update.clienteRfc = input.clienteRfc ?? null;
      }
      if (input.clienteDireccion !== undefined) {
        update.clienteDireccion = input.clienteDireccion ?? null;
      }
      if (input.fecha !== undefined) {
        update.fecha = input.fecha;
      }
      if (input.notas !== undefined) {
        update.notas = input.notas ?? null;
      }
      if (input.categoriaId !== undefined) {
        update.categoriaId = input.categoriaId ?? null;
      }

      if (input.items) {
        update.subtotal = this.toMoney(subtotalNumber);
        update.iva = this.toMoney(ivaNumber);
        update.total = this.toMoney(totalNumber);
      }

      const [updated] = await tx
        .update(cotizaciones)
        .set(update)
        .where(eq(cotizaciones.id, id))
        .returning();

      if (!updated) {
        throw new Error('No se pudo actualizar cotización');
      }

      const items = await tx
        .select()
        .from(cotizacionItems)
        .where(eq(cotizacionItems.cotizacionId, updated.id))
        .orderBy(cotizacionItems.orden);

      return { ...updated, items };
    });

    return actualizada;
  }

  private ensureTransitionAllowed(
    current: EstadoCotizacion,
    next: EstadoCotizacion,
    cotizacion: { creadoPor: number },
    context: { userId: number; rol: string },
  ) {
    if (current === next) {
      return;
    }

    if (next === 'CANCELADA') {
      if (context.rol !== 'Dueño' && context.rol !== 'Admin') {
        throw new CotizacionError('Solo Dueño y Admin pueden cancelar cotizaciones', 'FORBIDDEN');
      }
      return;
    }

    if (current === 'BORRADOR' && next === 'ENVIADA') {
      return;
    }

    if (current === 'ENVIADA' && next === 'BORRADOR') {
      if (
        context.rol === 'Dueño' ||
        context.rol === 'Admin' ||
        cotizacion.creadoPor === context.userId
      ) {
        return;
      }
      throw new CotizacionError('Solo el creador o Dueño/Admin pueden regresar a BORRADOR', 'FORBIDDEN');
    }

    if (current === 'ENVIADA' && next === 'APROBADA') {
      if (context.rol !== 'Dueño' && context.rol !== 'Admin') {
        throw new CotizacionError('Solo Dueño y Admin pueden aprobar cotizaciones', 'FORBIDDEN');
      }
      return;
    }

    if (current === 'APROBADA' && next === 'FACTURADA') {
      if (context.rol !== 'Dueño' && context.rol !== 'Admin') {
        throw new CotizacionError('Solo Dueño y Admin pueden facturar cotizaciones', 'FORBIDDEN');
      }
      return;
    }

    throw new CotizacionError(`Transición de estado no permitida: ${current} → ${next}`, 'INVALID_TRANSITION');
  }

  async cambiarEstado(
    id: number,
    input: CambiarEstadoCotizacionInput,
    context: { userId: number; rol: string },
  ) {
    const actualizado = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(cotizaciones)
        .where(eq(cotizaciones.id, id))
        .limit(1);

      if (!existing) {
        throw new CotizacionError('Cotización no encontrada', 'NOT_FOUND');
      }

      if (context.rol !== 'Dueño') {
        const [access] = await tx
          .select({ id: usuarioNegocio.id })
          .from(usuarioNegocio)
          .where(
            and(
              eq(usuarioNegocio.usuarioId, context.userId),
              eq(usuarioNegocio.negocioId, existing.negocioId),
            ),
          )
          .limit(1);
        if (!access) {
          throw new CotizacionError('No tienes acceso a esta cotización', 'FORBIDDEN');
        }
      }

      this.ensureTransitionAllowed(
        existing.estado as EstadoCotizacion,
        input.nuevoEstado,
        { creadoPor: existing.creadoPor },
        context,
      );

      const update: Record<string, unknown> = {
        estado: input.nuevoEstado,
        updatedAt: new Date(),
      };

      if (input.nuevoEstado === 'APROBADA') {
        update.numeroOc = input.numeroOc;
        update.fechaAprobacion = new Date();
        update.aprobadoPor = input.aprobadoPor;
      }

      if (input.nuevoEstado === 'FACTURADA') {
        const numeroFactura = input.numeroFactura;
        const cuentaBancoId = input.cuentaBancoId!;
        const categoriaId = input.categoriaId ?? existing.categoriaId ?? null;

        update.numeroFactura = numeroFactura;
        update.fechaFacturacion = new Date();
        update.aprobadoPor = input.aprobadoPor;
        update.cuentaBancoId = cuentaBancoId;
        update.categoriaId = categoriaId;

        const [movimientoCreated] = await tx
          .insert(movimientos)
          .values({
            negocioId: existing.negocioId,
            centroCostoId: null,
            tipo: 'INGRESO',
            fecha: new Date().toISOString().slice(0, 10),
            concepto: `Cotización ${existing.folio} - ${existing.clienteNombre}`,
            tercero: existing.clienteNombre,
            monto: existing.total,
            cuentaBancoId,
            creadoPor: input.aprobadoPor,
            estado: 'PENDIENTE',
            version: 1,
          })
          .returning();

        if (!movimientoCreated) {
          throw new Error('No se pudo crear movimiento para la cotización');
        }

        update.movimientoId = movimientoCreated.id;
      }

      if (input.nuevoEstado === 'CANCELADA') {
        if (existing.movimientoId) {
          throw new Error(
            'Esta cotización ya tiene un movimiento asociado. Rechaza el movimiento antes de cancelar.',
          );
        }
      }

      const [updated] = await tx
        .update(cotizaciones)
        .set(update)
        .where(eq(cotizaciones.id, id))
        .returning();

      if (!updated) {
        throw new Error('No se pudo actualizar estado de la cotización');
      }

      const items = await tx
        .select()
        .from(cotizacionItems)
        .where(eq(cotizacionItems.cotizacionId, updated.id))
        .orderBy(cotizacionItems.orden);

      return { ...updated, items };
    });

    return actualizado;
  }

  async eliminarCotizacion(
    id: number,
    context: { userId: number; rol: string },
  ) {
    const eliminada = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(cotizaciones)
        .where(eq(cotizaciones.id, id))
        .limit(1);

      if (!existing) {
        throw new CotizacionError('Cotización no encontrada', 'NOT_FOUND');
      }

      if (existing.estado !== 'BORRADOR') {
        throw new CotizacionError('Solo se pueden eliminar cotizaciones en estado BORRADOR', 'INVALID_STATE');
      }

      if (context.rol !== 'Dueño' && context.rol !== 'Admin') {
        throw new CotizacionError('Solo Dueño y Admin pueden eliminar cotizaciones', 'FORBIDDEN');
      }

      await tx
        .delete(cotizacionItems)
        .where(eq(cotizacionItems.cotizacionId, existing.id));
      await tx.delete(cotizaciones).where(eq(cotizaciones.id, existing.id));

      return existing;
    });

    return eliminada;
  }
}
