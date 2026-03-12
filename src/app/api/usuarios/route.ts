import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { TenantError, validateTenantAccess } from '@/middleware/tenant-middleware';
import { createUsuario, getUsuarios } from '@/services/usuario.service';
import type { RoleName } from '@/types/permissions.types';

export const dynamic = 'force-dynamic';

const roleNameSchema = z.enum(['Dueño', 'Socio', 'Admin', 'Externo']);

const getUsuariosQuerySchema = z.object({
  rol: roleNameSchema.optional(),
  activo: z
    .preprocess((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }, z.boolean().optional())
    .optional(),
});

const createUsuarioSchema = z.object({
  nombreCompleto: z.string().min(1, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Password mínimo 6 caracteres'),
  rolId: z.number().int().positive('Rol requerido'),
  negocios: z.array(z.number().int().positive()).min(1, 'Al menos un negocio requerido'),
});

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
    const tenant = validateTenantAccess(request, auth.user!);
    const { searchParams } = new URL(request.url);

    const queryParsed = getUsuariosQuerySchema.parse({
      rol: searchParams.get('rol') ?? undefined,
      activo: searchParams.get('activo') ?? undefined,
    });

    const filtros = {
      negocioId: tenant.negocioId ?? undefined,
      rol: queryParsed.rol,
      activo: queryParsed.activo,
    };

    const usuarios = await getUsuarios(filtros, {
      rol: auth.user!.rol as RoleName,
      negocios: auth.user!.negocios,
    });

    return NextResponse.json({ success: true, data: { usuarios, total: usuarios.length } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof TenantError) {
      const status = error.code === 'ACCESO_DENEGADO' ? 403 : 400;
      return NextResponse.json({ success: false, error: error.message }, { status });
    }
    console.error('Usuarios GET error', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
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
    return forbiddenResponse('No tienes permisos para crear usuarios');
  }

  try {
    const body: unknown = await request.json();
    const validated = createUsuarioSchema.parse(body);

    if (auth.user!.rol === 'Admin') {
      const hasAllAccess = validated.negocios.every((negocioId) => auth.user!.negocios.includes(negocioId));
      if (!hasAllAccess) {
        return forbiddenResponse('No tienes acceso a uno o más negocios');
      }
    }

    const usuario = await createUsuario(validated);
    return NextResponse.json({ success: true, data: usuario }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : 'Error inesperado';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

