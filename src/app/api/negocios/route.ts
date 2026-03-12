import { NextResponse } from 'next/server';

import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { TenantError, validateTenantAccess } from '@/middleware/tenant-middleware';
import { getNegocios } from '@/services/negocio.service';
import type { RoleName } from '@/types/permissions.types';

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
    const tenant = validateTenantAccess(request, auth.user!);
    const negocios = await getNegocios(
      { negocioId: tenant.negocioId ?? undefined },
      { rol: auth.user!.rol as RoleName, negocios: auth.user!.negocios }
    );

    return NextResponse.json({ success: true, data: negocios, tenant });
  } catch (error) {
    if (error instanceof TenantError) {
      const status = error.code === 'ACCESO_DENEGADO' ? 403 : 400;
      return NextResponse.json({ success: false, error: error.message }, { status });
    }
    throw error;
  }
}
