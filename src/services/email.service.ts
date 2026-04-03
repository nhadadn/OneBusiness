import { Resend } from 'resend';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import { negocios, usuarios } from '@/lib/drizzle';
import type { Movimiento } from '@/types/movimiento.types';

type EmailPersona = { email: string; nombre: string };

function formatDate(value: unknown): string {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export class EmailService {
  private getFromEmail(): string {
    return process.env.RESEND_FROM_EMAIL || 'OneBusiness <notificaciones@onebusiness.app>';
  }

  private getAppUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }

  private getResendClient(): Resend | null {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('RESEND_API_KEY no está configurada');
      }
      console.warn('RESEND_API_KEY no está configurada; email omitido');
      return null;
    }
    return new Resend(apiKey);
  }

  private async obtenerEmailCreador(creadoPor: number): Promise<EmailPersona | null> {
    const [row] = await db
      .select({ email: usuarios.email, nombre: usuarios.nombreCompleto })
      .from(usuarios)
      .where(eq(usuarios.id, creadoPor))
      .limit(1);
    if (!row) return null;
    return { email: row.email, nombre: row.nombre };
  }

  private async obtenerNombreNegocio(negocioId: number): Promise<string> {
    const [row] = await db.select({ nombre: negocios.nombre }).from(negocios).where(eq(negocios.id, negocioId)).limit(1);
    return row?.nombre || `Negocio #${negocioId}`;
  }

  private getMovimientoUrl(movimientoId: number): string {
    return `${this.getAppUrl()}/movimientos/${movimientoId}`;
  }

  private buildTemplateBase(params: {
    titulo: string;
    mensaje: string;
    nombreNegocio: string;
    movimiento: Movimiento;
    extraHtml?: string;
  }): string {
    const monto = formatCurrency(parseFloat(params.movimiento.monto || '0'));
    const fecha = formatDate(params.movimiento.fecha);
    const url = this.getMovimientoUrl(params.movimiento.id);

    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2 style="margin: 0 0 12px;">${params.titulo}</h2>
        <p style="margin: 0 0 16px;">${params.mensaje}</p>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin: 0 0 16px;">
          <div><strong>Negocio:</strong> ${params.nombreNegocio}</div>
          <div><strong>Concepto:</strong> ${params.movimiento.concepto}</div>
          <div><strong>Monto:</strong> ${monto}</div>
          <div><strong>Fecha:</strong> ${fecha}</div>
        </div>
        ${params.extraHtml || ''}
        <p style="margin: 0;">
          <a href="${url}" style="display:inline-block; padding:10px 14px; background:#111827; color:#ffffff; border-radius:6px; text-decoration:none;">
            Ver movimiento
          </a>
        </p>
      </div>
    `;
  }

  async notificarNuevoPendiente(movimiento: Movimiento, aprobadores: EmailPersona[]) {
    const resend = this.getResendClient();
    if (!resend) return;

    const nombreNegocio = await this.obtenerNombreNegocio(movimiento.negocioId);
    const subject = `Nueva solicitud de aprobación - ${movimiento.concepto} - ${formatCurrency(parseFloat(movimiento.monto || '0'))}`;

    await Promise.all(
      aprobadores.map((aprobador) =>
        resend.emails.send({
          from: this.getFromEmail(),
          to: aprobador.email,
          subject,
          html: this.buildTemplateBase({
            titulo: `Hola ${aprobador.nombre},`,
            mensaje: 'Tienes un nuevo movimiento pendiente de aprobación.',
            nombreNegocio,
            movimiento,
          }),
        })
      )
    );
  }

  async notificarAprobacion(movimiento: Movimiento) {
    const resend = this.getResendClient();
    if (!resend) return;

    const creador = await this.obtenerEmailCreador(movimiento.creadoPor);
    if (!creador) return;

    const nombreNegocio = await this.obtenerNombreNegocio(movimiento.negocioId);
    const subject = `✅ Movimiento aprobado - ${movimiento.concepto} - ${formatCurrency(parseFloat(movimiento.monto || '0'))}`;

    await resend.emails.send({
      from: this.getFromEmail(),
      to: creador.email,
      subject,
      html: this.buildTemplateBase({
        titulo: `Hola ${creador.nombre},`,
        mensaje: 'Tu movimiento fue aprobado.',
        nombreNegocio,
        movimiento,
      }),
    });
  }

  async notificarRechazo(movimiento: Movimiento, motivo: string) {
    const resend = this.getResendClient();
    if (!resend) return;

    const creador = await this.obtenerEmailCreador(movimiento.creadoPor);
    if (!creador) return;

    const nombreNegocio = await this.obtenerNombreNegocio(movimiento.negocioId);
    const subject = `❌ Movimiento rechazado - ${movimiento.concepto}`;

    await resend.emails.send({
      from: this.getFromEmail(),
      to: creador.email,
      subject,
      html: this.buildTemplateBase({
        titulo: `Hola ${creador.nombre},`,
        mensaje: 'Tu movimiento fue rechazado.',
        nombreNegocio,
        movimiento,
        extraHtml: `
          <div style="border-left: 4px solid #dc2626; padding: 10px 12px; background:#fef2f2; margin: 0 0 16px;">
            <div style="color:#b91c1c;"><strong>Motivo de rechazo:</strong></div>
            <div style="color:#b91c1c;">${motivo}</div>
          </div>
        `,
      }),
    });
  }

  async notificarEdicionRequiereAprobacion(movimiento: Movimiento, aprobadores: EmailPersona[]) {
    const resend = this.getResendClient();
    if (!resend) return;

    const nombreNegocio = await this.obtenerNombreNegocio(movimiento.negocioId);
    const subject = `⚠️ Movimiento editado, requiere re-aprobación - ${movimiento.concepto}`;

    await Promise.all(
      aprobadores.map((aprobador) =>
        resend.emails.send({
          from: this.getFromEmail(),
          to: aprobador.email,
          subject,
          html: this.buildTemplateBase({
            titulo: `Hola ${aprobador.nombre},`,
            mensaje: 'Un movimiento aprobado fue editado y requiere re-aprobación.',
            nombreNegocio,
            movimiento,
          }),
        })
      )
    );
  }

  async notificarReenvio(movimiento: Movimiento, aprobadores: EmailPersona[]) {
    const resend = this.getResendClient();
    if (!resend) return;

    const nombreNegocio = await this.obtenerNombreNegocio(movimiento.negocioId);
    const subject = `🔄 Movimiento corregido, pendiente revisión - ${movimiento.concepto}`;

    await Promise.all(
      aprobadores.map((aprobador) =>
        resend.emails.send({
          from: this.getFromEmail(),
          to: aprobador.email,
          subject,
          html: this.buildTemplateBase({
            titulo: `Hola ${aprobador.nombre},`,
            mensaje: 'Un movimiento rechazado fue corregido y reenviado para revisión.',
            nombreNegocio,
            movimiento,
          }),
        })
      )
    );
  }
}

