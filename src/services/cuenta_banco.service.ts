import { and, eq, inArray, lte, sql } from 'drizzle-orm';

import { db } from '@/lib/db'; 
import { cuentaNegocio, cuentasBanco, movimientos, negocios } from '@/lib/drizzle';
import type {
  ArqueoCuentaBanco,
  ArqueoNegocio,
  CreateCuentaBancoInput,
  EstadoArqueo,
  SaldoCalculado,
  UpdateCuentaBancoInput,
} from '@/types/cuenta_banco.types';

export class CuentaBancoService {
  private parseMoney(value: string | null | undefined): number {
    const parsed = Number.parseFloat(value ?? '0');
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private getEstadoArqueo(params: { saldoReal: number | null; saldoCalculado: number }): EstadoArqueo {
    if (params.saldoReal === null) return 'SIN_SALDO_REAL';
    const diferencia = params.saldoReal - params.saldoCalculado;
    if (Math.abs(diferencia) <= 0.01) return 'CUADRADO';
    return diferencia > 0.01 ? 'SOBRANTE' : 'FALTANTE';
  }

  public usuarioTieneAccesoACuenta(
    cuenta: {
      esGlobal: boolean;
      negocioId: number | null;
      negociosCompartidos?: { negocioId: number }[];
    },
    userNegocios: number[]
  ): boolean {
    if (cuenta.esGlobal) return true;
    if (cuenta.negocioId !== null && userNegocios.includes(cuenta.negocioId)) return true;
    if (cuenta.negociosCompartidos && cuenta.negociosCompartidos.some((nc) => userNegocios.includes(nc.negocioId))) return true;
    return false;
  }

  async listar(negocioId: number) {
    const cuentas = await db
      .selectDistinct({
        id: cuentasBanco.id,
        nombre: cuentasBanco.nombre,
        tipo: cuentasBanco.tipo,
        bancoInstitucion: cuentasBanco.bancoInstitucion,
        titular: cuentasBanco.titular,
        negocioId: cuentasBanco.negocioId,
        esGlobal: cuentasBanco.esGlobal,
        saldoInicial: cuentasBanco.saldoInicial,
        saldoReal: cuentasBanco.saldoReal,
        fechaSaldoReal: cuentasBanco.fechaSaldoReal,
        activo: cuentasBanco.activo,
        createdAt: cuentasBanco.createdAt,
        updatedAt: cuentasBanco.updatedAt,
      })
      .from(cuentasBanco)
      .leftJoin(cuentaNegocio, eq(cuentasBanco.id, cuentaNegocio.cuentaId))
      .where(
        and(
          eq(cuentasBanco.activo, true),
          sql`${cuentasBanco.negocioId} = ${negocioId} OR ${cuentasBanco.esGlobal} = true OR ${cuentaNegocio.negocioId} = ${negocioId}`
        )
      )
      .orderBy(cuentasBanco.nombre);

    const cuentaIds = cuentas.map(c => c.id);
    let compartidos: Array<{ id: number; cuentaId: number; negocioId: number; fechaAsignacion: Date | null }> = [];
    if (cuentaIds.length > 0) {
      compartidos = await db.select().from(cuentaNegocio).where(inArray(cuentaNegocio.cuentaId, cuentaIds));
    }

    return cuentas.map(c => ({
      ...c,
      negociosCompartidos: compartidos.filter(comp => comp.cuentaId === c.id)
    }));
  }

  async obtener(id: number, negocioId?: number) {
    const conditions = [eq(cuentasBanco.id, id)];
    if (negocioId) {
      conditions.push(eq(cuentasBanco.negocioId, negocioId)); 
    }
    const [cuenta] = await db.select().from(cuentasBanco).where(and(...conditions)).limit(1);
    if (cuenta) {
      const compartidos = await db.select().from(cuentaNegocio).where(eq(cuentaNegocio.cuentaId, cuenta.id));
      return { ...cuenta, negociosCompartidos: compartidos };
    }
    return cuenta;
  }

  async asignarNegocio(cuentaId: number, negocioId: number) {
    return await db.transaction(async (tx) => {
      const [cuenta] = await tx.select().from(cuentasBanco).where(eq(cuentasBanco.id, cuentaId)).limit(1);
      if (!cuenta) throw new Error('Cuenta no encontrada');
      if (cuenta.esGlobal) throw new Error('No se pueden asignar negocios a una cuenta global');

      const [negocio] = await tx.select().from(negocios).where(eq(negocios.id, negocioId)).limit(1);
      if (!negocio) throw new Error('Negocio no encontrado');

      const [existente] = await tx.select().from(cuentaNegocio).where(and(eq(cuentaNegocio.cuentaId, cuentaId), eq(cuentaNegocio.negocioId, negocioId))).limit(1);
      if (!existente) {
        await tx.insert(cuentaNegocio).values({ cuentaId, negocioId });
      }

      const [updated] = await tx.select().from(cuentasBanco).where(eq(cuentasBanco.id, cuentaId)).limit(1);
      const compartidos = await tx.select().from(cuentaNegocio).where(eq(cuentaNegocio.cuentaId, cuentaId));
      return { ...updated, negociosCompartidos: compartidos };
    });
  }

  async removerNegocio(cuentaId: number, negocioId: number) {
    return await db.transaction(async (tx) => {
      const [cuenta] = await tx.select().from(cuentasBanco).where(eq(cuentasBanco.id, cuentaId)).limit(1);
      if (!cuenta) throw new Error('Cuenta no encontrada');

      const compartidos = await tx.select().from(cuentaNegocio).where(eq(cuentaNegocio.cuentaId, cuentaId));
      
      if (!cuenta.esGlobal && cuenta.negocioId === null && compartidos.length === 1 && compartidos[0]?.negocioId === negocioId) {
        throw new Error('No se puede remover el último negocio de una cuenta no global');
      }

      await tx.delete(cuentaNegocio).where(and(eq(cuentaNegocio.cuentaId, cuentaId), eq(cuentaNegocio.negocioId, negocioId)));

      const [updated] = await tx.select().from(cuentasBanco).where(eq(cuentasBanco.id, cuentaId)).limit(1);
      const compartidosFinal = await tx.select().from(cuentaNegocio).where(eq(cuentaNegocio.cuentaId, cuentaId));
      return { ...updated, negociosCompartidos: compartidosFinal };
    });
  }

  async crear(data: CreateCuentaBancoInput) {
    if (!data.esGlobal && !data.negocioId && (!data.negociosCompartidos || data.negociosCompartidos.length === 0)) {
      throw new Error('Debe especificar al menos un negocio o marcar la cuenta como global');
    }

    return await db.transaction(async (tx) => {
      let negocioIdPrincipal = data.negocioId ?? null;
      const esGlobal = data.esGlobal ?? false;
      
      if (esGlobal) {
        negocioIdPrincipal = null;
      } else if (!negocioIdPrincipal && data.negociosCompartidos && data.negociosCompartidos.length > 0) {
        negocioIdPrincipal = data.negociosCompartidos[0] ?? null;
      }

      const [cuenta] = await tx
        .insert(cuentasBanco)
        .values({
          nombre: data.nombre,
          tipo: data.tipo,
          bancoInstitucion: data.bancoInstitucion || null,
          titular: data.titular || null,
          negocioId: negocioIdPrincipal,
          esGlobal: esGlobal,
          saldoInicial: data.saldoInicial?.toString() || '0',
        })
        .returning();

      if (!cuenta) {
        throw new Error('Error al crear la cuenta');
      }

      if (!esGlobal && data.negociosCompartidos && data.negociosCompartidos.length > 0) {
        const uniqueNegocios = Array.from(new Set(data.negociosCompartidos));
        const existentes = await tx.select({ id: negocios.id }).from(negocios).where(inArray(negocios.id, uniqueNegocios));
        if (existentes.length !== uniqueNegocios.length) {
          throw new Error('Uno o más negocios compartidos no existen');
        }

        const values = uniqueNegocios.map(nid => ({
          cuentaId: cuenta.id,
          negocioId: nid
        }));
        await tx.insert(cuentaNegocio).values(values);
      }

      return cuenta;
    });
  }

  async actualizar(id: number, data: UpdateCuentaBancoInput) {
    return await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(cuentasBanco).where(eq(cuentasBanco.id, id)).limit(1);
      if (!existing) throw new Error('Cuenta no encontrada');

      const esGlobalNuevo = data.esGlobal ?? existing.esGlobal;
      let negocioIdNuevo = data.negocioId !== undefined ? data.negocioId : existing.negocioId;
      
      if (esGlobalNuevo) {
        negocioIdNuevo = null;
      }

      const [cuenta] = await tx
        .update(cuentasBanco)
        .set({
          ...data,
          negocioId: negocioIdNuevo,
          esGlobal: esGlobalNuevo,
          saldoReal: data.saldoReal?.toString(),
          updatedAt: new Date(),
        })
        .where(eq(cuentasBanco.id, id))
        .returning();

      if (!cuenta) {
        throw new Error('Error al actualizar la cuenta');
      }

      if (esGlobalNuevo) {
        await tx.delete(cuentaNegocio).where(eq(cuentaNegocio.cuentaId, id));
      } else if (data.negociosCompartidos !== undefined) {
        const currentCompartidos = await tx.select({ negocioId: cuentaNegocio.negocioId }).from(cuentaNegocio).where(eq(cuentaNegocio.cuentaId, id));
        const currentIds = currentCompartidos.map(c => c.negocioId);
        const newIds = Array.from(new Set(data.negociosCompartidos));

        const toDelete = currentIds.filter(nid => !newIds.includes(nid));
        const toInsert = newIds.filter(nid => !currentIds.includes(nid));

        if (toDelete.length > 0) {
          await tx.delete(cuentaNegocio).where(and(eq(cuentaNegocio.cuentaId, id), inArray(cuentaNegocio.negocioId, toDelete)));
        }

        if (toInsert.length > 0) {
          const existentes = await tx.select({ id: negocios.id }).from(negocios).where(inArray(negocios.id, toInsert));
          if (existentes.length !== toInsert.length) {
            throw new Error('Uno o más negocios compartidos no existen');
          }
          const values = toInsert.map(nid => ({ cuentaId: id, negocioId: nid }));
          await tx.insert(cuentaNegocio).values(values);
        }
      }

      return cuenta;
    });
  }

  async actualizarSaldoReal(id: number, saldoReal: number) {
    const [cuenta] = await db
      .update(cuentasBanco)
      .set({
        saldoReal: saldoReal.toString(),
        fechaSaldoReal: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(cuentasBanco.id, id))
      .returning();
    return cuenta;
  }

  async calcularSaldo(cuentaBancoId: number): Promise<SaldoCalculado> {
    const cuenta = await this.obtener(cuentaBancoId);
    if (!cuenta) throw new Error('Cuenta no encontrada');

    const result = await db
      .select({
        ingresos: sql<string>`COALESCE(SUM(CASE WHEN tipo IN ('INGRESO', 'TRASPASO_ENTRADA') THEN monto ELSE 0 END), 0)`,
        egresos: sql<string>`COALESCE(SUM(CASE WHEN tipo IN ('EGRESO', 'TRASPASO_SALIDA') THEN monto ELSE 0 END), 0)`,
      })
      .from(movimientos)
      .where(and(eq(movimientos.cuentaBancoId, cuentaBancoId), eq(movimientos.estado, 'PAGADO'), eq(movimientos.activo, true)));

    const ingresos = parseFloat(result[0]?.ingresos || '0');
    const egresos = parseFloat(result[0]?.egresos || '0');
    const saldoInicial = parseFloat(cuenta.saldoInicial);
    const saldoCalculado = saldoInicial + ingresos - egresos;
    const saldoReal = cuenta.saldoReal ? parseFloat(cuenta.saldoReal) : null;

    const pendientes = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(movimientos)
      .where(and(eq(movimientos.cuentaBancoId, cuentaBancoId), eq(movimientos.estado, 'PENDIENTE'), eq(movimientos.activo, true)));

    return {
      cuentaBancoId,
      saldoInicial,
      ingresos,
      egresos,
      saldoCalculado,
      saldoReal,
      diferencia: saldoReal !== null ? saldoReal - saldoCalculado : null,
      movimientosPendientes: pendientes[0]?.count || 0,
    };
  }

  async calcularArqueoCuenta(cuentaBancoId: number, fechaCorte: string): Promise<ArqueoCuentaBanco> {
    const cuenta = await this.obtener(cuentaBancoId);
    if (!cuenta || !cuenta.activo) {
      throw new Error('Cuenta no encontrada');
    }

    const movimientosWhere = and(
      eq(movimientos.cuentaBancoId, cuentaBancoId),
      eq(movimientos.activo, true),
      lte(movimientos.fecha, fechaCorte)
    );

    const result = await db
      .select({
        ingreso: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.estado} = 'PAGADO' AND ${movimientos.tipo} = 'INGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        egreso: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.estado} = 'PAGADO' AND ${movimientos.tipo} = 'EGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        traspasoEntrada: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.estado} = 'PAGADO' AND ${movimientos.tipo} = 'TRASPASO_ENTRADA' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        traspasoSalida: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.estado} = 'PAGADO' AND ${movimientos.tipo} = 'TRASPASO_SALIDA' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        movimientosAprobadosNoPagados: sql<number>`COALESCE(SUM(CASE WHEN ${movimientos.estado} = 'APROBADO' THEN 1 ELSE 0 END), 0)`,
        totalAprobadoNoPagado: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.estado} = 'APROBADO' AND ${movimientos.tipo} IN ('INGRESO', 'TRASPASO_ENTRADA') THEN ${movimientos.monto} WHEN ${movimientos.estado} = 'APROBADO' AND ${movimientos.tipo} IN ('EGRESO', 'TRASPASO_SALIDA') THEN -${movimientos.monto} ELSE 0 END), 0)`,
      })
      .from(movimientos)
      .where(movimientosWhere);

    const ingreso = this.parseMoney(result[0]?.ingreso);
    const egreso = this.parseMoney(result[0]?.egreso);
    const traspasoEntrada = this.parseMoney(result[0]?.traspasoEntrada);
    const traspasoSalida = this.parseMoney(result[0]?.traspasoSalida);
    const saldoInicial = this.parseMoney(cuenta.saldoInicial);
    const saldoCalculado = saldoInicial + ingreso + traspasoEntrada - egreso - traspasoSalida;
    const saldoReal = cuenta.saldoReal ? this.parseMoney(cuenta.saldoReal) : null;
    const estadoArqueo = this.getEstadoArqueo({ saldoReal, saldoCalculado });
 
    const pendientes = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(movimientos)
      .where(
        and(
          eq(movimientos.cuentaBancoId, cuentaBancoId),
          eq(movimientos.activo, true),
          eq(movimientos.estado, 'PENDIENTE'),
          lte(movimientos.fecha, fechaCorte)
        )
      );

    return {
      cuentaBancoId,
      negocioId: cuenta.negocioId,
      fechaCorte,
      saldoInicial,
      ingreso,
      egreso,
      traspasoEntrada,
      traspasoSalida,
      saldoCalculado,
      saldoReal,
      fechaSaldoReal: cuenta.fechaSaldoReal ? cuenta.fechaSaldoReal.toISOString() : null,
      diferencia: saldoReal !== null ? saldoReal - saldoCalculado : null,
      estadoArqueo,
      movimientosPendientes: pendientes[0]?.count || 0,
      movimientosAprobadosNoPagados: Number(result[0]?.movimientosAprobadosNoPagados ?? 0),
      totalAprobadoNoPagado: result[0]?.totalAprobadoNoPagado ?? '0',
    };
  }

  async calcularArqueoNegocio(negocioId: number, fechaCorte: string): Promise<ArqueoNegocio | null> {
    const [negocio] = await db.select({ id: negocios.id }).from(negocios).where(eq(negocios.id, negocioId)).limit(1);
    if (!negocio) return null;

    const rows = await db
      .select({
        cuentaBancoId: cuentasBanco.id,
        nombre: cuentasBanco.nombre,
        tipo: cuentasBanco.tipo,
        saldoInicial: cuentasBanco.saldoInicial,
        saldoReal: cuentasBanco.saldoReal,
        fechaSaldoReal: cuentasBanco.fechaSaldoReal,
        ingreso: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.estado} = 'PAGADO' AND ${movimientos.tipo} = 'INGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        egreso: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.estado} = 'PAGADO' AND ${movimientos.tipo} = 'EGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        traspasoEntrada: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.estado} = 'PAGADO' AND ${movimientos.tipo} = 'TRASPASO_ENTRADA' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        traspasoSalida: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.estado} = 'PAGADO' AND ${movimientos.tipo} = 'TRASPASO_SALIDA' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        movimientosPendientes: sql<number>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.estado} = 'PENDIENTE' THEN 1 ELSE 0 END), 0)`,
        movimientosAprobadosNoPagados: sql<number>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.estado} = 'APROBADO' THEN 1 ELSE 0 END), 0)`,
        totalAprobadoNoPagado: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.estado} = 'APROBADO' AND ${movimientos.tipo} IN ('INGRESO', 'TRASPASO_ENTRADA') THEN ${movimientos.monto} WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.estado} = 'APROBADO' AND ${movimientos.tipo} IN ('EGRESO', 'TRASPASO_SALIDA') THEN -${movimientos.monto} ELSE 0 END), 0)`,
      })
      .from(cuentasBanco)
      .leftJoin(
        movimientos,
        and(
          eq(movimientos.cuentaBancoId, cuentasBanco.id),
          eq(movimientos.negocioId, negocioId),
          eq(movimientos.activo, true),
          lte(movimientos.fecha, fechaCorte)
        )
      )
      .where(and(eq(cuentasBanco.negocioId, negocioId), eq(cuentasBanco.activo, true)))
      .groupBy(
        cuentasBanco.id,
        cuentasBanco.nombre,
        cuentasBanco.tipo,
        cuentasBanco.saldoInicial,
        cuentasBanco.saldoReal,
        cuentasBanco.fechaSaldoReal
      )
      .orderBy(cuentasBanco.nombre);

    const cuentas = rows.map((r) => {
      const saldoInicial = this.parseMoney(r.saldoInicial);
      const ingreso = this.parseMoney(r.ingreso);
      const egreso = this.parseMoney(r.egreso);
      const traspasoEntrada = this.parseMoney(r.traspasoEntrada);
      const traspasoSalida = this.parseMoney(r.traspasoSalida);
      const saldoCalculado = saldoInicial + ingreso + traspasoEntrada - egreso - traspasoSalida;
      const saldoReal = r.saldoReal ? this.parseMoney(r.saldoReal) : null;
      const estadoArqueo = this.getEstadoArqueo({ saldoReal, saldoCalculado });

      return {
        cuentaBancoId: r.cuentaBancoId,
        nombre: r.nombre,
        tipo: r.tipo,
        saldoInicial,
        ingreso,
        egreso,
        traspasoEntrada,
        traspasoSalida,
        saldoCalculado,
        saldoReal,
        fechaSaldoReal: r.fechaSaldoReal ? r.fechaSaldoReal.toISOString() : null,
        diferencia: saldoReal !== null ? saldoReal - saldoCalculado : null,
        estadoArqueo,
        movimientosPendientes: Number(r.movimientosPendientes ?? 0),
        movimientosAprobadosNoPagados: Number(r.movimientosAprobadosNoPagados ?? 0),
        totalAprobadoNoPagado: r.totalAprobadoNoPagado ?? '0',
      };
    });

    const totalesBase = cuentas.reduce(
      (acc, c) => {
        acc.saldoInicial += c.saldoInicial;
        acc.ingreso += c.ingreso;
        acc.egreso += c.egreso;
        acc.traspasoEntrada += c.traspasoEntrada;
        acc.traspasoSalida += c.traspasoSalida;
        acc.movimientosPendientes += c.movimientosPendientes;
        acc.movimientosAprobadosNoPagados += c.movimientosAprobadosNoPagados;
        acc.totalAprobadoNoPagado += this.parseMoney(c.totalAprobadoNoPagado);
        if (c.saldoReal === null) {
          acc.cuentasSinSaldoReal += 1;
        } else {
          acc.saldoReal += c.saldoReal;
        }
        return acc;
      },
      {
        saldoInicial: 0,
        ingreso: 0,
        egreso: 0,
        traspasoEntrada: 0,
        traspasoSalida: 0,
        saldoReal: 0,
        cuentasSinSaldoReal: 0,
        movimientosPendientes: 0,
        movimientosAprobadosNoPagados: 0,
        totalAprobadoNoPagado: 0,
      }
    );

    const saldoCalculado =
      totalesBase.saldoInicial + totalesBase.ingreso + totalesBase.traspasoEntrada - totalesBase.egreso - totalesBase.traspasoSalida;
    const saldoRealTotal = totalesBase.cuentasSinSaldoReal === cuentas.length ? null : totalesBase.saldoReal;
    const estadoArqueo = this.getEstadoArqueo({ saldoReal: saldoRealTotal, saldoCalculado });

    return {
      negocioId,
      fechaCorte,
      cuentas,
      totales: {
        saldoInicial: totalesBase.saldoInicial,
        ingreso: totalesBase.ingreso,
        egreso: totalesBase.egreso,
        traspasoEntrada: totalesBase.traspasoEntrada,
        traspasoSalida: totalesBase.traspasoSalida,
        saldoCalculado,
        saldoReal: saldoRealTotal,
        diferencia: saldoRealTotal !== null ? saldoRealTotal - saldoCalculado : null,
        estadoArqueo,
        cuentasSinSaldoReal: totalesBase.cuentasSinSaldoReal,
        movimientosPendientes: totalesBase.movimientosPendientes,
      },
    };
  }

  async eliminar(id: number) {
    const [cuenta] = await db
      .update(cuentasBanco)
      .set({ activo: false, updatedAt: new Date() })
      .where(eq(cuentasBanco.id, id))
      .returning();
    return cuenta;
  }
}
