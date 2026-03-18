import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import * as XLSX from 'xlsx';

import { db } from '@/lib/db';
import { cuentasBanco, negocios } from '@/lib/drizzle';
import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CellWithStyle = XLSX.CellObject & { s?: { font?: { bold?: boolean } } };

function boldHeaderRow(sheet: XLSX.WorkSheet, columns: number) {
  for (let c = 0; c < columns; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    const cell = sheet[addr] as CellWithStyle | undefined;
    if (!cell) continue;
    cell.s = { font: { bold: true } };
  }
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  const authz = authorizeRequest(auth, request.method);
  if (!authz.authorized) {
    return forbiddenResponse(authz.error);
  }

  try {
    const negociosRows = await db
      .select({ id: negocios.id, nombre: negocios.nombre })
      .from(negocios)
      .orderBy(asc(negocios.nombre));

    const cuentasRows = await db
      .select({ id: cuentasBanco.id, nombre: cuentasBanco.nombre, negocioNombre: negocios.nombre })
      .from(cuentasBanco)
      .innerJoin(negocios, eq(cuentasBanco.negocioId, negocios.id))
      .orderBy(asc(negocios.nombre), asc(cuentasBanco.nombre));

    const movimientosData: Array<Array<string>> = [
      ['fecha', 'tipo', 'concepto', 'monto', 'negocio', 'cuenta_banco', 'tercero'],
      ['2026-01-15', 'INGRESO', 'Venta de producto', '5000.00', 'FOODPARK', 'CDM BBVA', 'Cliente Ejemplo SA'],
      ['2026-01-15', 'EGRESO', 'Pago de proveedor', '1200.50', 'FOODPARK', 'CDM BBVA', 'Proveedor Ejemplo'],
      ['2026-01-16', 'INGRESO', 'Cobro de servicio', '3800.00', 'GAS', 'MADSA', ''],
    ];

    const movimientosSheet = XLSX.utils.aoa_to_sheet(movimientosData);
    movimientosSheet['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 28 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 22 }];
    boldHeaderRow(movimientosSheet, 7);

    const instruccionesData: Array<Array<string>> = [
      ['Cómo usar esta plantilla'],
      ['1) Llena la hoja "Movimientos" con tus datos.'],
      ['2) No modifiques los headers (fila 1).'],
      ['3) Guarda el archivo y súbelo en la plataforma para importar.'],
      [''],
      ['Descripción de cada columna'],
      ['fecha: formato YYYY-MM-DD (ej: 2026-01-15)'],
      ['tipo: INGRESO o EGRESO (mayúsculas)'],
      ['concepto: texto libre (máx. 500 caracteres)'],
      ['monto: número mayor a 0, sin comas ni símbolo $ (ej: 1500.00)'],
      ['negocio: nombre exacto del negocio (ver hoja "Catálogos")'],
      ['cuenta_banco: nombre exacto de la cuenta (ver hoja "Catálogos")'],
      ['tercero: opcional (cliente o proveedor)'],
      [''],
      ['Reglas importantes'],
      ['- tipo solo acepta INGRESO o EGRESO (mayúsculas)'],
      ['- monto debe ser mayor a 0, sin comas ni símbolo $'],
      ['- fecha en formato YYYY-MM-DD (ej: 2026-01-15)'],
      ['- negocio y cuenta_banco deben coincidir exactamente con "Catálogos"'],
      ['- tercero es opcional — dejar vacío si no aplica'],
      ['- Máximo 200 filas por importación'],
      [''],
      ['Errores comunes'],
      ['Error frecuente', 'Cómo corregirlo'],
      ['Negocio no encontrado', 'Verifica que el nombre coincida exactamente con la hoja "Catálogos"'],
      ['Cuenta bancaria no encontrada', 'Verifica el nombre y que pertenezca al negocio correcto'],
      ['Monto inválido', 'Usa un número > 0 sin comas ni símbolo $ (ej: 1200.50)'],
      ['Fecha inválida', 'Usa el formato YYYY-MM-DD (ej: 2026-01-15)'],
      ['Tipo inválido', 'Usa únicamente INGRESO o EGRESO (mayúsculas)'],
    ];

    const instruccionesSheet = XLSX.utils.aoa_to_sheet(instruccionesData);
    instruccionesSheet['!cols'] = [{ wch: 48 }, { wch: 52 }];

    const catalogosHeader: Array<string> = [
      'Nombre del Negocio',
      'ID (referencia)',
      '',
      'Nombre de la Cuenta',
      'Negocio al que pertenece',
      'ID (referencia)',
    ];

    const rowsCount = Math.max(negociosRows.length, cuentasRows.length);
    const catalogosData: Array<Array<string | number>> = [catalogosHeader];

    for (let i = 0; i < rowsCount; i++) {
      const negocio = negociosRows[i];
      const cuenta = cuentasRows[i];

      catalogosData.push([
        negocio?.nombre ?? '',
        negocio?.id ?? '',
        '',
        cuenta?.nombre ?? '',
        cuenta?.negocioNombre ?? '',
        cuenta?.id ?? '',
      ]);
    }

    const catalogosSheet = XLSX.utils.aoa_to_sheet(catalogosData);
    catalogosSheet['!cols'] = [{ wch: 26 }, { wch: 16 }, { wch: 2 }, { wch: 26 }, { wch: 26 }, { wch: 16 }];
    boldHeaderRow(catalogosSheet, 6);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, movimientosSheet, 'Movimientos');
    XLSX.utils.book_append_sheet(workbook, instruccionesSheet, 'Instrucciones');
    XLSX.utils.book_append_sheet(workbook, catalogosSheet, 'Catálogos');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', cellStyles: true }) as Buffer;
    const body = new Uint8Array(buffer);

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="plantilla-movimientos.xlsx"',
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'No se pudo generar la plantilla' }, { status: 500 });
  }
}
