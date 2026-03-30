import { and, eq, lte, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { cuentasBanco, movimientos, negocios } from '@/lib/drizzle';
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

  async listar(negocioId: number) {
    return db
      .select()
      .from(cuentasBanco)
      .where(and(eq(cuentasBanco.negocioId, negocioId), eq(cuentasBanco.activo, true)))
      .orderBy(cuentasBanco.nombre);
  }

  async obtener(id: number, negocioId?: number) {
    const conditions = [eq(cuentasBanco.id, id)];
    if (negocioId) {
      conditions.push(eq(cuentasBanco.negocioId, negocioId));
    }
    const [cuenta] = await db.select().from(cuentasBanco).where(and(...conditions)).limit(1);
    return cuenta;
  }

  async crear(data: CreateCuentaBancoInput) {
    const [cuenta] = await db
      .insert(cuentasBanco)
      .values({
        nombre: data.nombre,
        tipo: data.tipo,
        bancoInstitucion: data.bancoInstitucion || null,
        titular: data.titular || null,
        negocioId: data.negocioId,
        saldoInicial: data.saldoInicial?.toString() || '0',
      })
      .returning();
    return cuenta;
  }

  async actualizar(id: number, data: UpdateCuentaBancoInput) {
    const [cuenta] = await db
      .update(cuentasBanco)
      .set({
        ...data,
        saldoReal: data.saldoReal?.toString(),
        updatedAt: new Date(),
      })
      .where(eq(cuentasBanco.id, id))
      .returning();
    return cuenta;
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
      .where(and(eq(movimientos.cuentaBancoId, cuentaBancoId), eq(movimientos.estado, 'APROBADO'), eq(movimientos.activo, true)));

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

    const aprobadosWhere = and(
      eq(movimientos.cuentaBancoId, cuentaBancoId),
      eq(movimientos.activo, true),
      eq(movimientos.estado, 'APROBADO'),
      lte(movimientos.fecha, fechaCorte)
    );

    const result = await db
      .select({
        ingreso: sql<string>`COALESCE(SUM(CASE WHEN tipo = 'INGRESO' THEN monto ELSE 0 END), 0)`,
        egreso: sql<string>`COALESCE(SUM(CASE WHEN tipo = 'EGRESO' THEN monto ELSE 0 END), 0)`,
        traspasoEntrada: sql<string>`COALESCE(SUM(CASE WHEN tipo = 'TRASPASO_ENTRADA' THEN monto ELSE 0 END), 0)`,
        traspasoSalida: sql<string>`COALESCE(SUM(CASE WHEN tipo = 'TRASPASO_SALIDA' THEN monto ELSE 0 END), 0)`,
      })
      .from(movimientos)
      .where(aprobadosWhere);

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
        ingreso: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.estado} = 'APROBADO' AND ${movimientos.tipo} = 'INGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        egreso: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.estado} = 'APROBADO' AND ${movimientos.tipo} = 'EGRESO' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        traspasoEntrada: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.estado} = 'APROBADO' AND ${movimientos.tipo} = 'TRASPASO_ENTRADA' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        traspasoSalida: sql<string>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.estado} = 'APROBADO' AND ${movimientos.tipo} = 'TRASPASO_SALIDA' THEN ${movimientos.monto} ELSE 0 END), 0)`,
        movimientosPendientes: sql<number>`COALESCE(SUM(CASE WHEN ${movimientos.id} IS NOT NULL AND ${movimientos.estado} = 'PENDIENTE' THEN 1 ELSE 0 END), 0)`,
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
