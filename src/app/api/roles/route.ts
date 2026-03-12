import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { roles } from '@/lib/drizzle';
import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { TenantError, validateTenantAccess } from '@/middleware/tenant-middleware';

export const dynamic = 'force-dynamic';

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
    validateTenantAccess(request, auth.user!);

    const rows = await db.select({ id: roles.id, nombre: roles.nombre, descripcion: roles.descripcion }).from(roles);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    if (error instanceof TenantError) {
      const status = error.code === 'ACCESO_DENEGADO' ? 403 : 400;
      return NextResponse.json({ success: false, error: error.message }, { status });
    }
    console.error('Roles GET error', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}

