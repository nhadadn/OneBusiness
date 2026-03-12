import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { cuentasBanco, movimientos } from '@/lib/drizzle';
import type { CreateCuentaBancoInput, SaldoCalculado, UpdateCuentaBancoInput } from '@/types/cuenta_banco.types';

export class CuentaBancoService {
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

  async eliminar(id: number) {
    const [cuenta] = await db
      .update(cuentasBanco)
      .set({ activo: false, updatedAt: new Date() })
      .where(eq(cuentasBanco.id, id))
      .returning();
    return cuenta;
  }
}
