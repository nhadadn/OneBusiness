---
name: "sk-03-api-route-architecture"
description: "Arquitectura estándar de API Routes (Next.js App Router) en OneBusiness. Invocar al crear/editar endpoints y su manejo de auth/RBAC/tenant/validación."
---

# SK-03 — API Route Architecture

## Cuándo invocarlo

- Al crear o modificar `src/app/api/**/route.ts`.
- Al depurar códigos HTTP (400/401/403/404/409/500) y flujos de auth/tenant.

## Ubicación y patrón

- Ubicación: `src/app/api/[recurso]/route.ts`
- Next.js 14 App Router API Routes
- Regla: `export const dynamic = 'force-dynamic'` en todas las rutas

## Imports estándar

```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, unauthorizedResponse } from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { validateTenantAccess } from '@/middleware/tenant-middleware';
```

## Plantilla GET + POST (resumen)

- 401: si no hay token/credenciales
- 403: si el rol no tiene permiso (RBAC) o no tiene acceso al negocio (tenant)
- 400: Zod validation error (query/body)
- 404: recurso no existe
- 409: conflicto de negocio (transición/estado)
- 500: error técnico (DB u otros)

## Validación (Zod)

- Query params: `z.coerce.number()` y regex `YYYY-MM-DD` para fechas.
- Body: `safeParse` preferido para responder 400 sin lanzar excepción.
- Params `[id]`: `z.coerce.number().int().positive()`.

## Multi-tenancy (obligatorio)

- `validateTenantAccess(request, auth.user!)` determina `tenant.negocioId` y acceso.
- Nunca confiar en `negocioId` de body; el flujo estándar es `X-Negocio-Id` (apiFetch lo agrega).

