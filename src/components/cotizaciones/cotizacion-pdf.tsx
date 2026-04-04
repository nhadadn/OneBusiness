import * as React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

import { formatCurrency } from '@/lib/format';

type CotizacionPDFProps = {
  cotizacion: {
    folio: string;
    folioExterno?: string | null;
    fecha: string;
    clienteNombre: string;
    clienteRfc?: string | null;
    clienteDireccion?: string | null;
    numeroOc?: string | null;
    numeroFactura?: string | null;
    subtotal: string;
    iva: string;
    total: string;
    notas?: string | null;
    negocio: {
      nombre: string;
      rfc?: string | null;
      direccion?: string | null;
      telefono?: string | null;
    };
    items: Array<{
      orden: number;
      descripcion: string;
      unidadMedida?: string | null;
      cantidad?: string | null;
      precioUnitario?: string | null;
      importe: string;
    }>;
  };
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingRight: 40,
    paddingBottom: 40,
    paddingLeft: 40,
    fontSize: 10,
    color: '#333333',
    fontFamily: 'Helvetica',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeft: {
    width: '60%',
  },
  headerRight: {
    width: '40%',
    alignItems: 'flex-end',
  },
  negocioNombre: {
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 0.2,
  },
  textMuted: {
    color: '#666666',
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#1a1a2e',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    marginTop: 10,
    marginBottom: 10,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 6,
    paddingRight: 6,
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 6,
    paddingRight: 6,
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  cell: {
    paddingRight: 6,
  },
  cellRight: {
    textAlign: 'right',
    paddingRight: 0,
    paddingLeft: 6,
  },
  colOrden: { width: '5%' },
  colDesc: { width: '40%' },
  colUm: { width: '10%' },
  colCant: { width: '10%' },
  colPUnit: { width: '17%' },
  colImporte: { width: '18%' },
  totalsWrap: {
    marginTop: 10,
    alignSelf: 'flex-end',
    width: '40%',
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 2,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 12,
    paddingRight: 12,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalsDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    marginTop: 6,
    marginBottom: 6,
  },
  totalStrong: {
    fontSize: 12,
    fontWeight: 700,
  },
  clausulasText: {
    fontSize: 8,
    color: '#666666',
    lineHeight: 1.35,
  },
  firmaWrap: {
    marginTop: 36,
    alignItems: 'center',
  },
  firmaLine: {
    width: '60%',
    borderTopWidth: 1,
    borderTopColor: '#333333',
    marginBottom: 6,
  },
  firmaNombre: {
    fontSize: 10,
    fontWeight: 700,
  },
});

