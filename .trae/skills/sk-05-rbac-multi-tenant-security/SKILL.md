---
name: "sk-05-rbac-multi-tenant-security"
description: "RBAC y multi-tenancy en OneBusiness. Invocar al tocar permisos, tenant isolation, filtros por negocio o visibilidad por rol (especial Externo)."
---

# SK-05 — RBAC & Multi-Tenant Security

## Cuándo invocarlo

- Al crear/modificar endpoints, páginas o acciones con permisos.
- Al ver bugs de “ve datos de otro negocio” o “403 inesperado”.
- Al definir qué puede hacer cada rol.

## Roles

- Dueño: sin filtro tenant (puede ver todo).
- Admin: solo negocios asignados.
- Socio: solo negocios asignados (lectura/operación según permisos).
- Externo: solo movimientos propios (creadoPor = su id) y restricciones adicionales.

## Multi-tenancy (reglas)

- Usar `validateTenantAccess()` en backend.
- `X-Negocio-Id` es la fuente estándar; evitar hardcode de `negocioId`.
- En queries DB: siempre filtrar por `negocioId` salvo Dueño.
- En frontend: `apiFetch` agrega `X-Negocio-Id` automáticamente cuando se pasa `negocioId`.

## Filtro especial Externo (backend)

- En listados de movimientos: si `rol === 'Externo'`, filtrar por `creadoPorId = auth.user.userId`.

## Matriz de acceso (resumen UI)

- `/dashboard`: todos
- `/movimientos`: todos (Externo solo propios)
- `/movimientos/aprobacion`: Dueño/Admin (Socio/Externo redirigen)
- `/configuracion/*`: Dueño/Admin (Socio lectura parcial, Externo no)
- `/usuarios`, `/negocios`: Dueño/Admin

