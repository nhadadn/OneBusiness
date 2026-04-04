import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { CentroCostoService } from '@/services/centro_costo.service';

export const dynamic = 'force-dynamic';

const centroCostoService = new CentroCostoService();

const listQuerySchema = z.object({
  negocioId: z.coerce.number().int().positive(),
});

const tipoSchema = z.enum(['DIVISION', 'SUBDIVISION']);

const createCentroCostoSchema = z.object({
  negocioId: z.number().int().positive(),
  nombre: z.string().min(1, 'Nombre requerido').max(255, 'Máximo 255 caracteres').trim(),
  codigo: z.string().max(50, 'Máximo 50 caracteres').optional(),
  tipo: tipoSchema,
  padreId: z.number().int().positive().nullable().optional(),
  descripcion: z.string().max(500, 'Máximo 500 caracteres').optional(),
});

function canAccessNegocio(authUser: { rol: string; negocios: number[] }, negocioId: number): boolean {
  return authUser.rol === 'Dueño' || authUser.negocios.includes(negocioId);
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
    const { searchParams } = new URL(request.url);
    const query = listQuerySchema.parse({ negocioId: searchParams.get('negocioId') });

    if (!canAccessNegocio(auth.user!, query.negocioId)) {
      return forbiddenResponse('Sin acceso a este negocio');
    }

    const data = await centroCostoService.listar(query.negocioId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    const message = (error as Error).message || 'Error interno del servidor';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
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

  if (auth.user!.rol !== 'Dueño' && auth.user!.rol !== 'Admin') {
    return forbiddenResponse('Solo Dueño y Admin pueden crear centros de costo');
  }

  try {
    const body: unknown = await request.json();
    const validated = createCentroCostoSchema.parse(body);

    if (!canAccessNegocio(auth.user!, validated.negocioId)) {
      return forbiddenResponse('Sin acceso a este negocio');
    }

    const created = await centroCostoService.crear(validated);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }

    const message = (error as Error).message || 'Error interno del servidor';
    if (message.includes('padre') || message.includes('Nombre') || message.includes('inválido')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    if (message.includes('no encontrado')) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
    if (message.includes('Sin acceso') || message.includes('Solo Dueño') || message.includes('Sin permisos')) {
      return NextResponse.json({ success: false, error: message }, { status: 403 });
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
