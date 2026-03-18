import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { getRequestContext } from '@/lib/audit-logger';
import { MovimientoService } from '@/services/movimiento.service';

const movimientoService = new MovimientoService();

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  negocioId: z.number().int().positive('Negocio requerido'),
  cuentaOrigenId: z.number().int().positive('Cuenta origen requerida'),
  cuentaDestinoId: z.number().int().positive('Cuenta destino requerida'),
  monto: z.number().positive('Monto debe ser positivo'),
  concepto: z.string().min(1, 'Concepto requerido'),
  fecha: z.string().min(1, 'Fecha requerida'),
});

function normalizeDateParam(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Fecha inválida');
  }
  return parsed.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  const authz = authorizeRequest(auth, request.method);
  if (!authz.authorized) {
    return forbiddenResponse(authz.error);
  }

  try {
    const body: unknown = await request.json();
    const validated = bodySchema.parse(body);

    if (validated.cuentaOrigenId === validated.cuentaDestinoId) {
      return NextResponse.json({ success: false, error: 'La cuenta origen y destino deben ser diferentes' }, { status: 400 });
    }

    if (auth.user!.rol !== 'Dueño' && !auth.user!.negocios.includes(validated.negocioId)) {
      return forbiddenResponse('No tienes acceso a este negocio');
    }

    const fecha = normalizeDateParam(validated.fecha);

    const created = await movimientoService.crearTraspasoBancario({
      negocioId: validated.negocioId,
      cuentaOrigenId: validated.cuentaOrigenId,
      cuentaDestinoId: validated.cuentaDestinoId,
      monto: validated.monto,
      concepto: validated.concepto,
      fecha,
      creadoPor: auth.user!.userId,
    });

    const tenant = { negocioId: validated.negocioId, isOwner: auth.user!.rol === 'Dueño', negociosAccesibles: auth.user!.negocios };
    const ctx = getRequestContext(request);

    return NextResponse.json(
      {
        success: true,
        data: created,
        tenant,
        requestId: ctx.requestId,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    const message = (error as Error).message || 'Error interno del servidor';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

