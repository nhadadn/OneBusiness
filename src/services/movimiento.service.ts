import { alias } from 'drizzle-orm/pg-core';
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { auditLog } from '@/lib/audit-logger';
import { cuentasBanco, movimientos, negocios, roles, usuarioNegocio, usuarios } from '@/lib/drizzle';
import { EmailService } from '@/services/email.service';
import type {
  AprobarMovimientoInput,
  CreateMovimientoInput,
  Movimiento,
  RechazarMovimientoInput,
  ReenviarMovimientoInput,
  TipoMovimiento,
  UpdateMovimientoInput,
} from '@/types/movimiento.types';

type EmailAprobador = { id: number; nombre: string; email: string };

export class MovimientoService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  async listar(filtros: {
    negocioId: number;
    estado?: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
    tipo?: TipoMovimiento;
    fechaDesde?: string;
    fechaHasta?: string;
    cuentaBancoId?: number;
    creadoPorId?: number;
    page?: number;
    limit?: number;
  }) {
    const page = filtros.page || 1;
    const limit = filtros.limit || 50;
    const offset = (page - 1) * limit;

    const conditions = [eq(movimientos.negocioId, filtros.negocioId)];
    conditions.push(eq(movimientos.activo, true));

    if (filtros.estado) {
      conditions.push(eq(movimientos.estado, filtros.estado));
    }
    if (filtros.tipo) {
      conditions.push(eq(movimientos.tipo, filtros.tipo));
    }
    if (filtros.fechaDesde) {
      conditions.push(gte(movimientos.fecha, filtros.fechaDesde));
    }
    if (filtros.fechaHasta) {
      conditions.push(lte(movimientos.fecha, filtros.fechaHasta));
    }
    if (filtros.cuentaBancoId) {
      conditions.push(eq(movimientos.cuentaBancoId, filtros.cuentaBancoId));
    }
    if (filtros.creadoPorId) {
      conditions.push(eq(movimientos.creadoPor, filtros.creadoPorId));
    }

    const aprobadorAlias = alias(usuarios, 'aprobador');

    const totalRows = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(movimientos)
      .where(and(...conditions));
    const total = totalRows[0]?.total ?? 0;

    const items = await db
      .select({
        id: movimientos.id,
        negocioId: movimientos.negocioId,
        fecha: movimientos.fecha,
        concepto: movimientos.concepto,
        tercero: movimientos.tercero,
        tipo: movimientos.tipo,
        monto: movimientos.monto,
        estado: movimientos.estado,
        traspasoRefId: movimientos.traspasoRefId,
        version: movimientos.version,
        activo: movimientos.activo,
        createdAt: movimientos.createdAt,
        cuentaBanco: {
          id: cuentasBanco.id,
          nombre: cuentasBanco.nombre,
        },
        creadoPor: {
          id: usuarios.id,
          nombre: usuarios.nombreCompleto,
          email: usuarios.email,
        },
        aprobadoPor: {
          id: aprobadorAlias.id,
          nombre: aprobadorAlias.nombreCompleto,
        },
        fechaAprobacion: movimientos.fechaAprobacion,
        motivoRechazo: movimientos.motivoRechazo,
      })
      .from(movimientos)
      .innerJoin(cuentasBanco, eq(movimientos.cuentaBancoId, cuentasBanco.id))
      .innerJoin(usuarios, eq(movimientos.creadoPor, usuarios.id))
      .leftJoin(aprobadorAlias, eq(movimientos.aprobadoPor, aprobadorAlias.id))
      .where(and(...conditions))
      .orderBy(desc(movimientos.fecha))
      .limit(limit)
      .offset(offset);

    return { items, total, page, limit };
  }

  async obtener(id: number) {
    const [movimiento] = await db.select().from(movimientos).where(eq(movimientos.id, id)).limit(1);
    return movimiento;
  }

  async obtenerDetalle(id: number) {
    const aprobadorAlias = alias(usuarios, 'aprobador');

    const [detalle] = await db
      .select({
        id: movimientos.id,
        negocioId: movimientos.negocioId,
        fecha: movimientos.fecha,
        concepto: movimientos.concepto,
        tercero: movimientos.tercero,
        tipo: movimientos.tipo,
        monto: movimientos.monto,
        estado: movimientos.estado,
        version: movimientos.version,
        activo: movimientos.activo,
        createdAt: movimientos.createdAt,
        centroCostoId: movimientos.centroCostoId,
        traspasoRefId: movimientos.traspasoRefId,
        cuentaBanco: {
          id: cuentasBanco.id,
          nombre: cuentasBanco.nombre,
        },
        creadoPor: {
          id: usuarios.id,
          nombre: usuarios.nombreCompleto,
          email: usuarios.email,
        },
        aprobadoPor: {
          id: aprobadorAlias.id,
          nombre: aprobadorAlias.nombreCompleto,
        },
        fechaAprobacion: movimientos.fechaAprobacion,
        motivoRechazo: movimientos.motivoRechazo,
      })
      .from(movimientos)
      .innerJoin(cuentasBanco, eq(movimientos.cuentaBancoId, cuentasBanco.id))
      .innerJoin(usuarios, eq(movimientos.creadoPor, usuarios.id))
      .leftJoin(aprobadorAlias, eq(movimientos.aprobadoPor, aprobadorAlias.id))
      .where(eq(movimientos.id, id))
      .limit(1);

    return detalle;
  }

  async crear(data: CreateMovimientoInput, creadoPor: number) {
    if (data.tipo === 'TRASPASO_SALIDA' && data.cuentaBancoDestinoId && data.negocioDestinoId) {
      const created = await this.crearTraspaso(data, creadoPor);
      void auditLog({
        evento: 'MOVIMIENTO_CREADO',
        exitoso: true,
        userId: creadoPor,
        negocioId: created.negocioId,
        recurso: '/api/movimientos',
        recursoId: created.id,
        detalles: { monto: data.monto, tipo: data.tipo },
      });
      return created;
    }

    const [movimiento] = await db
      .insert(movimientos)
      .values({
        negocioId: data.negocioId,
        centroCostoId: data.centroCostoId || null,
        tipo: data.tipo,
        fecha: data.fecha,
        concepto: data.concepto,
        tercero: data.tercero || null,
        monto: data.monto.toString(),
        cuentaBancoId: data.cuentaBancoId,
        creadoPor,
        estado: 'PENDIENTE',
        version: 1,
      })
      .returning();
    if (!movimiento) {
      throw new Error('No se pudo crear movimiento');
    }

    await this.notificarNuevoMovimiento(movimiento);

    void auditLog({
      evento: 'MOVIMIENTO_CREADO',
      exitoso: true,
      userId: creadoPor,
      negocioId: movimiento.negocioId,
      recurso: '/api/movimientos',
      recursoId: movimiento.id,
      detalles: { monto: data.monto, tipo: data.tipo },
    });

    return movimiento;
  }

  private async crearTraspaso(data: CreateMovimientoInput, creadoPor: number) {
    return db.transaction(async (tx) => {
      if (!data.negocioDestinoId || !data.cuentaBancoDestinoId) {
        throw new Error('Traspaso requiere cuenta y negocio de destino');
      }

      const [salida] = await tx
        .insert(movimientos)
        .values({
          negocioId: data.negocioId,
          centroCostoId: data.centroCostoId || null,
          tipo: 'TRASPASO_SALIDA',
          fecha: data.fecha,
          concepto: data.concepto,
          tercero: data.tercero || null,
          monto: data.monto.toString(),
          cuentaBancoId: data.cuentaBancoId,
          creadoPor,
          estado: 'PENDIENTE',
          version: 1,
        })
        .returning();
      if (!salida) {
        throw new Error('No se pudo crear movimiento de salida');
      }

      const [entrada] = await tx
        .insert(movimientos)
        .values({
          negocioId: data.negocioDestinoId,
          centroCostoId: data.centroCostoId || null,
          tipo: 'TRASPASO_ENTRADA',
          fecha: data.fecha,
          concepto: data.concepto,
          tercero: data.tercero || null,
          monto: data.monto.toString(),
          cuentaBancoId: data.cuentaBancoDestinoId,
          creadoPor,
          estado: 'PENDIENTE',
          version: 1,
        })
        .returning();
      if (!entrada) {
        throw new Error('No se pudo crear movimiento de entrada');
      }

      const [salidaVinculada] = await tx
        .update(movimientos)
        .set({ traspasoRefId: entrada.id })
        .where(eq(movimientos.id, salida.id))
        .returning();

      await tx.update(movimientos).set({ traspasoRefId: salida.id }).where(eq(movimientos.id, entrada.id));

      await this.notificarNuevoMovimiento(salida);
      await this.notificarNuevoMovimiento(entrada);

      if (!salidaVinculada) {
        throw new Error('No se pudo vincular movimiento de salida');
      }

      return salidaVinculada;
    });
  }

  async actualizar(id: number, data: UpdateMovimientoInput, _usuarioId: number) {
    const movimiento = await this.obtener(id);
    if (!movimiento) throw new Error('Movimiento no encontrado');

    const requerirReaprobacion = movimiento.estado === 'APROBADO';

    const [actualizado] = await db
      .update(movimientos)
      .set({
        ...data,
        monto: data.monto?.toString(),
        estado: requerirReaprobacion ? 'PENDIENTE' : movimiento.estado,
        updatedAt: new Date(),
      })
      .where(eq(movimientos.id, id))
      .returning();
    if (!actualizado) {
      throw new Error('No se pudo actualizar movimiento');
    }

    if (requerirReaprobacion) {
      await this.notificarEdicionAprobado(actualizado);
    }

    return actualizado;
  }

  async aprobar(input: AprobarMovimientoInput) {
    const movimiento = await this.obtener(input.movimientoId);
    if (!movimiento) throw new Error('Movimiento no encontrado');
    if (movimiento.estado !== 'PENDIENTE') {
      throw new Error('Solo se pueden aprobar movimientos pendientes');
    }

    const aprobado = await db.transaction(async (tx) => {
      const [aprobado] = await tx
        .update(movimientos)
        .set({
          estado: 'APROBADO',
          aprobadoPor: input.aprobadoPor,
          fechaAprobacion: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(movimientos.id, input.movimientoId))
        .returning();
      if (!aprobado) {
        throw new Error('No se pudo aprobar movimiento');
      }

      if (movimiento.traspasoRefId) {
        await tx
          .update(movimientos)
          .set({
            estado: 'APROBADO',
            aprobadoPor: input.aprobadoPor,
            fechaAprobacion: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(movimientos.id, movimiento.traspasoRefId));
      }

      await this.emailService.notificarAprobacion(aprobado);

      return aprobado;
    });

    void auditLog({
      evento: 'MOVIMIENTO_APROBADO',
      exitoso: true,
      userId: input.aprobadoPor,
      negocioId: movimiento.negocioId,
      recurso: '/api/movimientos',
      recursoId: input.movimientoId,
      detalles: { monto: movimiento.monto, tipo: movimiento.tipo },
    });

    return aprobado;
  }

  async rechazar(input: RechazarMovimientoInput) {
    const movimiento = await this.obtener(input.movimientoId);
    if (!movimiento) throw new Error('Movimiento no encontrado');
    if (movimiento.estado !== 'PENDIENTE') {
      throw new Error('Solo se pueden rechazar movimientos pendientes');
    }

    const rechazado = await db.transaction(async (tx) => {
      const [rechazado] = await tx
        .update(movimientos)
        .set({
          estado: 'RECHAZADO',
          aprobadoPor: input.aprobadoPor,
          fechaAprobacion: new Date(),
          motivoRechazo: input.motivoRechazo,
          updatedAt: new Date(),
        })
        .where(eq(movimientos.id, input.movimientoId))
        .returning();
      if (!rechazado) {
        throw new Error('No se pudo rechazar movimiento');
      }

      if (movimiento.traspasoRefId) {
        await tx
          .update(movimientos)
          .set({
            estado: 'RECHAZADO',
            aprobadoPor: input.aprobadoPor,
            fechaAprobacion: new Date(),
            motivoRechazo: input.motivoRechazo,
            updatedAt: new Date(),
          })
          .where(eq(movimientos.id, movimiento.traspasoRefId));
      }

      await this.emailService.notificarRechazo(rechazado, input.motivoRechazo);

      return rechazado;
    });

    void auditLog({
      evento: 'MOVIMIENTO_RECHAZADO',
      exitoso: true,
      userId: input.aprobadoPor,
      negocioId: movimiento.negocioId,
      recurso: '/api/movimientos',
      recursoId: input.movimientoId,
      detalles: { monto: movimiento.monto, motivo: input.motivoRechazo },
    });

    return rechazado;
  }

  async reenviar(input: ReenviarMovimientoInput, usuarioId: number) {
    const movimiento = await this.obtener(input.movimientoId);
    if (!movimiento) throw new Error('Movimiento no encontrado');
    if (movimiento.estado !== 'RECHAZADO') {
      throw new Error('Solo se pueden reenviar movimientos rechazados');
    }
    if (movimiento.creadoPor !== usuarioId) {
      throw new Error('Solo el creador puede reenviar el movimiento');
    }

    const [reenviado] = await db
      .update(movimientos)
      .set({
        ...input.cambios,
        monto: input.cambios.monto?.toString(),
        estado: 'PENDIENTE',
        motivoRechazo: null,
        aprobadoPor: null,
        fechaAprobacion: null,
        version: movimiento.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(movimientos.id, input.movimientoId))
      .returning();
    if (!reenviado) {
      throw new Error('No se pudo reenviar movimiento');
    }

    await this.notificarReenvio(reenviado);

    return reenviado;
  }

  async eliminar(id: number) {
    const [eliminado] = await db.update(movimientos).set({ activo: false, updatedAt: new Date() }).where(eq(movimientos.id, id)).returning();
    if (!eliminado) {
      throw new Error('No se pudo eliminar movimiento');
    }
    return eliminado;
  }

  private parseNumeric(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  async crearTraspasoBancario(input: {
    negocioId: number;
    cuentaOrigenId: number;
    cuentaDestinoId: number;
    monto: number;
    concepto: string;
    fecha: string;
    creadoPor: number;
  }) {
    const created = await db.transaction(async (tx) => {
      const cuentas = await tx
        .select({ id: cuentasBanco.id })
        .from(cuentasBanco)
        .where(and(eq(cuentasBanco.negocioId, input.negocioId), inArray(cuentasBanco.id, [input.cuentaOrigenId, input.cuentaDestinoId])))
        .limit(2);

      if (cuentas.length !== 2) {
        throw new Error('Cuentas inválidas para el negocio');
      }

      const [salida] = await tx
        .insert(movimientos)
        .values({
          negocioId: input.negocioId,
          centroCostoId: null,
          tipo: 'EGRESO',
          fecha: input.fecha,
          concepto: input.concepto,
          tercero: null,
          monto: input.monto.toString(),
          cuentaBancoId: input.cuentaOrigenId,
          creadoPor: input.creadoPor,
          estado: 'PENDIENTE',
          version: 1,
        })
        .returning();

      if (!salida) {
        throw new Error('No se pudo crear movimiento de salida');
      }

      const [entrada] = await tx
        .insert(movimientos)
        .values({
          negocioId: input.negocioId,
          centroCostoId: null,
          tipo: 'INGRESO',
          fecha: input.fecha,
          concepto: input.concepto,
          tercero: null,
          monto: input.monto.toString(),
          cuentaBancoId: input.cuentaDestinoId,
          traspasoRefId: salida.id,
          creadoPor: input.creadoPor,
          estado: 'PENDIENTE',
          version: 1,
        })
        .returning();

      if (!entrada) {
        throw new Error('No se pudo crear movimiento de entrada');
      }

      const [salidaVinculada] = await tx
        .update(movimientos)
        .set({ traspasoRefId: entrada.id, updatedAt: new Date() })
        .where(eq(movimientos.id, salida.id))
        .returning();

      if (!salidaVinculada) {
        throw new Error('No se pudo vincular movimiento de salida');
      }

      await this.notificarNuevoMovimiento(salidaVinculada);
      await this.notificarNuevoMovimiento(entrada);

      return { movimientoOrigen: salidaVinculada, movimientoDestino: entrada };
    });

    void auditLog({
      evento: 'TRASPASO_CREADO',
      exitoso: true,
      userId: input.creadoPor,
      negocioId: input.negocioId,
      recurso: '/api/traspasos',
      recursoId: created.movimientoOrigen.id,
      detalles: {
        cuentaOrigenId: input.cuentaOrigenId,
        cuentaDestinoId: input.cuentaDestinoId,
        monto: input.monto,
        movimientoOrigenId: created.movimientoOrigen.id,
        movimientoDestinoId: created.movimientoDestino.id,
      },
    });

    return created;
  }

  private calcularSemaforo(
    balance: number,
    umbralAlerta: number | null,
    umbralCritico: number | null
  ): 'verde' | 'amarillo' | 'rojo' {
    if (umbralAlerta === null && umbralCritico === null) return 'verde';
    if (balance < 0) return 'rojo';
    if (umbralCritico !== null && balance < umbralCritico) return 'rojo';
    if (umbralAlerta !== null && balance < umbralAlerta && (umbralCritico === null || balance >= umbralCritico)) {
      return 'amarillo';
    }
    return 'verde';
  }

  async obtenerResumenFinanciero(input: { negocioId: number; fechaDesde: string; fechaHasta: string }) {
    const [row] = await db
      .select({
        negocioId: negocios.id,
        nombre: negocios.nombre,
        umbralAlerta: negocios.umbralAlerta,
        umbralCritico: negocios.umbralCritico,
        totalIngresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.activo} = true AND ${movimientos.estado} = 'APROBADO' AND ${movimientos.tipo} = 'INGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        totalEgresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.activo} = true AND ${movimientos.estado} = 'APROBADO' AND ${movimientos.tipo} = 'EGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        cantidadMovimientos: sql<number>`COALESCE(COUNT(${movimientos.id}), 0)`,
        cantidadPendientes: sql<number>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.activo} = true AND ${movimientos.estado} = 'PENDIENTE' THEN 1 ELSE 0 END), 0)`,
      })
      .from(negocios)
      .leftJoin(
        movimientos,
        and(
          eq(movimientos.negocioId, negocios.id),
          eq(movimientos.activo, true),
          gte(movimientos.fecha, input.fechaDesde),
          lte(movimientos.fecha, input.fechaHasta)
        )
      )
      .where(eq(negocios.id, input.negocioId))
      .groupBy(negocios.id, negocios.nombre, negocios.umbralAlerta, negocios.umbralCritico)
      .limit(1);

    if (!row) return null;

    const totalIngresos = this.parseNumeric(row.totalIngresos) ?? 0;
    const totalEgresos = this.parseNumeric(row.totalEgresos) ?? 0;
    const balance = totalIngresos - totalEgresos;

    const umbralAlerta = this.parseNumeric(row.umbralAlerta);
    const umbralCritico = this.parseNumeric(row.umbralCritico);

    return {
      negocioId: row.negocioId,
      nombre: row.nombre,
      totalIngresos,
      totalEgresos,
      balance,
      cantidadMovimientos: Number(row.cantidadMovimientos ?? 0),
      cantidadPendientes: Number(row.cantidadPendientes ?? 0),
      semaforo: this.calcularSemaforo(balance, umbralAlerta, umbralCritico),
    };
  }

  async obtenerResumenesFinancierosPorNegocio(input: { negocioIds?: number[]; fechaDesde: string; fechaHasta: string }) {
    const whereNegocios =
      Array.isArray(input.negocioIds) && input.negocioIds.length > 0 ? inArray(negocios.id, input.negocioIds) : undefined;

    const rows = await db
      .select({
        negocioId: negocios.id,
        nombre: negocios.nombre,
        umbralAlerta: negocios.umbralAlerta,
        umbralCritico: negocios.umbralCritico,
        totalIngresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.activo} = true AND ${movimientos.estado} = 'APROBADO' AND ${movimientos.tipo} = 'INGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        totalEgresos: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.activo} = true AND ${movimientos.estado} = 'APROBADO' AND ${movimientos.tipo} = 'EGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        cantidadMovimientos: sql<number>`COALESCE(COUNT(${movimientos.id}), 0)`,
        cantidadPendientes: sql<number>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.activo} = true AND ${movimientos.estado} = 'PENDIENTE' THEN 1 ELSE 0 END), 0)`,
      })
      .from(negocios)
      .leftJoin(
        movimientos,
        and(
          eq(movimientos.negocioId, negocios.id),
          eq(movimientos.activo, true),
          gte(movimientos.fecha, input.fechaDesde),
          lte(movimientos.fecha, input.fechaHasta)
        )
      )
      .where(whereNegocios)
      .groupBy(negocios.id, negocios.nombre, negocios.umbralAlerta, negocios.umbralCritico)
      .orderBy(negocios.id);

    return rows.map((row) => {
      const totalIngresos = this.parseNumeric(row.totalIngresos) ?? 0;
      const totalEgresos = this.parseNumeric(row.totalEgresos) ?? 0;
      const balance = totalIngresos - totalEgresos;

      const umbralAlerta = this.parseNumeric(row.umbralAlerta);
      const umbralCritico = this.parseNumeric(row.umbralCritico);

      return {
        negocioId: row.negocioId,
        nombre: row.nombre,
        totalIngresos,
        totalEgresos,
        balance,
        cantidadMovimientos: Number(row.cantidadMovimientos ?? 0),
        cantidadPendientes: Number(row.cantidadPendientes ?? 0),
        semaforo: this.calcularSemaforo(balance, umbralAlerta, umbralCritico),
      };
    });
  }

  async contarPendientes(negocioIds: number[]) {
    const result = await db
      .select({
        negocioId: movimientos.negocioId,
        count: sql<number>`COUNT(*)`,
      })
      .from(movimientos)
      .where(and(inArray(movimientos.negocioId, negocioIds), eq(movimientos.estado, 'PENDIENTE'), eq(movimientos.activo, true)))
      .groupBy(movimientos.negocioId);

    return result;
  }

  private async notificarNuevoMovimiento(movimiento: Movimiento) {
    const aprobadores = await this.obtenerAprobadores(movimiento.negocioId);
    await this.emailService.notificarNuevoPendiente(movimiento, aprobadores);
  }

  private async notificarEdicionAprobado(movimiento: Movimiento) {
    const aprobadores = await this.obtenerAprobadores(movimiento.negocioId);
    await this.emailService.notificarEdicionRequiereAprobacion(movimiento, aprobadores);
  }

  private async notificarReenvio(movimiento: Movimiento) {
    const aprobadores = await this.obtenerAprobadores(movimiento.negocioId);
    await this.emailService.notificarReenvio(movimiento, aprobadores);
  }

  private async obtenerAprobadores(negocioId: number): Promise<EmailAprobador[]> {
    const aprobadores = await db
      .select({
        id: usuarios.id,
        nombre: usuarios.nombreCompleto,
        email: usuarios.email,
      })
      .from(usuarios)
      .innerJoin(roles, eq(usuarios.rolId, roles.id))
      .innerJoin(usuarioNegocio, eq(usuarios.id, usuarioNegocio.usuarioId))
      .where(and(eq(usuarioNegocio.negocioId, negocioId), inArray(roles.nombre, ['Dueño', 'Admin']), eq(usuarios.activo, true)));

    return aprobadores;
  }
}


