# Checkpoint Sprint 1.1 — Resumen Ejecutivo (1.1.1 → 1.1.8)

**Proyecto:** ONEBUSINESS  
**Sprint:** 1.1  
**Última actualización:** 2026-03-12  

---

## 1) Resumen ejecutivo

Sprint 1.1 dejó el producto en un estado “operable” de extremo a extremo para autenticación y multi-tenancy: base de datos migrada y seedeada, autenticación JWT (access+refresh), validación de rutas protegidas, enforcement de tenant por negocio, UI de login funcional y suite de tests con cobertura alta (≥ 80% en archivos críticos).

Este checkpoint consolida lo ejecutado y verificable para habilitar la transición a Sprint 1.2.x con mínima fricción de onboarding.

---

## 2) Estado final del Sprint 1.1 (tareas y entregables)

### 2.1 Tarea 1.1.1 — Configuración inicial del proyecto (COMPLETADA)

**User story**  
Como equipo técnico, queremos un proyecto base con Next.js 14 y tooling estándar para construir features con calidad.

**Funcionalidades/alcance entregado**
- Next.js 14 App Router, TypeScript strict, Tailwind, ESLint.
- Estructura de carpetas alineada al CTO Action Plan (carpetas `app/`, `api/`, `lib/`, `services/`, `middleware/`, `types/`, `tests/`).

**Evidencia**
- `npm run lint` ✅
- `npm run build` ✅

