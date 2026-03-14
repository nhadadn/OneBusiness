import { alias } from 'drizzle-orm/pg-core';
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { auditLog } from '@/lib/audit-logger';
import { cuentasBanco, movimientos, roles, usuarioNegocio, usuarios } from '@/lib/drizzle';
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


