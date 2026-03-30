---
name: "sk-01-onebusiness-project-context"
description: "Contexto y reglas base de OneBusiness. Invocar al iniciar cualquier tarea o al dudar sobre stack, estructura, roles, helpers o reglas absolutas."
---

# SK-01 — OneBusiness Project Context

## Cuándo invocarlo

- Al iniciar cualquier tarea en el repo.
- Cuando haya dudas sobre stack, estructura de carpetas, roles o reglas del proyecto.
- Antes de crear hooks/componentes/helpers nuevos (para evitar duplicados).

## Contexto del proyecto

**Proyecto:** OneBusiness — sistema de gestión corporativa multi-tenant para un holding empresarial. Reemplaza flujos de Excel con gestión financiera centralizada.

## Stack tecnológico (ground rules)

**Frontend**
- Next.js 14 con App Router (NO Pages Router, NO getServerSideProps)
- TypeScript strict mode
- Tailwind CSS
- shadcn/ui
- @tanstack/react-query v5
- React Hook Form + Zod + @hookform/resolvers
- apiFetch custom en `src/lib/api-client.ts`
  - Agrega JWT automáticamente
  - Agrega header `X-Negocio-Id` automáticamente
  - Hace refresh automático ante 401
- Notificaciones: `useToast` de `@/components/ui/use-toast`
  - NO usar sonner / react-hot-toast / react-toastify

**Backend**
- API Routes App Router: `src/app/api/**/route.ts`
- Drizzle ORM + PostgreSQL
- JWT access + refresh tokens
- Zod en TODOS los endpoints
- Resend para emails transaccionales

## Estructura de carpetas (referencia rápida)

`src/app/(auth)/login/` → login  
`src/app/(dashboard)/` → rutas protegidas  
`src/app/api/` → API routes  
`src/components/` → componentes  
`src/hooks/` → hooks con React Query  
`src/services/` → lógica de negocio  
`src/middleware/` → auth, permissions, tenant  
`src/types/` → tipos compartidos  
`src/lib/` → api-client, drizzle, jwt, utils  
`src/contexts/` → auth-context

## Roles del sistema (RBAC)

- Dueño: acceso total; ve todos los negocios sin filtro de tenant.
- Admin: ve/gestiona negocios asignados.
- Socio: ve todos los movimientos de su negocio asignado.
- Externo: ve SOLO movimientos creados por él (creadoPor = su id).

## Reglas absolutas (no romper)

- R1: No crear un hook si ya existe uno similar; extender el existente.
- R2: No redefinir helpers `formatCurrencyMXN`, `parseMoney`, `formatDateDMY`; importar de `src/lib/utils.ts`.
- R3: No usar `parseInt()` para montos; usar `parseFloat()`.
- R4: No usar sonner; usar `useToast`.
- R5: No modificar archivos fuera del scope del prompt.
- R6: Verificar el nombre exacto de hooks antes de importar.
- R7: En API routes: `export const dynamic = 'force-dynamic'`.
- R8: Usar `db.transaction()` en operaciones con múltiples inserts relacionados.
- R9: No hardcodear `negocioId`; viene de `X-Negocio-Id`.
- R10: Validar con Zod antes de procesar datos en API routes.
- R11: No asumir que un archivo existe; verificar antes de modificar.
- R12: Montos NUMERIC llegan como string; usar `parseFloat()` para operar.

## Helpers disponibles (usar, no duplicar)

- `formatCurrencyMXN(value)` → $1,234.56
- `parseMoney(value)` → string Decimal → number
- `formatDateDMY(date)` → dd/mm/yyyy
- `cn(...classes)` → merge Tailwind