**Código fuente relevante**
- [package.json](file:///c:/Users/nadir/SergioMadrid/onebusiness/package.json)
- [tsconfig.json](file:///c:/Users/nadir/SergioMadrid/onebusiness/tsconfig.json)
- [src/app](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app)

---

### 2.2 Tarea 1.1.2 — Schema DB + migraciones Drizzle (COMPLETADA)

**User story**  
Como sistema, necesito un esquema inicial de datos para soportar negocios, usuarios, roles y asignaciones multi-tenant.

**Funcionalidades/alcance entregado**
- Schema Drizzle para 5 tablas: `negocios`, `centros_costo`, `roles`, `usuarios`, `usuario_negocio`.
- Índices y relaciones básicas.
- Migración inicial SQL versionada.

**Evidencia**
- `npm run db:migrate` ✅

**Código fuente relevante**
- [drizzle.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/drizzle.ts)
- [db.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/db.ts)
- [0001_init.sql](file:///c:/Users/nadir/SergioMadrid/onebusiness/drizzle/migrations/0001_init.sql)

---

### 2.3 Tarea 1.1.3 — JWT Authentication (COMPLETADA)

**User stories**
- Como usuario, quiero iniciar sesión para obtener tokens y acceder al sistema.
- Como sistema, quiero refrescar un access token expirado usando refresh token.
- Como usuario, quiero cerrar sesión (logout).

**Funcionalidades/alcance entregado**
- JWT utils con `jose`.
- Hashing de password con `bcrypt`.
- API Routes de auth:
  - POST `/api/auth/login`
  - POST `/api/auth/refresh`
  - POST `/api/auth/logout`

**Código fuente relevante**
- [jwt.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/jwt.ts)
- [auth.service.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/services/auth.service.ts)
- [auth API routes](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/auth)

---

### 2.4 Tarea 1.1.4 — Middleware de autenticación (COMPLETADA)

**User story**  
Como sistema, quiero proteger rutas para que solo usuarios autenticados puedan acceder.

**Funcionalidades/alcance entregado**
- Extracción y validación de `Authorization: Bearer <token>`.
- Respuesta 401 estandarizada.
- Registro de rutas protegidas vs públicas.

**Código fuente relevante**
- [auth-middleware.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/middleware/auth-middleware.ts)
- [middleware/index.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/middleware/index.ts)
- [middleware.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/middleware.ts)

---

### 2.5 Tarea 1.1.5 — Multi-Tenancy Middleware (COMPLETADA)

**User story**  
Como sistema multi-tenant, quiero aislar datos por negocio y bloquear accesos no autorizados.

**Funcionalidades/alcance entregado**
- Obtención de `negocioId` por header `X-Negocio-Id` o query `?negocioId=`.
- Política por rol:
  - Dueño: acceso global (negocioId opcional).
  - No Dueño: negocioId obligatorio y debe estar asignado.
- Helper de filtros para servicios (`tenantWhere`, `tenantAnd`).

**Código fuente relevante**
- [tenant-middleware.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/middleware/tenant-middleware.ts)
- [base.service.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/services/base.service.ts)
- [tenant.types.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/types/tenant.types.ts)

---

### 2.6 Tarea 1.1.6 — Seed de datos iniciales (COMPLETADA)

**User story**  
Como equipo, quiero datos de prueba consistentes para desarrollo y QA.

**Funcionalidades/alcance entregado**
- Seed idempotente: negocios, roles, centros de costo, usuarios y asignaciones.
- Script `db:create` para crear DB si no existe.
- Script de verificación de conteos.

**Evidencia**
- `npm run db:create` ✅
- `npm run db:migrate` ✅
- `npm run db:seed` ✅
- Conteos verificados:
  - negocios: 10
  - roles: 4
  - usuarios: 4
  - centros_costo: 13
  - usuario_negocio: 16

**Código fuente relevante**
- [seed.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/seed.ts)
- [create-db.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/create-db.ts)
- [verify-db.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/verify-db.ts)
- [README.md](file:///c:/Users/nadir/SergioMadrid/onebusiness/README.md)

---

### 2.7 Tarea 1.1.7 — Página de login (COMPLETADA)

**User story**  
Como usuario, quiero una UI para autenticarme y entrar al dashboard.

**Funcionalidades/alcance entregado**
- `/login` renderiza UI y valida con zod + react-hook-form.
- Guarda `accessToken`, `refreshToken` y `user` en localStorage.
- Redirección post-login a `/dashboard`.
- `AuthProvider` y `useAuth` para estado de sesión.
- Cliente API con refresh automático en 401.

**Código fuente relevante**
- [login page](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/%28auth%29/login/page.tsx)
- [login-form.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/auth/login-form.tsx)
- [auth-context.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/contexts/auth-context.tsx)
- [use-auth.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/hooks/use-auth.ts)
- [api-client.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/api-client.ts)

---

### 2.8 Tarea 1.1.8 — Tests Sprint 1.1 (COMPLETADA)

**User story**  
Como equipo, quiero pruebas automatizadas para evitar regresiones y habilitar Sprint 1.2.x con confianza.

**Funcionalidades/alcance entregado**
- Vitest configurado con coverage y scripts de ejecución.
- Tests unitarios: JWT, auth middleware, tenant middleware, auth service.
- Tests de integración: handlers auth, multi-tenancy y flujo login API.

**Evidencia**
- `npm test` ✅ (52/52)
- `npm run test:coverage` ✅ (≥ 80% en archivos críticos)

**Código fuente relevante**
- [vitest.config.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/vitest.config.ts)
- [tests/unit](file:///c:/Users/nadir/SergioMadrid/onebusiness/tests/unit)
- [tests/integration](file:///c:/Users/nadir/SergioMadrid/onebusiness/tests/integration)

---

## 3) Bugs resueltos / incidencias relevantes

- Bloqueo por inexistencia de DB `onebusiness` → agregado `db:create`.
- Scripts TS ejecutados fuera de Next no cargaban `.env` → agregado `dotenv/config` a scripts.
- Ajuste de tests: payload inválido vs credenciales inválidas (400 vs 401) alineado con validación zod.

---

## 4) Pruebas ejecutadas (detalle)

### 4.1 Unit tests
- JWT: [jwt.test.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/tests/unit/jwt.test.ts)
- Auth middleware: [auth-middleware.test.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/tests/unit/auth-middleware.test.ts)
- Tenant middleware: [tenant-middleware.test.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/tests/unit/tenant-middleware.test.ts)
- Auth service: [auth.service.test.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/tests/unit/auth.service.test.ts)

### 4.2 Integration tests
- Auth handlers: [auth.test.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/tests/integration/auth.test.ts)
- Multi-tenancy: [multi-tenancy.test.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/tests/integration/multi-tenancy.test.ts)
- Login flow: [login-flow.test.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/tests/integration/login-flow.test.ts)

---

## 5) Documentación técnica actualizada

- Sección de DB + seed + tests: [README.md](file:///c:/Users/nadir/SergioMadrid/onebusiness/README.md)
- Documento Ground Truth del sprint: [ground-truth-sprint-1.1.md](file:///c:/Users/nadir/SergioMadrid/onebusiness/docs/ground-truth-sprint-1.1.md)

---

## 6) Dependencias y handoff a Sprint 1.2.x

**Dependencias críticas**
- PostgreSQL accesible vía `DATABASE_URL`.
- `.env` con `JWT_SECRET` (≥ 32 chars) y expiraciones configuradas.
- Suite de tests como gate en CI/local.

**Recomendación de Gate de salida (antes de arrancar 1.2.x)**
```bash
npm run lint
npm run build
npm run db:create
npm run db:migrate
npm run db:seed
npm test
npm run test:coverage
```

---

## 7) Aprobaciones requeridas (antes de 1.2.x)

### 7.1 Validación técnica

| Responsable | Fecha | Evidencia (link / adjunto) | Aprobado |
|------------|-------|----------------------------|----------|
| Tech Lead |  |  |  |
| Backend |  |  |  |
| Frontend |  |  |  |
| QA |  |  |  |

### 7.2 Aprobación Product Owner

| Responsable | Fecha | Criterios revisados | Aprobado |
|------------|-------|---------------------|----------|
| Product Owner |  | Login + Roles + Multi-tenancy + Tests |  |

