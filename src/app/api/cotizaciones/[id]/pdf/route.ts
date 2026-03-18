import * as React from 'react';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { renderToBuffer } from '@react-pdf/renderer';

import { CotizacionPDF } from '@/components/cotizaciones/cotizacion-pdf';
import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { CotizacionError, CotizacionService } from '@/services/cotizacion.service';

const cotizacionService = new CotizacionService();

export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID inválido'),
});

function handleServiceError(error: unknown): NextResponse {
  if (error instanceof CotizacionError) {
    const status =
      error.code === 'FORBIDDEN' ? 403 : error.code === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
  const message = (error as Error).message || 'Error interno';
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

export async function GET(request: Request, context: { params: { id: string } }) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  const authz = authorizeRequest(auth, request.method);
  if (!authz.authorized) {
    return forbiddenResponse(authz.error);
  }

  try {
    const { id } = paramsSchema.parse(context.params);
    const cotizacionId = Number.parseInt(id, 10);

    const data = await cotizacionService.obtenerCotizacion(cotizacionId, {
      userId: auth.user!.userId,
      rol: auth.user!.rol,
    });

    if (!data) {
      return NextResponse.json({ success: false, error: 'Cotización no encontrada' }, { status: 404 });
    }

    try {
      const element = React.createElement(CotizacionPDF, { cotizacion: data }) as unknown as React.ReactElement;
      const buffer = await renderToBuffer(element);
      const body = new Uint8Array(buffer);

      return new Response(body, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="cotizacion-${data.folio}.pdf"`,
        },
      });
    } catch (error) {
      console.error('PDF generation error', error);
      return NextResponse.json({ success: false, error: 'Error al generar el PDF' }, { status: 500 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    return handleServiceError(error);
  }
}
