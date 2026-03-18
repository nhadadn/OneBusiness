# Informe técnico — Sprints 1.1 a 1.4
**Proyecto:** ONEBUSINESS (Sistema de Gestión Corporativa Multi-Negocio)  
**Alcance del informe:** Sprints 1.1, 1.2, 1.3 y 1.4 (según prompts)  
**Fuentes primarias:** Prompts Sprint 1.1–1.4 + repositorio `onebusiness/`  
**Última actualización:** 2026-03-13  

---

## Tabla de contenidos
- [1) Análisis de necesidades de documentación](#1-análisis-de-necesidades-de-documentación)
- [2) Resumen ejecutivo del avance](#2-resumen-ejecutivo-del-avance)
- [3) Inventario de tareas completadas](#3-inventario-de-tareas-completadas)
- [4) Mapa de dependencias y trazabilidad](#4-mapa-de-dependencias-y-trazabilidad)
- [5) Métricas de progreso](#5-métricas-de-progreso)
- [6) Análisis de gap y refinamiento](#6-análisis-de-gap-y-refinamiento)
- [7) Arquitectura y decisiones técnicas (ADR)](#7-arquitectura-y-decisiones-técnicas-adr)
- [8) Entregables](#8-entregables)
- [9) Validación y aprobación](#9-validación-y-aprobación)

---

## 1) Análisis de necesidades de documentación
**Audiencia objetivo**
- **Stakeholders / Dirección:** visión de avance, riesgos, gaps y decisiones.
- **Product Owner:** trazabilidad historias ↔ entregables ↔ criterios.
- **Equipo técnico (Backend/Frontend/DB/QA):** evidencias verificables (código, pruebas, coverage) y lineamientos para el siguiente sprint.

**Necesidad principal**
- Consolidar “estado real” del producto implementado vs. lo especificado en prompts Sprint 1.1–1.4, con evidencias rastreables.

**Salida esperada (Docs as Code)**
- Un informe en Markdown consumible por stakeholders.
- ADR actualizado (o creado) con decisiones reales y desviaciones justificadas.
- Ground Truth actualizado como fuente única del “estado actual”.

---

## 2) Resumen ejecutivo del avance
**Estado global (post Sprint 1.1–1.3 + inclusión 1.4 detectada)**
- El repositorio `onebusiness/` contiene una implementación end-to-end operable de: **multi-tenancy**, **autenticación JWT**, **RBAC**, **gestión de usuarios**, **registro y aprobación de movimientos**, y **cuentas bancarias por negocio**.
- Se ejecutaron gates de calidad con éxito: **lint**, **tests con cobertura**, y **build** (evidencias en Sección 5).
- Se detecta inclusión parcial del **Sprint 1.4**: existe módulo de cuentas bancarias, pero **no se implementa el módulo de categorías** especificado en prompts 1.4.

**Resumen por sprint (lo implementado vs. lo esperado por prompt)**
- **Sprint 1.1 (Multi-tenancy y Auth base):** Implementado y probado (auth JWT, middlewares, seed, login UI, suite de tests).
- **Sprint 1.2 (Usuarios, roles y permisos):** Implementado y probado (middleware de permisos, CRUD usuarios, asignación de negocios, dashboard por rol).
- **Sprint 1.3 (Registro de movimientos):** Implementado y probado, con extensiones relevantes: flujo de **aprobación/rechazo** y tipos de movimiento adicionales.
- **Sprint 1.4 (Categorías y cuentas bancarias):** Implementado parcialmente:
  - ✅ Cuentas bancarias (modelo por negocio) + cálculo de saldo basado en movimientos aprobados.
  - 🚫 Categorías (no se detecta tabla ni endpoints/UI asociados).

**Evidencia de consolidación**
- Commit principal: `90940f7` (2026-03-12) “feat: Sprint 1.3 completo - Sistema de movimientos bancarios”.
- Gates ejecutados: `npm run lint`, `npm run test:coverage`, `npm run build` en [package.json](file:///c:/Users/nadir/SergioMadrid/onebusiness/package.json).

---

## 3) Inventario de tareas completadas
### 3.1 Fuentes de tareas (prompts)
- Sprint 1.1: [03-sprint-1.1-prompts.md](file:///c:/Users/nadir/SergioMadrid/Sprint1y2/03-sprint-1.1-prompts.md)
- Sprint 1.2: [04-sprint-1.2-prompts.md](file:///c:/Users/nadir/SergioMadrid/Sprint1y2/04-sprint-1.2-prompts.md)
- Sprint 1.3: [05-sprint-1.3-prompts.md](file:///c:/Users/nadir/SergioMadrid/Sprint1y2/05-sprint-1.3-prompts.md)
- Sprint 1.4: [06-sprint-1.4-prompts.md](file:///c:/Users/nadir/SergioMadrid/Sprint1y2/06-sprint-1.4-prompts.md)

### 3.2 Ventana temporal (inicio/fin) usada en este informe
- **Inicio:** 2026-03-10 (primer commit detectado en el repo)
- **Fin:** 2026-03-12 (commit de consolidación Sprint 1.3)

**Pull Requests**
- No se detecta evidencia local de Pull Requests (metadata de hosting). La trazabilidad se soporta con hashes de commit y artefactos en el repositorio local.

### 3.3 Inventario (tareas 1.1–1.4)
Notas:
- Cuando no existe trazabilidad 1:1 “tarea ↔ commit”, se referencia el commit de consolidación `90940f7`.
- “Responsable” se expresa como **Agente** (según prompt), ya que no existe autoría individual por tarea en los commits.

| Sprint | Task | Título | Responsable (prompt) | Criterios de aceptación (prompt) | Inicio | Fin | Estado | Evidencia verificable |
|---|---:|---|---|---|---|---|---|---|
| 1.1 | 1.1.1 | Configuración inicial | DevOps & Deployment Agent | `dev`/`build` OK, estructura base creada | 2026-03-10 | 2026-03-12 | Completada | Commit `90940f7`; [package.json](file:///c:/Users/nadir/SergioMadrid/onebusiness/package.json); [README.md](file:///c:/Users/nadir/SergioMadrid/onebusiness/README.md) |
| 1.1 | 1.1.2 | Schema DB + migraciones | Database Agent | migración OK, índices, negocio_id en tablas relevantes | 2026-03-10 | 2026-03-12 | Completada | [drizzle.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/drizzle.ts); [migrations](file:///c:/Users/nadir/SergioMadrid/onebusiness/drizzle/migrations) |
| 1.1 | 1.1.3 | JWT Authentication | Backend Dev Agent | login/refresh/logout, hashing bcrypt, tests | 2026-03-10 | 2026-03-12 | Completada | [jwt.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/jwt.ts); [auth routes](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/auth) |
| 1.1 | 1.1.4 | Middleware Auth JWT | Backend Dev Agent | 401 estándar, payload disponible | 2026-03-10 | 2026-03-12 | Completada | [auth-middleware.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/middleware/auth-middleware.ts); tests en [tests/unit](file:///c:/Users/nadir/SergioMadrid/onebusiness/tests/unit) |
| 1.1 | 1.1.5 | Middleware Multi-tenancy | Backend Dev Agent | 400 sin negocio, 403 sin acceso, Dueño bypass | 2026-03-10 | 2026-03-12 | Completada | [tenant-middleware.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/middleware/tenant-middleware.ts); [base.service.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/services/base.service.ts) |
| 1.1 | 1.1.6 | Seed de datos | Database Agent | 10 negocios, 4 roles, usuarios prueba, conteos | 2026-03-10 | 2026-03-12 | Completada | [seed.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/seed.ts); scripts `db:*` en [package.json](file:///c:/Users/nadir/SergioMadrid/onebusiness/package.json) |
| 1.1 | 1.1.7 | Página de Login | Frontend Dev Agent | UI /login, validación, persistencia tokens, redirect | 2026-03-10 | 2026-03-12 | Completada | [login page](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/%28auth%29/login/page.tsx); [login-form.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/auth/login-form.tsx) |
| 1.1 | 1.1.8 | Tests Sprint 1.1 | QA & Testing Agent | unit + integración, coverage ≥ 80% | 2026-03-10 | 2026-03-12 | Completada | [vitest.config.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/vitest.config.ts); [coverage/](file:///c:/Users/nadir/SergioMadrid/onebusiness/coverage/index.html) |
| 1.2 | 1.2.1 | Autorización por rol | Backend Dev Agent | Externo bloqueado en escritura, matriz permisos, tests | 2026-03-10 | 2026-03-12 | Completada | [permissions.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/middleware/permissions.ts); [permissions.types.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/types/permissions.types.ts); [rbac.test.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/tests/integration/rbac.test.ts) |
| 1.2 | 1.2.2 | CRUD Usuarios (Backend) | Backend Dev Agent | CRUD, permisos, soft delete, tests | 2026-03-10 | 2026-03-12 | Completada | [usuarios API](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/usuarios); [usuario.service.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/services/usuario.service.ts) |
| 1.2 | 1.2.3 | CRUD Usuarios (Frontend) | Frontend Dev Agent | página usuarios, tabla, modal, permisos UI | 2026-03-10 | 2026-03-12 | Completada | [usuarios page](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/%28dashboard%29/usuarios/page.tsx); [usuarios components](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/usuarios) |
| 1.2 | 1.2.4 | Asignar negocios a usuarios | Backend Dev Agent | endpoint asignación, invalidación tokens, relogin | 2026-03-10 | 2026-03-12 | Completada | [usuarios/[id]/negocios route](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/usuarios/%5Bid%5D/negocios/route.ts); [0002_token_version.sql](file:///c:/Users/nadir/SergioMadrid/onebusiness/drizzle/migrations/0002_token_version.sql) |
| 1.2 | 1.2.5 | Dashboard por rol | Frontend Dev Agent | dashboard por rol, selector Dueño, UI limitada por rol | 2026-03-10 | 2026-03-12 | Completada | [dashboard page](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/%28dashboard%29/dashboard/page.tsx); [check-roles.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/check-roles.ts) |
| 1.2 | 1.2.6 | Tests Sprint 1.2 | QA Agent | Externo tests, CRUD tests, coverage ≥ 80% | 2026-03-10 | 2026-03-12 | Completada | [usuarios tests](file:///c:/Users/nadir/SergioMadrid/onebusiness/tests/integration/usuarios-api.test.ts); [rbac.test.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/tests/integration/rbac.test.ts) |
| 1.3 | 1.3.1 | Schema Movimientos | Database Agent | tabla movimientos, negocio_id índice, migración OK | 2026-03-10 | 2026-03-12 | Completada | [0004_add_movimientos.sql](file:///c:/Users/nadir/SergioMadrid/onebusiness/drizzle/migrations/0004_add_movimientos.sql); [drizzle.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/drizzle.ts) |
| 1.3 | 1.3.2 | API CRUD Movimientos | Backend Agent | CRUD, filtros tenant, permisos, auditoría | 2026-03-10 | 2026-03-12 | Parcial (auditoría) | [movimientos API](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/movimientos); [movimiento.service.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/services/movimiento.service.ts) |
| 1.3 | 1.3.3 | Lista Movimientos (UI) | Frontend Agent | lista visible, badges, acciones por rol | 2026-03-10 | 2026-03-12 | Completada | [movimientos page](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/%28dashboard%29/movimientos/page.tsx); [movimientos-table.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/movimientos/movimientos-table.tsx) |
| 1.3 | 1.3.4 | Formulario Movimiento (UI) | Frontend Agent | alta/edición, validaciones, selección negocio | 2026-03-10 | 2026-03-12 | Completada | [movimiento-form.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/movimientos/movimiento-form.tsx); [movimientos/nuevo](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/%28dashboard%29/movimientos/nuevo/page.tsx) |
| 1.3 | 1.3.5 | Filtros y búsqueda (UI) | Frontend Agent | filtros por fecha/tipo/estado, URL params | 2026-03-10 | 2026-03-12 | Completada | [movimientos-filters.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/movimientos/movimientos-filters.tsx) |
| 1.3 | 1.3.6 | Tests Sprint 1.3 | QA Agent | tests CRUD y multi-tenancy movimientos | 2026-03-10 | 2026-03-12 | Parcial (tests dedicados) | Se cubre por tests de integración existentes (no hay `movimientos-api.test.ts` dedicado) |
| 1.4 | 1.4.1 | Schema categorías + cuentas | Database Agent | tablas categorías/cuentas, índices, constraints | 2026-03-10 | 2026-03-12 | Parcial | ✅ [0003_add_cuentas_banco.sql](file:///c:/Users/nadir/SergioMadrid/onebusiness/drizzle/migrations/0003_add_cuentas_banco.sql); 🚫 no se detecta tabla `categorias` |
| 1.4 | 1.4.2 | CRUD Categorías | Backend + Frontend | CRUD categorías, global vs por negocio | 2026-03-10 | 2026-03-12 | Pendiente | No se detectan endpoints UI/API para categorías |
| 1.4 | 1.4.3 | CRUD Cuentas bancarias | Backend + Frontend | CRUD cuentas, asignación a negocios | 2026-03-10 | 2026-03-12 | Completada | [cuentas-banco API](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/cuentas-banco); [cuentas-banco UI](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/%28dashboard%29/configuracion/cuentas-banco/page.tsx) |
| 1.4 | 1.4.4 | Saldos automáticos | Backend Agent | actualización saldo por movimientos | 2026-03-10 | 2026-03-12 | Parcial | Se implementa **cálculo** de saldo vs. actualización automática: [cuenta_banco.service.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/services/cuenta_banco.service.ts) |
| 1.4 | 1.4.5 | Tests Sprint 1.4 | QA Agent | tests cuentas/categorías, coverage | 2026-03-10 | 2026-03-12 | Parcial | Tests existentes no cubren cuentas-banco/categorías específicamente |

---

## 4) Mapa de dependencias y trazabilidad
### 4.1 Objetivos de producto (macro)
- **O1:** Multi-negocio con aislamiento por `negocioId`.
- **O2:** Seguridad: autenticación JWT + RBAC consistente.
- **O3:** Operación financiera: registro y control (aprobación) de movimientos.
- **O4:** Configuración financiera: cuentas bancarias (y categorías en roadmap).

### 4.2 Diagrama de trazabilidad (historias/tareas → objetivos)
```mermaid
flowchart LR
  subgraph O1[O1 Multi-negocio (aislamiento)]
    T115[1.1.5 Tenant middleware]
    T131[1.3.1 Schema movimientos (negocioId)]
    T143[1.4.3 Cuentas banco por negocio]
  end

  subgraph O2[O2 Seguridad (JWT + RBAC)]
    T113[1.1.3 JWT auth]
    T114[1.1.4 Auth middleware]
    T121[1.2.1 Permisos por rol]
    T124[1.2.4 Asignación negocios + tokenVersion]
  end

  subgraph O3[O3 Operación financiera (movimientos)]
    T132[1.3.2 API movimientos]
    T133[1.3.3 UI lista movimientos]
    T134[1.3.4 UI alta/edición]
    T135[1.3.5 Filtros/búsqueda]
    T136[1.3.6 Tests movimientos]
  end

  subgraph O4[O4 Configuración financiera]
    T141[1.4.1 Schema cuentas/categorías]
    T142[1.4.2 CRUD categorías]
    T144[1.4.4 Saldos]
  end

  T115 --> T132
  T114 --> T121 --> T122[1.2.2 CRUD usuarios] --> T123[1.2.3 UI usuarios]
  T124 --> T121
  T143 --> T132
  T141 --> T143
  T141 --> T142
  T132 --> T144
```

---

## 5) Métricas de progreso
### 5.1 Velocidad del equipo (proxy)
Los prompts no definen story points; por lo tanto se reporta velocidad con dos proxies:
- **Proxy A:** 1 tarea = 1 “punto” (comparación plan vs ejecución).
- **Proxy B:** duración estimada (días) reportada en prompts (comparación estimado vs. estado real).

**Proxy A (tareas planificadas vs. entregadas)**
| Sprint | Tareas planificadas | Completadas | Parciales | Pendientes |
|---|---:|---:|---:|---:|
| 1.1 | 8 | 8 | 0 | 0 |
| 1.2 | 6 | 6 | 0 | 0 |
| 1.3 | 6 | 4 | 2 | 0 |
| 1.4 | 5 | 1 | 3 | 1 |

### 5.2 Pruebas automatizadas y cobertura
**Ejecución verificada (2026-03-13)**
- `npm run lint` ✅ sin errores.
- `npm run test:coverage` ✅ 15 suites / 99 tests.
- `npm run build` ✅ build exitoso.

**Cobertura (según salida de `vitest run --coverage`)**
- Statements: **97.26%**
- Branches: **94%**
- Functions: **96.15%**
- Lines: **97.26%**

**Importante**
- La cobertura está configurada por alcance (ver [vitest.config.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/vitest.config.ts#L5-L28)): se priorizan archivos críticos (auth/tenant/permissions y rutas auth). No mide de forma completa UI ni todos los servicios.

**Artefacto de evidencia**
- Reporte HTML: [coverage/index.html](file:///c:/Users/nadir/SergioMadrid/onebusiness/coverage/index.html)

### 5.3 Deuda técnica y déficit técnico
**Deuda técnica abordada**
- Gates de calidad activos: lint + tests + coverage + build.
- Estrategia de pruebas: unit + integration a nivel de handlers, sin levantar servidor.

**Déficit técnico (pendiente / generado)**
- Sprint 1.4: falta el módulo de **categorías** (schema, API y UI).
- “Auditoría registrada” (1.3.2) no se detecta como tabla/log dedicado; se recomienda definir alcance de audit log y estandarizarlo.
- Warning de tooling: TypeScript 5.9.3 no está soportado oficialmente por `@typescript-eslint/typescript-estree` (impacto: warnings y potenciales falsos positivos/negativos en lint).

---

## 6) Análisis de gap y refinamiento
### 6.1 Funcionalidades pendientes o parcialmente implementadas
- **Categorías (Sprint 1.4.2):** no se detecta implementación. Impacta filtros/clasificación contable y reportes.
- **Saldos automáticos (Sprint 1.4.4):** existe cálculo de saldo por movimientos aprobados, pero no se observa una rutina/evento de actualización automática persistida.
- **Auditoría (Sprint 1.3.2):** el prompt pide “auditoría registrada”; hoy se observa trazabilidad por campos (`creadoPor`, `aprobadoPor`, timestamps) pero no un log de auditoría transversal.

### 6.2 Duplicaciones, riesgos o requisitos no cubiertos
- **Divergencia de diseño (Sprint 1.4):** el prompt plantea cuentas compartidas N:M; la implementación actual modela **cuenta por negocio** ([drizzle.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/drizzle.ts#L120-L143)). Riesgo: si el negocio requiere cuentas compartidas reales, habrá refactor.
- **Cobertura parcial por alcance:** cobertura alta en auth/tenant, pero faltan métricas de coverage para servicios de movimientos/cuentas y UI.

### 6.3 Proposal: Definition of Done (DoD) para el siguiente sprint
- **Funcionalidad:** criterios de aceptación del prompt verificados (manual y/o automatizado).
- **Seguridad:** RBAC + tenant aplicados en endpoints (defensa en profundidad).
- **Calidad:** `lint`, `test:coverage`, `build` en verde.
- **Pruebas:** casos críticos agregados para la funcionalidad (unit/integration) y evidencia en reporte.
- **Docs:** ADR y Ground Truth actualizados con cualquier desviación o decisión.
- **Evidencias:** link a commit(s), reporte de pruebas y rutas/archivos clave.

### 6.4 Criterios de priorización sugeridos (siguiente sprint)
- **P0 (bloqueante):** cumplimiento de multi-tenancy y RBAC; categorías si son necesarias para reportes/contabilidad.
- **P1:** audit log (si es requisito de compliance) y automatización de saldos.
- **P2:** ampliación de coverage a movimientos/cuentas, y mejora de DX (tooling TS/ESLint compatible).

---

## 7) Arquitectura y decisiones técnicas (ADR)
Se consolida en el ADR del repositorio:
- ADR: [adr.md](file:///c:/Users/nadir/SergioMadrid/onebusiness/docs/adr.md)

---

## 8) Entregables
### 8.1 Checkpoints (fases implementadas)
- Sprint 1.1: [checkpoint sprint 1.1.md](file:///c:/Users/nadir/SergioMadrid/onebusiness/docs/checkpoint%20sprint%201.1.md)
- Sprint 1.2: checkpoint incluido en este informe (Secciones 3, 5 y 8.6) + evidencias en código y tests.
- Sprint 1.3: checkpoint incluido en este informe (Secciones 3, 5 y 8.6) + evidencias en código y tests.
- Sprint 1.4: checkpoint parcial incluido en este informe (Secciones 3, 6 y 8.6) + evidencias en código.
- Sprints 1.1–1.4 (estado real consolidado): este documento.

### 8.2 Stack tecnológico y decisiones arquitectónicas
- Referencia base: [CTO Action Plan v1.0](file:///c:/Users/nadir/SergioMadrid/documentacioninicial/dc812c01-3e7d-48f7-914c-7aa0db109b51/cto-action-plan-v1.0.md)
- Estado implementado: [package.json](file:///c:/Users/nadir/SergioMadrid/onebusiness/package.json) + [adr.md](file:///c:/Users/nadir/SergioMadrid/onebusiness/docs/adr.md)

### 8.3 Decisiones backend y frontend (resumen)
- Backend: Next.js API Routes + Drizzle + middlewares (auth/tenant/permissions).
- Frontend: Next.js App Router, shadcn/ui + Tailwind, React Query (`@tanstack/react-query`) para datos.

### 8.4 Historias de usuario completadas (macro)
- Login y gestión de sesión (access/refresh/logout).
- Aislamiento multi-negocio con enforcement por middleware y servicios.
- Gestión de usuarios con roles y asignación de negocios.
- Registro, listado, filtros y aprobación de movimientos.
- Gestión de cuentas bancarias por negocio y cálculo de saldos.

### 8.5 Ground Truth actualizado
- Ground Truth (actualizado): [ground-truth-sprint-1.1.md](file:///c:/Users/nadir/SergioMadrid/onebusiness/docs/ground-truth-sprint-1.1.md)

### 8.6 Tablero de progreso (alineado al CTO Action Plan v1.0)
| Línea del plan | Estado | Evidencia | Notas |
|---|---|---|---|
| Setup proyecto (Next/TS/Lint/Build) | ✅ | [package.json](file:///c:/Users/nadir/SergioMadrid/onebusiness/package.json) | Gates activos |
| DB + migraciones (Drizzle) | ✅ | [migrations](file:///c:/Users/nadir/SergioMadrid/onebusiness/drizzle/migrations) | 0001..0004 |
| Auth SOLO JWT (login/refresh/logout) | ✅ | [auth routes](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/auth) | Tokens en localStorage |
| Multi-tenancy (negocioId) | ✅ | [tenant-middleware.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/middleware/tenant-middleware.ts) | Fail secure |
| RBAC (roles/permisos) | ✅ | [permissions.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/middleware/permissions.ts) | Externo read-only |
| Movimientos (registro y control) | ✅ | [movimientos routes](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/movimientos) | Incluye aprobación |
| Cuentas bancarias | ✅ | [cuentas-banco routes](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/cuentas-banco) | Modelo por negocio |
| Categorías | 🚫 | N/A | Requerido por prompts 1.4 |
| Auditoría transversal | 🟡 | N/A | Definir alcance/requisito |

---

## 9) Validación y aprobación
### 9.1 Revisión de stakeholders (proceso)
- Revisar este informe y el ADR.
- Validar gaps vs. alcance real del MVP (especialmente categorías y auditoría).
- Acordar priorización del siguiente sprint según P0/P1/P2.

### 9.2 Sign-off (plantilla)
| Rol | Nombre | Fecha | Aprobación | Observaciones |
|---|---|---|---|---|
| Product Owner |  |  |  |  |
| Tech Lead |  |  |  |  |
| Backend Lead |  |  |  |  |
| Frontend Lead |  |  |  |  |
| QA Lead |  |  |  |  |
