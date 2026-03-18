# OneBusiness — CTO Planning

**Última actualización:** 2026-03-15

## Tabla de contenidos

- [1. Visión del producto](#1-visión-del-producto)
- [2. Historial de sprints completados](#2-historial-de-sprints-completados)
- [3. Estado actual del sistema](#3-estado-actual-del-sistema)
- [4. Deuda técnica conocida](#4-deuda-técnica-conocida)
- [5. Roadmap de próximos sprints](#5-roadmap-de-próximos-sprints)
- [6. Decisiones de arquitectura registradas](#6-decisiones-de-arquitectura-registradas)
- [7. Convenciones del proyecto](#7-convenciones-del-proyecto)

## 1. Visión del producto

OneBusiness centraliza la operación financiera por negocio: registro de movimientos (ingresos/egresos), traspasos, un flujo de aprobación, y un dashboard operativo para monitoreo (incluyendo semáforo por umbrales).

**Usuarios/roles y necesidades (estado real del código)**

| Rol     | Necesidad principal                           |
| ------- | --------------------------------------------- |
| Dueño   | Visión global, configuración y control total  |
| Socio   | Operación y visibilidad por negocio asignado  |
| Admin   | Gestión operativa (crear/editar/aprobar)      |
| Externo | Consulta (solo lectura, enforcement efectivo) |

Referencias:

- Roles en DB: [drizzle.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/drizzle.ts#L54-L70)
- RBAC middleware: [permissions.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/middleware/permissions.ts)

**Estado actual (MVP / producción)**

Estado verificable por repositorio:

- Existe soporte completo de desarrollo (`next dev`), build (`next build`) y pruebas (`vitest`).
- No hay evidencia explícita en el repo de infraestructura/hosting (no se encontró Dockerfile/IaC en los archivos revisados para este documento).

Conclusión: el sistema está en **estado de MVP funcional** a nivel de aplicación; el estado “en producción” depende del entorno externo (no inferible solo con el código).

## 2. Historial de sprints completados

Nota (honestidad sobre Git):

> El historial de sprints se documenta desde el registro de desarrollo. El repositorio tiene commits agrupados por sprint completo, no uno por prompt individual. A partir del Sprint 2.1 se adopta la convención de un commit por prompt completado.

Contexto (ground truth):
- En este repo, el commit [992f3e0](file:///c:/Users/nadir/SergioMadrid/onebusiness) contiene trabajo acumulado de **Security Sprint (SEC-01..SEC-07)** y **Sprint 1.5 UX (UX-01..UX-03)**.
- Sprint 2.1 (2.1-A..2.1-D) y la documentación se agregaron después, **sin commits intermedios visibles** en `git log --oneline` dentro de este repo.

### Evidencia mínima de commits (repo actual)

`git log --oneline -n 20` (orden: más nuevo → más viejo):

| SHA     | Mensaje                                                                     |
| ------- | --------------------------------------------------------------------------- |
| 992f3e0 | Sprint 1.5: UX-01/02/03 navegación, flujos movimientos, estados UI y toasts |
| 2011cd1 | feat(sprint-1.4): modulo completo de categorias                             |
| 6ab750b | Merge branch 'main' of <https://github.com/nhadadn/OneBusiness>             |
| 90940f7 | feat: Sprint 1.3 completo - Sistema de movimientos bancarios                |
| bfd1346 | Initial commit                                                              |
| 8625352 | Initial commit from Create Next App                                         |

### Security Sprint (SEC-01 al SEC-07)

**Commit de referencia:** incluido en `992f3e0`  
**Fecha aproximada:** 2026-03-14 (por fecha del commit `992f3e0`)  
**Objetivo:** endurecer autenticación, sesiones, rate limiting, auditoría y headers.

**Entregado:**
- SEC-01: Access tokens (JWT) y verificación en backend.
- SEC-02: Refresh tokens y persistencia/rotación (hash).
- SEC-03: Invalidación de tokens (token version).
- SEC-04: Rate limiting para auth.
- SEC-05: Security headers (CSP, HSTS, etc.).
- SEC-06: Auditoría (audit logs) para eventos sensibles.
- SEC-07: Multi-tenancy por `negocioId` y validación de acceso.

**Métricas al cierre:**
- Tests: estado actual del repo: 215 passed / 0 failed
- TypeScript: ver commit `992f3e0`
- Build: ver commit `992f3e0`

**Decisiones tomadas:**
- Rate limiting en memoria para reducir complejidad (sin Redis).
- Access token en memoria (cliente) para evitar persistencia en `localStorage`.

### Sprint 1.5 UX (UX-01 al UX-03)

**Commit de referencia:** `992f3e0`  
**Fecha aproximada:** 2026-03-14 (por fecha del commit)  
**Objetivo:** mejorar UX del dashboard: navegación, feedback, flujos de creación/aprobación.

**Entregado:**
- UX-01: Navegación y layout del dashboard (Shell + Sidebar + Header).
- UX-02: Flujos de movimientos (crear/aprobar/rechazar) con estados UI.
- UX-03: Feedback (toasts) y refrescos de UI coordinados.

**Métricas al cierre:**
- Tests: estado actual del repo: 215 passed / 0 failed
- TypeScript: ver commit `992f3e0`
- Build: ver commit `992f3e0`

**Decisiones tomadas:**
- Uso de CustomEvents (`onebusiness:*`) para coordinar Shell y páginas sin prop drilling.

### Sprint 2.1 Dashboards (2.1-A al 2.1-D)

**Commit de referencia:** incluido en `992f3e0` o agregado posteriormente sin commits intermedios visibles  
**Fecha aproximada:** 2026-03-14 (por fecha del commit más cercano)  
**Objetivo:** consolidar vistas de dashboard (operativo/global) y semáforo por umbrales.

**Entregado:**
- 2.1-A: Dashboard global (`/dashboard`) con métricas por negocio.
- 2.1-B: Semáforo con umbrales configurables por negocio.
- 2.1-C: Resumen global vía API (`/api/dashboard/resumen-global`).
- 2.1-D: Dashboard operativo (`/movimientos`) orientado a aprobación + historial.

**Métricas al cierre:**
- Tests: estado actual del repo: 215 passed / 0 failed
- TypeScript: ver commit `992f3e0`
- Build: ver commit `992f3e0`

**Decisiones tomadas:**
- Separar dashboard global (KPIs) del operativo (tabla) para mantener foco y performance.

### Documentación (ground-truth + cto-planning)

**Commit de referencia:** sin commit intermedio visible en este repo  
**Fecha aproximada:** 2026-03-14 (fecha de actualización en documentos)  
**Objetivo:** asegurar trazabilidad y “single source of truth” del sistema para desarrollo y planning.

**Entregado:**
- DOC-01: `docs/ground-truth.md` verificado contra el código.
- DOC-02: `docs/cto-planning.md` alineado con `git log` y estado real del repo.

**Métricas al cierre:**
- Tests: 215 passed / 0 failed
- TypeScript: no documentado
- Build: no documentado

**Decisiones tomadas:**
- Documentar “ground truth” por lectura de código (no por supuestos).
- Explicitar limitaciones del historial de git cuando hay commits agrupados.

## Sprint 2.2 — Registro masivo de movimientos ✅

Completado. Tests: 193 passed, 0 failed.

### 2.2-A — "Guardar y agregar otro"

- `MovimientoForm` acepta `onSuccessAndNew` además de `onSuccess`
- Reset selectivo: mantiene `negocioId`, `cuentaBancoId`, `fecha`
- No cierra el Sheet al usar "Guardar y agregar otro"

### 2.2-B — Endpoint importación Excel

- `GET /api/movimientos/plantilla`: genera `.xlsx` con 3 hojas (Movimientos, Instrucciones, Catálogos dinámico desde BD)
- `POST /api/movimientos/importar`: `multipart/form-data`
  - Campo: `archivo`
  - Lookup por nombre (no ID) — decisión D-09
  - Validación por fila con reporte de errores (fila, campo, mensaje)
  - Batch queries para lookup (evita N+1)
  - `db.transaction()` con rollback total
  - Límite 200 filas
  - Externo bloqueado por RBAC (403)
  - `AuditEvento.MOVIMIENTO_IMPORTADO`

### 2.2-C — UI importación Excel

- Página `/importar-movimientos` con 3 fases locales: subir → previsualizar → resultado
- Botón "Importar" en header de `/movimientos` (no en Sidebar)
- Parseo client-side con `xlsx` antes de enviar al servidor
- Errores del servidor mostrados sobre la tabla de previsualización

## Sprint 2.3 — Módulo NUPLEN / Cotizaciones ✅

Completado. Tests: 215 passed, 0 failed.

### 2.3-A — BD + APIs CRUD

- Enum `estado_cotizacion` (5 valores)
- Tabla `cotizaciones` con folio auto `COT-YYYY-NNN` + `folio_externo`
- Tabla `cotizacion_items` con `ON DELETE CASCADE`
- Campos `rfc`/`direccion`/`telefono` agregados a `negocios` (nullable)
- Migración: `0006_ambitious_blink.sql`
- Endpoints implementados (7 métodos):
  - `GET/POST /api/cotizaciones`
  - `GET/PATCH/DELETE /api/cotizaciones/:id`
  - `PATCH /api/cotizaciones/:id/estado`
  - `GET /api/cotizaciones/:id/pdf`
- Audit events nuevos:
  - `COTIZACION_CREADA`, `COTIZACION_ACTUALIZADA`, `COTIZACION_APROBADA`, `COTIZACION_FACTURADA`, `COTIZACION_CANCELADA`, `COTIZACION_ELIMINADA`

### 2.3-B — UI Lista de cotizaciones

- Página `/cotizaciones` con filtros, tabla, paginación
- Ítem en Sidebar (todos los roles)
- 4 dialogs inline: Enviar, Aprobar, Facturar, Cancelar
- `primerConcepto` en listado (subquery ítem `orden=1`, truncado a 80 chars)

### 2.3-C — Formulario de cotización

- `CotizacionForm` reutilizable (crear/editar)
- `useFieldArray` para ítems dinámicos
- Cálculo automático `importe = cantidad × precioUnitario` (cuando aplica)
- Totales en tiempo real (subtotal, IVA 16%, total)
- Preview datos del emisor: verde si completo, amber si incompleto
- Páginas: `/cotizaciones/nueva`, `/cotizaciones/[id]/editar`, `/cotizaciones/[id]` (detalle)

### 2.3-E — PDF membretado

- `@react-pdf/renderer` (server-side, sin Chromium)
- `GET /api/cotizaciones/:id/pdf`
- Layout: header membretado, cliente, tabla ítems, totales, cláusulas, firma
- Botón "Descargar PDF" funcional en `/cotizaciones/[id]`
- Fix: `GET /api/negocios/:id` ahora retorna `rfc/direccion/telefono`

## 3. Estado actual del sistema

Leyenda:

- ✅ Completo y en producción
- 🔧 Completo pero mejorable
- 🚧 En desarrollo
- 📋 Planificado
- ❌ No planificado / descartado

| Módulo                        | Estado | Notas (ground truth)                                                  |
| ----------------------------- | ------ | --------------------------------------------------------------------- |
| Autenticación (JWT + refresh) | 🔧     | Funciona y rota; falta instrumentar audit de refresh/replay explícito |
| Autorización (RBAC)           | 🔧     | Método-based; inconsistencia Externo en types vs enforcement          |
| “Tenant” por negocio          | ✅      | Validación por `negocioId` y asignación en `usuario_negocio`          |
| Negocios                      | ✅      | CRUD parcial + umbrales                                               |
| Movimientos (ingreso/egreso)  | ✅      | CRUD + estados + reenvío                                              |
| Importación masiva movimientos | ✅     | Plantilla Excel + importación transaccional + UI 3 fases              |
| Traspasos                     | ✅      | Movimiento doble vinculado                                            |
| Aprobaciones                  | ✅      | Tabla de pendientes + aprobar/rechazar                                |
| Cotizaciones (NUPLEN)         | ✅      | CRUD + transiciones + PDF + movimiento INGRESO al facturar            |
| Categorías                    | ✅      | CRUD + activa/inactiva                                                |
| Cuentas banco                 | ✅      | CRUD + saldo calculado                                                |
| Dashboard global              | 🔧     | Existe resumen; faltan reportes custom                                |
| Audit logs                    | 🔧     | Tabla y logger; falta UI de consulta                                  |
| Emails (Resend)               | 🔧     | Integrado; en prod requiere configuración                             |
| Reportes                      | 🚧     | API stub presente                                                     |
| Empleados                     | 🚧     | API stub presente                                                     |
| Nómina                        | 🚧     | API stub presente                                                     |

Referencias:

- APIs: [src/app/api](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api)
- Servicios: [src/services](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/services)

## 4. Deuda técnica conocida

✅ RESUELTO en 2.2-A: "Guardar y agregar otro" en el formulario de movimientos.

| Qué                                                                                        | Por qué se dejó          | Impacto                                      | Sprint sugerido        |
| ------------------------------------------------------------------------------------------ | ------------------------ | -------------------------------------------- | ---------------------- |
| Inconsistencia `Externo` (types permite write, enforcement no)                             | Iteración rápida de RBAC | Riesgo de bugs en checks futuros / confusión | Sprint 2.2 (hardening) |
| Audit de refresh/replay no instrumentado                                                   | Prioridad a core auth    | Menor trazabilidad de incidentes             | SEC-08                 |
| UI para consultar audit logs                                                               | No era core UX           | Difícil auditoría operativa                  | SEC-12                 |
| Rate limiter en memoria (sin Redis)                                                        | Menor complejidad        | Riesgo en multi-instancia (inconsistente)    | SEC-09 / infra         |
| negocioId no fluye del Shell a las páginas                                                  | Decisión consciente en UX-01 para no bloquear el sprint; se dejó para iteración posterior | `DashboardShell` mantiene `negocioId` seleccionado pero no lo pasa a páginas hijas.<br>Cada página maneja su propio `negocioId` y reacciona vía `localStorage`/eventos (ej. `onebusiness:negocio-changed`).<br>Esto duplica lógica y puede generar inconsistencias si alguna vista no escucha/actualiza. | Sprint 2.4 o al implementar un contexto global de negocio seleccionado |
| Componentes vacíos (`confirm-dialog`, `date-picker`, `movimiento-card`, `movimiento-list`) | Stubs                    | Deuda de mantenimiento y confusión           | Sprint 2.2             |
| Documentación de APIs por contrato (OpenAPI) inexistente                                   | Tiempo                   | Integraciones más lentas                     | Sprint 2.4             |
| DT-05: No existe página de ajustes del negocio                                             | Se priorizó módulo de cotizaciones | El link "Configurar datos del emisor" no tiene destino; no hay UI para editar `rfc/direccion/telefono` | Sprint 2.5 |
| DT-06: Selector de negocios (no-Dueño) hace múltiples llamadas                              | Workaround por restricciones en `/api/negocios` | Performance subóptima y UX más lenta al cargar catálogos | Sprint 2.4 (`GET /api/negocios/mis-negocios`) |
| DT-07: `@react-pdf/renderer` depende de `experimental.serverComponentsExternalPackages`     | Compatibilidad con Next.js 14.2.35 | En upgrade a Next.js 15+ migrar a `serverExternalPackages` (sin `experimental`) | Sprint 2.4 o al upgrade |

## 5. Roadmap de próximos sprints

✅ Sprint 2.2 — Registro masivo (completado)

✅ Sprint 2.3 — Módulo NUPLEN/Cotizaciones (completado)

🔜 Sprint 2.4 — Migración histórica de datos

**NOTA CRÍTICA para Sprint 2.4 (migración):**

- `Movimientos_Consolidado.xlsx`: CARGOS = `EGRESO` en OneBusiness (nomenclatura bancaria invertida)
- Cotizaciones históricas: usar `folio_externo` para preservar folio NUPLEN original
- 17 RANGOs identificados en el Excel = negocios en BD (TRASPASO es tipo, no negocio)
- 16 cuentas BANCO identificadas = `cuentas_banco` en BD
- ~1,838 movimientos, ~485 cotizaciones históricas
- Prerequisito: mapeo RANGO→`negocio_id` y BANCO→`cuenta_banco_id` confirmado con el Dueño

🔜 Sprint 2.5 — Ajustes del negocio (datos del emisor, configuración)

⏸  Sprint 2.6 — Design System (pospuesto hasta feedback de usuarios reales)

### Mejoras de seguridad pendientes (SEC-08 al SEC-12)

- SEC-08: CSP nonce-based (CSP actual es estático en headers)
- SEC-09: Rate limiter distribuido (Redis) si se escala
- SEC-10: MFA/TOTP para Dueño y Socio
- SEC-11: Upgrade Next.js (hoy: 14.2.35)
- SEC-12: UI de consulta de audit logs

## 6. Decisiones de arquitectura registradas

### D-01: Traspasos como movimiento doble vinculado

- Contexto: un traspaso afecta dos cuentas y requiere trazabilidad completa.
- Decisión: modelar como **2 movimientos** (`TRASPASO_SALIDA` y `TRASPASO_ENTRADA`) vinculados por `traspaso_id`.
- Alternativas: tabla `traspasos` separada + líneas.
- Consecuencias: aprobación debe mantener consistencia entre par.

Referencias:

- DB: [drizzle.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/drizzle.ts#L167-L201)
- API: [traspasos route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/traspasos/route.ts)

### D-02: Semáforo con umbrales fijos modificables

- Contexto: necesidad de alertas rápidas por negocio.
- Decisión: persistir `umbral_alerta` y `umbral_critico` en `negocios`.
- Alternativas: reglas dinámicas por categoría, o motor de reglas.
- Consecuencias: umbrales simples, fácil explicar; menos flexible.

Referencias:

- Migración: [0008\_semaforo\_umbrales\_y\_traspaso\_id.sql](file:///c:/Users/nadir/SergioMadrid/onebusiness/drizzle/migrations/0008_semaforo_umbrales_y_traspaso_id.sql)

### D-03: Dashboard Operativo reemplaza /movimientos

- Contexto: la operación diaria se centra en tabla, filtros y aprobación.
- Decisión: `/movimientos` es dashboard operativo (tabla + acciones).
- Alternativas: separar “tabla” de “dashboard”.
- Consecuencias: ruta única simplifica UX; el global queda en `/dashboard`.

Referencias:

- UI: [movimientos page.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/\(dashboard\)/movimientos/page.tsx)
- UI: [dashboard page.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/\(dashboard\)/dashboard/page.tsx)

### Rate limiter en memoria (vs Redis)

- Contexto: protección rápida sin infra adicional.
- Decisión: rate limiting in-memory.
- Consecuencia: no sirve para multi-instancia sin consistencia.

Referencia:

- [rate-limiter.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/rate-limiter.ts)

### 1 sesión activa por usuario (vs múltiples sesiones)

- Contexto: reducir superficie de ataque con refresh tokens.
- Decisión: un solo `refresh_token_hash` por usuario.
- Consecuencia: login nuevo invalida sesión previa.

Referencia:

- [auth.service.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/services/auth.service.ts)

### accessToken en memoria (vs localStorage)

- Contexto: minimizar persistencia en cliente.
- Decisión: access token en `AuthContext` + API client en memoria.
- Consecuencia: requiere refresh al recargar.

Referencia:

- [auth-context.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/contexts/auth-context.tsx)

### Registro D-09 a D-18 (Sprints 2.2 y 2.3)

| ID   | Decisión | Alternativa descartada | Justificación |
| ---- | -------- | ---------------------- | ------------- |
| D-09 | Importación Excel con lookup por nombre | Lookup por IDs numéricos directos | El usuario copia desde su Excel operativo que ya usa nombres legibles |
| D-10 | Items de cotización: `cantidad`/`precioUnitario` nullable | Siempre requerir ambos | Datos reales muestran mezcla de precio fijo y precio desglosado |
| D-11 | Estados de cotización: `BORRADOR→ENVIADA→APROBADA→FACTURADA→CANCELADA` | Roadmap original (EnProgreso/Aprobada/Cancelada) | `numeroOc` es trigger de APROBADA y `numeroFactura` de FACTURADA (datos reales) |
| D-12 | Movimiento `INGRESO` generado al FACTURAR con estado `PENDIENTE` | Generarlo al APROBAR | Al facturar hay certeza del monto; el cobro se procesa después (pendiente) |
| D-13 | Folio interno `COT-YYYY-NNN` + `folio_externo` para migración | Usar folio NUPLEN directamente | Folio NUPLEN tiene gaps y duplicados en datos reales |
| D-14 | `@react-pdf/renderer` para PDFs | `puppeteer`/Chromium | Generación server-side sin Chromium; compatible con API routes |
| D-15 | Datos del emisor en `negocios` (`rfc/direccion/telefono` nullable) | Variables de entorno globales | Cada negocio puede tener datos fiscales distintos |
| D-16 | Externo puede crear cotizaciones | Solo Socio/Admin/Dueño | Flujo real: Externo (vendedor) crea, Admin/Dueño aprueba |
| D-17 | `categoria_id` opcional en cotizaciones | Sin categoría en cotizaciones | Permite pre-asignar categoría a la cotización (el movimiento generado hoy no persiste categoría: no existe campo) |
| D-18 | Paginación clásica en cotizaciones | Scroll infinito | Consistencia con el resto del sistema |

## 7. Convenciones del proyecto

### Convenciones de carpetas

- `src/app`: App Router (páginas UI y API routes).
- `src/services`: lógica de negocio.
- `src/lib`: utilidades (DB, JWT, audit, rate limiting).
- `src/middleware`: auth/tenant/permissions reutilizables en API.
- `src/components`: UI (layout, shared, domain, ui base).

### Patrón de un endpoint nuevo (paso a paso)

1. Crear carpeta en `src/app/api/<dominio>/<ruta>/route.ts`.
2. En `route.ts`:
   - Validar auth: `authenticateRequest(request)`.
   - Validar tenant: `validateTenantAccess(request, user)` si aplica.
   - Llamar a un service (no lógica pesada en route).
   - Normalizar errores a JSON con status HTTP.
3. Agregar tests en `tests/integration/<dominio>.test.ts`.

### Patrón de un componente nuevo

- Preferir composición en `src/components/<dominio>/...`.
- Usar componentes base en `src/components/ui`.
- Manejar estados con `EmptyState` / `ErrorState` / `PageLoader` cuando aplique.

### Cómo agregar una migración de BD

1. Actualizar `src/lib/drizzle.ts`.
2. Ejecutar `npm run db:generate`.
3. Revisar/ajustar SQL en `drizzle/migrations/*`.
4. Aplicar en entorno con `npm run db:migrate`.

### Cómo agregar un evento de audit log

1. Definir (o reutilizar) `AuditEvento` en `src/lib/audit-logger.ts`.
2. Llamar `auditLog({ evento, userId, ... })` en el service/endpoints apropiados.

### Cómo agregar permisos a un nuevo rol

Estado actual:

- Roles son DB (`roles`) pero enforcement es código (middleware) por método.

Pasos sugeridos:

- Ajustar `ROLE_PERMISSIONS` y `hasPermission` en middleware para reflejar el rol nuevo.
- Agregar tests en `tests/integration/rbac.test.ts` y `tests/unit/permissions.test.ts`.

### Convención de commits (a partir de Sprint 2.2)

Formato: `"[ID-PROMPT]: descripción breve"`

Ejemplos:
- `2.2-A: migración BD para importación Excel`
- `2.2-B: endpoint de importación con validación`
- `2.2-C: UI de importación con previsualización`

Esto permite que `git log --oneline` sea el índice del historial de desarrollo.
