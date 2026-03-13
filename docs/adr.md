# Architecture Decision Record (ADR) — ONEBUSINESS

**Proyecto:** ONEBUSINESS\
**Alcance:** decisiones consolidadas Sprint 1.1 a 1.4 (estado real en repo)\
**Última actualización:** 2026-03-13

***

## Índice

- Resumen ejecutivo (2–3 líneas)

  Quedó generado el informe técnico en Markdown consolidando el estado real del proyecto contra los prompts de Sprint 1.1–1.4 , con iADnventario de tareas , trazabilidad , métricas , gap analysis , tablero de progreso , y un ADR actualizado (creado) con decisiones y desviaciones detectadas.
  ## Entregables (Markdown)
  - Informe principal: informe-tecnico-sprints-1.1-a-1.4.md
  - ADR (nuevo): adr.md
  - Ground Truth actualizado (extendido a 1.4): ground-truth-sprint-1.1.md
  ## Evidencias incorporadas en el informe
  - Commit principal de consolidación: 90940f7 (2026-03-12).
  - Pruebas y build verificados localmente:
    - npm run lint ✅
    - npm run test:coverage ✅ (15 suites / 99 tests) + reporte HTML: coverage/index.html
    - npm run build ✅
  - Nota registrada como deuda: warning de compatibilidad @typescript-eslint con TypeScript 5.9.3.
  ## Hallazgos clave (gap)
  - Sprint 1.4 está parcial : se detecta módulo de cuentas bancarias , pero no se detecta implementación de categorías (schema/API/UI) tal como lo piden los prompts.
  - Desviación de diseño documentada en ADR: cuentas bancarias modeladas por negocio (FK directa) en lugar de N:M “cuenta compartida”.
  ## Validación y aprobación (sign-off)
  - Plantilla de sign-off incluida en el informe: Sección 9
  - Recomendación operativa: usar el informe + ADR como paquete de revisión para stakeholders, y registrar decisiones del siguiente sprint como nuevos ADRs.
  ## Plan de mantenimiento (ligero)
  - Actualizar este informe y el ADR al cierre de cada sprint (máx. 30 min).
  - Mantener “Ground Truth” como fuente única del estado real (solo lo verificado con evidencias).
  - Agregar/ajustar métricas cuando se amplíe el alcance de cobertura a módulos de negocio (movimientos/cuentas/UI).[ADR-0001 — Plataforma: Next.js 14 + App Router](#adr-0001--plataforma-nextjs-14--app-router)
- [ADR-0002 — Backend: API Routes (no Server Actions para negocio)](#adr-0002--backend-api-routes-no-server-actions-para-negocio)
- [ADR-0003 — Datos: PostgreSQL 16 + Drizzle ORM](#adr-0003--datos-postgresql-16--drizzle-orm)
- [ADR-0004 — Autenticación: SOLO JWT con access + refresh](#adr-0004--autenticación-solo-jwt-con-access--refresh)
- [ADR-0005 — Multi-tenancy:](#adr-0005--multi-tenancy-negocioid-como-eje-y-política-fail-secure) [`negocioId`](#adr-0005--multi-tenancy-negocioid-como-eje-y-política-fail-secure) [como eje y política fail-secure](#adr-0005--multi-tenancy-negocioid-como-eje-y-política-fail-secure)
- [ADR-0006 — Autorización: RBAC por rol (Dueño/Socio/Admin/Externo)](#adr-0006--autorización-rbac-por-rol-dueñosocioadminexterno)
- [ADR-0007 — Seguridad: invalidación de tokens con](#adr-0007--seguridad-invalidación-de-tokens-con-tokenversion) [`tokenVersion`](#adr-0007--seguridad-invalidación-de-tokens-con-tokenversion)
- [ADR-0008 — Movimientos: workflow PENDIENTE/APROBADO/RECHAZADO + traspasos](#adr-0008--movimientos-workflow-pendienteaprobadorechazado--traspasos)
- [ADR-0009 — Cuentas bancarias: cuenta por negocio (desviación del prompt 1.4)](#adr-0009--cuentas-bancarias-cuenta-por-negocio-desviación-del-prompt-14)
- [ADR-0010 — Testing: Vitest (unit + integration handler-level) con thresholds](#adr-0010--testing-vitest-unit--integration-handler-level-con-thresholds)

***

## ADR-0001 — Plataforma: Next.js 14 + App Router

**Fecha:** 2026-03-12\
**Estado:** Aprobada (implementada)

**Contexto**

- Se requiere un framework único para frontend y backend, con DX alta y facilidad de despliegue.

**Decisión**

- Usar Next.js 14 (App Router) como plataforma unificada.

**Consecuencias**

- UI y API conviven en un solo repo.
- Se estandariza estructura y routing (App Router + `src/app/api/*`).

**Evidencia**

- [package.json](file:///c:/Users/nadir/SergioMadrid/onebusiness/package.json)
- [src/app](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app)

***

## ADR-0002 — Backend: API Routes (no Server Actions para negocio)

**Fecha:** 2026-03-12\
**Estado:** Aprobada (implementada)

**Contexto**

- El CTO Action Plan indica no mezclar Server Actions con API Routes para backend de negocio.

**Decisión**

- Implementar backend en API Routes (`src/app/api/*`) con contratos REST.

**Consecuencias**

- Testing y debugging simplificados (handlers por endpoint).
- Mejor compatibilidad futura con integraciones externas.

**Evidencia**

- [src/app/api](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api)
- [CTO Action Plan v1.0](file:///c:/Users/nadir/SergioMadrid/documentacioninicial/dc812c01-3e7d-48f7-914c-7aa0db109b51/cto-action-plan-v1.0.md)

***

## ADR-0003 — Datos: PostgreSQL 16 + Drizzle ORM

**Fecha:** 2026-03-12\
**Estado:** Aprobada (implementada)

**Contexto**

- Se requiere relacional fuerte, migraciones controladas, y type-safety.

**Decisión**

- PostgreSQL 16 + Drizzle ORM + drizzle-kit (migraciones SQL versionadas).

**Consecuencias**

- Migraciones auditables por SQL.
- Schema en TypeScript con índices/relaciones explícitas.

**Evidencia**

- [drizzle.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/drizzle.ts)
- [drizzle/migrations](file:///c:/Users/nadir/SergioMadrid/onebusiness/drizzle/migrations)

***

## ADR-0004 — Autenticación: SOLO JWT con access + refresh

**Fecha:** 2026-03-12\
**Estado:** Aprobada (implementada)

**Contexto**

- Se busca evitar la experiencia previa de “auth dual” (cookies/sessions + JWT).

**Decisión**

- Implementar auth stateless con JWT (`jose`) usando access token + refresh token.
- Persistir tokens en localStorage (no cookies) para el cliente web.

**Consecuencias**

- Requiere manejo explícito de refresh en cliente y expiración.
- Middleware y handlers deben validar Bearer token consistentemente.

**Evidencia**

- [jwt.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/jwt.ts)
- [auth API routes](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/auth)
- [api-client.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/api-client.ts)

***

## ADR-0005 — Multi-tenancy: `negocioId` como eje y política fail-secure

**Fecha:** 2026-03-12\
**Estado:** Aprobada (implementada)

**Contexto**

- El sistema soporta múltiples negocios y requiere aislamiento por negocio.

**Decisión**

- Estándar de tenant por request:
  - `X-Negocio-Id` header o `?negocioId=` query param.
  - Si rol ≠ Dueño, `negocioId` es obligatorio y debe estar asignado al usuario.

**Consecuencias**

- Defensa en profundidad: el filtro tenant se aplica en middleware/servicios.
- El Dueño puede realizar vistas consolidadas.

**Evidencia**

- [tenant-middleware.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/middleware/tenant-middleware.ts)
- [base.service.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/services/base.service.ts)

***

## ADR-0006 — Autorización: RBAC por rol (Dueño/Socio/Admin/Externo)

**Fecha:** 2026-03-12\
**Estado:** Aprobada (implementada)

**Contexto**

- Roles con políticas claras (especialmente Externo read-only).

**Decisión**

- Matriz de permisos por rol, aplicada en middleware antes de operaciones.

**Consecuencias**

- Reducción del riesgo de escalamiento de permisos.
- Requiere mantener consistencia en todos los endpoints.

**Evidencia**

- [permissions.types.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/types/permissions.types.ts)
- [permissions.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/middleware/permissions.ts)

***

## ADR-0007 — Seguridad: invalidación de tokens con `tokenVersion`

**Fecha:** 2026-03-12\
**Estado:** Aprobada (implementada)

**Contexto**

- Cambios de asignación de negocios deben forzar re-login para evitar tokens “viejos” con scopes incorrectos.

**Decisión**

- Agregar `tokenVersion` al usuario y validar en refresh/uso del token según implementación.

**Consecuencias**

- Requiere migración y actualización de lógica JWT/refresh.

**Evidencia**

- [0002\_token\_version.sql](file:///c:/Users/nadir/SergioMadrid/onebusiness/drizzle/migrations/0002_token_version.sql)
- [drizzle.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/drizzle.ts)

***

## ADR-0008 — Movimientos: workflow PENDIENTE/APROBADO/RECHAZADO + traspasos

**Fecha:** 2026-03-12\
**Estado:** Aprobada (implementada)

**Contexto**

- El negocio requiere control de aprobación (operación financiera).

**Decisión**

- Movimientos con estado y roles de aprobación:
  - `PENDIENTE` → `APROBADO`/`RECHAZADO`
  - Campos de auditoría en entidad (`creadoPor`, `aprobadoPor`, timestamps)
  - Tipos adicionales para traspasos (entrada/salida)

**Consecuencias**

- Se habilita flujo operativo (aprobación).
- El cálculo de saldos puede basarse en movimientos aprobados.

**Evidencia**

- [drizzle.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/drizzle.ts#L145-L180)
- [movimientos API](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/movimientos)
- UI de aprobación: [movimientos/aprobacion](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/%28dashboard%29/movimientos/aprobacion/page.tsx)

***

## ADR-0009 — Cuentas bancarias: cuenta por negocio (desviación del prompt 1.4)

**Fecha:** 2026-03-12\
**Estado:** Aprobada (implementada)

**Contexto**

- El prompt Sprint 1.4 sugiere cuentas compartidas N:M (`cuenta_negocio`), sin `negocioId` directo en cuenta.
- La implementación actual usa `cuentas_banco.negocioId` (1 cuenta pertenece a 1 negocio).

**Decisión**

- Modelar cuentas bancarias como entidad **tenanteada** por negocio (FK directa).

**Consecuencias**

- Simplifica queries y enforcement tenant.
- Limita el soporte a “cuentas compartidas reales” (si el requisito existe, requiere refactor hacia N:M).

**Evidencia**

- [0003\_add\_cuentas\_banco.sql](file:///c:/Users/nadir/SergioMadrid/onebusiness/drizzle/migrations/0003_add_cuentas_banco.sql)
- [drizzle.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/drizzle.ts#L124-L143)
- [cuentas-banco API](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/cuentas-banco)

***

## ADR-0010 — Testing: Vitest (unit + integration handler-level) con thresholds

**Fecha:** 2026-03-12\
**Estado:** Aprobada (implementada)

**Contexto**

- Requerimiento de gates de calidad rápidos y reproducibles en local/CI.

**Decisión**

- Vitest como runner, con:
  - unit tests para librerías y middlewares
  - integration tests a nivel handler (sin levantar servidor)
  - coverage con thresholds mínimos

**Consecuencias**

- Alta velocidad y estabilidad.
- Se requiere ampliar cobertura progresivamente a áreas no cubiertas (servicios de negocio/UI).

**Evidencia**

- [vitest.config.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/vitest.config.ts)
- [tests](file:///c:/Users/nadir/SergioMadrid/onebusiness/tests)
- [coverage](file:///c:/Users/nadir/SergioMadrid/onebusiness/coverage/index.html)

***

## Librerías incorporadas (observadas en el repo)

Fuente: [package.json](file:///c:/Users/nadir/SergioMadrid/onebusiness/package.json)

**Core**

- `next@14.2.5`, `react@18`, `typescript@^5`

**Datos**

- `drizzle-orm`, `drizzle-kit`, `postgres` (driver)

**Seguridad**

- `jose` (JWT), `bcrypt` (hashing)

**Validación y formularios**

- `zod`, `react-hook-form`, `@hookform/resolvers`

**UI**

- `tailwindcss`, `@radix-ui/*`, `lucide-react`

**Data fetching**

- `@tanstack/react-query`

**Email**

- `resend` (presente en dependencias; revisar alcance real en sprints si aplica)

**Testing**

- `vitest`, `@vitest/coverage-v8`