function formatearFechaDMY(fecha: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year}`;
  }
  return fecha;
}

function formatearMontoMXN(valor: string | null | undefined): string {
  if (!valor) return '—';
  const parsed = Number.parseFloat(valor);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return '—';
  return formatCurrency(parsed);
}

function formatearNumero(valor: string | null | undefined): string {
  if (!valor) return '—';
  const parsed = Number.parseFloat(valor);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return '—';
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 4 }).format(parsed);
}

export function CotizacionPDF({ cotizacion }: CotizacionPDFProps) {
  const negocioNombre = cotizacion.negocio.nombre?.trim() ? cotizacion.negocio.nombre.toUpperCase() : '';
  const negocioRfc = cotizacion.negocio.rfc?.trim() ? cotizacion.negocio.rfc.trim() : null;
  const negocioDireccion = cotizacion.negocio.direccion?.trim() ? cotizacion.negocio.direccion.trim() : null;
  const negocioTelefono = cotizacion.negocio.telefono?.trim() ? cotizacion.negocio.telefono.trim() : null;

  const clienteRfc = cotizacion.clienteRfc?.trim() ? cotizacion.clienteRfc.trim() : null;
  const clienteDireccion = cotizacion.clienteDireccion?.trim() ? cotizacion.clienteDireccion.trim() : null;

  const numeroOc = cotizacion.numeroOc?.trim() ? cotizacion.numeroOc.trim() : null;
  const numeroFactura = cotizacion.numeroFactura?.trim() ? cotizacion.numeroFactura.trim() : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.negocioNombre}>{negocioNombre}</Text>
            {negocioRfc ? <Text>{`RFC: ${negocioRfc}`}</Text> : null}
            {negocioDireccion ? <Text>{negocioDireccion}</Text> : null}
            {negocioTelefono ? <Text>{`Tel: ${negocioTelefono}`}</Text> : null}
          </View>

          <View style={styles.headerRight}>
            <Text style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>COTIZACIÓN</Text>
            <Text>{`Folio: ${cotizacion.folio}`}</Text>
            <Text>{`Fecha: ${formatearFechaDMY(cotizacion.fecha)}`}</Text>
            {numeroOc ? <Text>{`OC: ${numeroOc}`}</Text> : null}
            {numeroFactura ? <Text>{`Factura: ${numeroFactura}`}</Text> : null}
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Cliente</Text>
        <View>
          <Text style={{ fontWeight: 700 }}>{cotizacion.clienteNombre}</Text>
          {clienteRfc ? <Text>{`RFC: ${clienteRfc}`}</Text> : null}
          {clienteDireccion ? <Text>{clienteDireccion}</Text> : null}
        </View>

        <View style={styles.divider} />

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colOrden]}>#</Text>
            <Text style={[styles.tableHeaderText, styles.colDesc]}>Descripción</Text>
            <Text style={[styles.tableHeaderText, styles.colUm]}>U.M.</Text>
            <Text style={[styles.tableHeaderText, styles.colCant, styles.cellRight]}>Cantidad</Text>
            <Text style={[styles.tableHeaderText, styles.colPUnit, styles.cellRight]}>P. Unitario</Text>
            <Text style={[styles.tableHeaderText, styles.colImporte, styles.cellRight]}>Importe</Text>
          </View>

          {cotizacion.items.map((item, index) => {
            const rowStyle = index % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : [styles.tableRow];
            const um = item.unidadMedida?.trim() ? item.unidadMedida.trim() : '—';
            const cant = item.cantidad ? formatearNumero(item.cantidad) : '—';
            const punit = item.precioUnitario ? formatearMontoMXN(item.precioUnitario) : '—';
            const importe = formatearMontoMXN(item.importe);

            return (
              <View key={item.orden ?? index} style={rowStyle}>
                <Text style={[styles.cell, styles.colOrden]}>{String(item.orden)}</Text>
                <Text style={[styles.cell, styles.colDesc]}>{item.descripcion}</Text>
                <Text style={[styles.cell, styles.colUm]}>{um}</Text>
                <Text style={[styles.colCant, styles.cellRight]}>{cant}</Text>
                <Text style={[styles.colPUnit, styles.cellRight]}>{punit}</Text>
                <Text style={[styles.colImporte, styles.cellRight]}>{importe}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.totalsWrap}>
          <View style={styles.totalsRow}>
            <Text style={styles.textMuted}>Subtotal:</Text>
            <Text>{formatearMontoMXN(cotizacion.subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.textMuted}>IVA (16%):</Text>
            <Text>{formatearMontoMXN(cotizacion.iva)}</Text>
          </View>
          <View style={styles.totalsDivider} />
          <View style={styles.totalsRow}>
            <Text style={styles.totalStrong}>Total:</Text>
            <Text style={styles.totalStrong}>{formatearMontoMXN(cotizacion.total)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Cláusulas</Text>
        <View>
          <Text style={styles.clausulasText}>• El tiempo de entrega corre a partir de la autorización por orden de compra.</Text>
          <Text style={styles.clausulasText}>• En caso de que las especificaciones varíen esta cotización no tendrá validez.</Text>
          <Text style={styles.clausulasText}>• Vigencia de cotización 15 días hábiles.</Text>
          <Text style={styles.clausulasText}>• Forma de pago: 50% anticipo y el resto contra entrega.</Text>
        </View>

        <View style={styles.firmaWrap}>
          <View style={styles.firmaLine} />
          <Text style={styles.firmaNombre}>Sergio Daniel Madrid Salas</Text>
        </View>
      </Page>
    </Document>
  );
}

export type { CotizacionPDFProps };
