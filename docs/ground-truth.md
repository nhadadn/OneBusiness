# OneBusiness — Ground Truth Técnico

**Última actualización:** 2026-03-15\
**Versión del repo (package.json):** 0.1.0

## Tabla de contenidos

- [1. Resumen ejecutivo](#1-resumen-ejecutivo)
- [2. Arquitectura general](#2-arquitectura-general)
- [3. Base de datos](#3-base-de-datos)
- [4. Autenticación y seguridad](#4-autenticación-y-seguridad)
- [5. Autorización (RBAC)](#5-autorización-rbac)
- [6. APIs disponibles](#6-apis-disponibles)
- [7. Componentes de UI reutilizables](#7-componentes-de-ui-reutilizables)
- [8. Flujos de usuario](#8-flujos-de-usuario)
- [9. Sistema de eventos del cliente](#9-sistema-de-eventos-del-cliente)
- [10. Tests](#10-tests)
- [11. Scripts](#11-scripts)
- [12. Variables de entorno](#12-variables-de-entorno)

## 1. Resumen ejecutivo

OneBusiness es una aplicación web (Next.js) para gestionar negocios y sus movimientos financieros (ingresos, egresos y traspasos), con un flujo de aprobación y un dashboard operativo.

**Stack tecnológico (versiones exactas de package.json)**

| Capa                  | Tecnología           | Versión                   |
| --------------------- | -------------------- | ------------------------- |
| Frontend / Backend    | Next.js              | 14.2.35                   |
| UI                    | React                | ^18                       |
| UI primitives         | Radix UI             | varias (ver package.json) |
| Estilos               | Tailwind CSS         | ^3.4.1                    |
| Fetch / estado server | TanStack React Query | ^5.66.0                   |
| Validación            | Zod                  | ^4.3.6                    |
| DB ORM                | Drizzle ORM          | ^0.45.1                   |
| Migraciones           | drizzle-kit          | ^0.31.9                   |
| PostgreSQL driver     | postgres             | ^3.4.8                    |
| Auth crypto/JWT       | jose                 | ^6.2.1                    |
| Password hashing      | bcrypt               | ^6.0.0                    |
| Email                 | Resend               | ^6.9.3                    |
| Tests                 | Vitest               | ^2.1.9                    |

Referencias:

- [package.json](file:///c:/Users/nadir/SergioMadrid/onebusiness/package.json)

**Dependencias recientes relevantes**

- `xlsx` (SheetJS): parseo/generación de Excel (cliente y servidor)
- `@react-pdf/renderer`: generación de PDF server-side (cotizaciones)
- Config requerida en Next.js: `experimental.serverComponentsExternalPackages: ['@react-pdf/renderer']` en [next.config.mjs](file:///c:/Users/nadir/SergioMadrid/onebusiness/next.config.mjs)

## 2. Arquitectura general

### Diagrama (flujo de datos)

```mermaid
flowchart LR
  B[Browser] -->|UI Routes| N[Next.js App Router]
  N -->|fetch /api/*| A[API Routes (route.ts)]
  A --> S[Services]
  S --> D[Drizzle ORM]
  D --> P[(PostgreSQL)]

  N -->|Client state| C[AuthContext + React Query]
  C -->|Authorization headers| A
```

### Capas y responsabilidades

- **UI (App Router)**: páginas y componentes de dashboard/login; dispara llamadas a API y orquesta estado del cliente.
- **API Routes**: validan autenticación/autorización, parsean request, llaman servicios y devuelven respuestas JSON.
- **Services**: lógica de negocio (crear/aprobar/rechazar movimientos, RBAC por rol y por negocio, etc.).
- **Drizzle**: acceso a datos tipado y migraciones.
- **PostgreSQL**: persistencia (usuarios, roles, negocios, cuentas, movimientos, audit logs).

Referencias:

- Endpoints en [src/app/api](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api)
- Servicios en [src/services](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/services)
- Esquema en [drizzle.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/drizzle.ts)

## 3. Base de datos

### 3.1 Esquema (src/lib/drizzle.ts)

⚠️ IMPORTANTE: El repositorio usa “tenant” como **scope por negocio** (negocioId) a nivel de autorización, no existe una tabla `tenants`.

#### Tabla: `negocios`

| Columna (DB)    | Campo (TS)    | Tipo          | Nullable | Default | Descripción                                       |
| --------------- | ------------- | ------------- | -------- | ------- | ------------------------------------------------- |
| id              | id            | serial        | no       | —       | PK                                                |
| nombre          | nombre        | varchar(255)  | no       | —       | Nombre del negocio                                |
| rubro           | rubro         | varchar(100)  | sí       | —       | Rubro opcional                                    |
| modelo\_ingreso | modeloIngreso | varchar(100)  | sí       | —       | Modelo de ingreso opcional                        |
| tiene\_socios   | tieneSocios   | boolean       | sí       | false   | Flag de socios                                    |
| activo          | activo        | boolean       | sí       | true    | Activo/inactivo                                   |
| umbral\_alerta  | umbralAlerta  | numeric(12,2) | sí       | —       | Umbral semáforo “alerta”                          |
| umbral\_critico | umbralCritico | numeric(12,2) | sí       | —       | Umbral semáforo “crítico”                         |
| configuracion   | configuracion | jsonb         | sí       | —       | JSON libre de configuración                       |
| created\_at     | createdAt     | timestamp     | sí       | now()   | Auditoría                                         |
| updated\_at     | updatedAt     | timestamp     | sí       | now()   | Auditoría                                         |
| rfc             | rfc           | varchar(20)   | sí       | —       | RFC fiscal del negocio (nullable por datos reales) |
| direccion       | direccion     | text          | sí       | —       | Dirección fiscal del negocio                      |
| telefono        | telefono      | varchar(30)   | sí       | —       | Teléfono de contacto                              |

Relaciones:

- 1:N con `centros_costo`, `categorias`, `usuario_negocio`.

Índices:

- No se definen índices explícitos en `negocios` en el schema actual (más allá de la PK).

Referencia:

- [drizzle.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/drizzle.ts#L7-L22)

#### Tabla: `centros_costo`

| Columna (DB) | Campo (TS) | Tipo         | Nullable | Default | Descripción                |
| ------------ | ---------- | ------------ | -------- | ------- | -------------------------- |
| id           | id         | serial       | no       | —       | PK                         |
| nombre       | nombre     | varchar(255) | no       | —       | Nombre del centro de costo |
| codigo       | codigo     | varchar(50)  | sí       | —       | Código opcional            |
| negocio\_id  | negocioId  | integer      | no       | —       | FK a `negocios.id`         |
| activo       | activo     | boolean      | sí       | true    | Activo/inactivo            |
| created\_at  | createdAt  | timestamp    | sí       | now()   | Auditoría                  |
| updated\_at  | updatedAt  | timestamp    | sí       | now()   | Auditoría                  |

Índices:

- `idx_centros_costo_negocio_id` sobre `negocio_id`.

Referencia:

- [drizzle.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/drizzle.ts#L30-L49)

#### Enum: `rol_nombre` y tabla `roles`

Enum `rol_nombre`: `Dueño | Socio | Admin | Externo`.

| Columna (DB) | Campo (TS)  | Tipo         | Nullable | Default | Descripción                                                |
| ------------ | ----------- | ------------ | -------- | ------- | ---------------------------------------------------------- |
| id           | id          | serial       | no       | —       | PK                                                         |
| nombre       | nombre      | rol\_nombre  | no       | —       | Nombre del rol (único)                                     |
| descripcion  | descripcion | varchar(500) | sí       | —       | Descripción                                                |
| permisos     | permisos    | jsonb        | no       | —       | JSON de permisos (no usado para enforcement en middleware) |
| created\_at  | createdAt   | timestamp    | sí       | now()   | Auditoría                                                  |

Referencia:

- [drizzle.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/drizzle.ts#L54-L70)

#### Tabla: `usuarios`

| Columna (DB)          | Campo (TS)        | Tipo         | Nullable | Default | Descripción                                     |
| --------------------- | ----------------- | ------------ | -------- | ------- | ----------------------------------------------- |
| id                    | id                | serial       | no       | —       | PK                                              |
| nombre\_completo      | nombreCompleto    | varchar(255) | no       | —       | Nombre del usuario                              |
| email                 | email             | varchar(255) | no       | —       | Email (único)                                   |
| password\_hash        | passwordHash      | varchar(255) | no       | —       | Hash bcrypt                                     |
| rol\_id               | rolId             | integer      | no       | —       | FK a `roles.id`                                 |
| token\_version        | tokenVersion      | integer      | no       | 0       | Versión para invalidar access tokens            |
| activo                | activo            | boolean      | sí       | true    | Activo/inactivo                                 |
| fecha\_ultimo\_acceso | fechaUltimoAcceso | timestamp    | sí       | —       | Último acceso                                   |
| created\_at           | createdAt         | timestamp    | sí       | now()   | Auditoría                                       |
| updated\_at           | updatedAt         | timestamp    | sí       | now()   | Auditoría                                       |
| refresh\_token\_hash  | refreshTokenHash  | varchar(64)  | sí       | —       | SHA-256 hex del refresh token activo (rotación) |

Referencia:

- [drizzle.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/drizzle.ts#L75-L96)

#### Tabla: `usuario_negocio` (N:M)

| Columna (DB)          | Campo (TS)          | Tipo      | Nullable | Default | Descripción                                    |
| --------------------- | ------------------- | --------- | -------- | ------- | ---------------------------------------------- |
| id                    | id                  | serial    | no       | —       | PK                                             |
| usuario\_id           | usuarioId           | integer   | no       | —       | FK a `usuarios.id`                             |
| negocio\_id           | negocioId           | integer   | no       | —       | FK a `negocios.id`                             |
| permisos\_especificos | permisosEspecificos | jsonb     | sí       | —       | Overrides por negocio (no usado en middleware) |
| fecha\_asignacion     | fechaAsignacion     | timestamp | sí       | now()   | Fecha de asignación                            |

Índices:

- `idx_usuario_negocio_usuario_id`, `idx_usuario_negocio_negocio_id`.

Referencia:

- [drizzle.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/drizzle.ts#L100-L122)

#### Enum: `tipo_categoria` y tabla `categorias`

Enum `tipo_categoria`: `INGRESO | EGRESO`.

| Columna (DB) | Campo (TS) | Tipo            | Nullable | Default | Descripción                         |
| ------------ | ---------- | --------------- | -------- | ------- | ----------------------------------- |
| id           | id         | serial          | no       | —       | PK                                  |
| nombre       | nombre     | varchar(100)    | no       | —       | Nombre                              |
| tipo         | tipo       | tipo\_categoria | no       | —       | Ingreso / egreso                    |
| negocio\_id  | negocioId  | integer         | sí       | —       | FK a `negocios.id` (cascade delete) |
| activa       | activa     | boolean         | no       | true    | Activa/inactiva                     |
| created\_at  | createdAt  | timestamp       | no       | now()   | Auditoría                           |
| updated\_at  | updatedAt  | timestamp       | no       | now()   | Auditoría                           |

Índices:

- `idx_categorias_negocio_id`, `idx_categorias_tipo`, `idx_categorias_activa`, `uq_categorias_nombre_negocio` (nombre + negocio\_id).

Referencia:

- [drizzle.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/drizzle.ts#L124-L144)

#### Enum: `tipo_cuenta` y tabla `cuentas_banco`

Enum `tipo_cuenta`: `EFECTIVO | BANCARIA | CAJA_CHICA`.

| Columna (DB)       | Campo (TS)       | Tipo          | Nullable | Default | Descripción          |
| ------------------ | ---------------- | ------------- | -------- | ------- | -------------------- |
| id                 | id               | serial        | no       | —       | PK                   |
| nombre             | nombre           | varchar(100)  | no       | —       | Nombre corto         |
| tipo               | tipo             | tipo\_cuenta  | no       | —       | Tipo                 |
| banco\_institucion | bancoInstitucion | varchar(50)   | sí       | —       | Banco/Institución    |
| titular            | titular          | varchar(100)  | sí       | —       | Titular              |
| negocio\_id        | negocioId        | integer       | no       | —       | FK a `negocios.id`   |
| saldo\_inicial     | saldoInicial     | numeric(15,2) | no       | '0'     | Saldo inicial        |
| saldo\_real        | saldoReal        | numeric(15,2) | sí       | —       | Saldo real (manual)  |
| fecha\_saldo\_real | fechaSaldoReal   | timestamp     | sí       | —       | Fecha del saldo real |
| activo             | activo           | boolean       | no       | true    | Activo/inactivo      |
| created\_at        | createdAt        | timestamp     | no       | now()   | Auditoría            |
| updated\_at        | updatedAt        | timestamp     | no       | now()   | Auditoría            |

Índices:

- `idx_cuentas_banco_negocio_id`, `idx_cuentas_banco_tipo`, `idx_cuentas_banco_activo`.

Referencia:

- [drizzle.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/drizzle.ts#L146-L165)

#### Enum: `tipo_movimiento` / `estado_movimiento` y tabla `movimientos`

Enum `tipo_movimiento`: `INGRESO | EGRESO | TRASPASO_SALIDA | TRASPASO_ENTRADA`\
Enum `estado_movimiento`: `PENDIENTE | APROBADO | RECHAZADO`

| Columna (DB)      | Campo (TS)      | Tipo               | Nullable | Default   | Descripción                               |
| ----------------- | --------------- | ------------------ | -------- | --------- | ----------------------------------------- |
| id                | id              | serial             | no       | —         | PK                                        |
| negocio\_id       | negocioId       | integer            | no       | —         | FK a `negocios.id`                        |
| centro\_costo\_id | centroCostoId   | integer            | sí       | —         | FK a `centros_costo.id`                   |
| tipo              | tipo            | tipo\_movimiento   | no       | —         | Tipo de movimiento                        |
| fecha             | fecha           | date               | no       | —         | Fecha                                     |
| concepto          | concepto        | text               | no       | —         | Concepto                                  |
| tercero           | tercero         | varchar(150)       | sí       | —         | Tercero opcional                          |
| monto             | monto           | numeric(15,2)      | no       | —         | Monto                                     |
| cuenta\_banco\_id | cuentaBancoId   | integer            | no       | —         | FK a `cuentas_banco.id`                   |
| traspaso\_id      | traspasoRefId   | integer            | sí       | —         | FK a `movimientos.id` (movimiento espejo) |
| estado            | estado          | estado\_movimiento | no       | PENDIENTE | Estado                                    |
| creado\_por       | creadoPor       | integer            | no       | —         | FK a `usuarios.id`                        |
| aprobado\_por     | aprobadoPor     | integer            | sí       | —         | FK a `usuarios.id`                        |
| fecha\_aprobacion | fechaAprobacion | timestamp          | sí       | —         | Fecha aprobación                          |
| motivo\_rechazo   | motivoRechazo   | text               | sí       | —         | Motivo rechazo                            |
| version           | version         | integer            | no       | 1         | Control de concurrencia (usado en update) |
| created\_at       | createdAt       | timestamp          | no       | now()     | Auditoría                                 |
| updated\_at       | updatedAt       | timestamp          | no       | now()     | Auditoría                                 |
| activo            | activo          | boolean            | no       | true      | Soft-flag (no soft delete real)           |

Índices:

- `idx_movimientos_negocio_id`, `idx_movimientos_fecha`, `idx_movimientos_tipo`, `idx_movimientos_estado`,
  `idx_movimientos_cuenta_banco`, `idx_movimientos_creado_por`, `idx_movimientos_aprobado_por`, `idx_movimientos_traspaso_id`.

Referencia:

- [drizzle.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/drizzle.ts#L167-L241)

#### Enum: `estado_cotizacion`

Enum `estado_cotizacion`: `BORRADOR | ENVIADA | APROBADA | FACTURADA | CANCELADA`.

#### Tabla: `cotizaciones`

| Columna (DB)        | Campo (TS)       | Tipo               | Nullable | Default   | Descripción                                                        |
| ------------------- | ---------------- | ------------------ | -------- | --------- | ------------------------------------------------------------------ |
| id                  | id               | serial             | no       | —         | PK                                                                 |
| negocio\_id         | negocioId        | integer            | no       | —         | FK a `negocios.id`                                                 |
| folio               | folio            | varchar(20)        | no       | —         | Folio interno `COT-YYYY-NNN` (único por año, ver sección de folio) |
| folio\_externo      | folioExterno     | varchar(30)        | sí       | —         | Folio histórico (NUPLEN) para migración                            |
| cliente\_nombre     | clienteNombre    | varchar(255)       | no       | —         | Nombre del cliente                                                 |
| cliente\_rfc        | clienteRfc       | varchar(20)        | sí       | —         | RFC del cliente                                                    |
| cliente\_direccion  | clienteDireccion | text               | sí       | —         | Dirección del cliente                                              |
| fecha               | fecha            | date               | no       | —         | Fecha de la cotización                                             |
| estado              | estado           | estado\_cotizacion | no       | BORRADOR  | Estado del flujo de la cotización                                  |
| numero\_oc          | numeroOc         | varchar(50)        | sí       | —         | Número de OC (requerido al APROBAR)                                 |
| numero\_factura     | numeroFactura    | varchar(50)        | sí       | —         | Número de factura (requerido al FACTURAR)                           |
| cuenta\_banco\_id   | cuentaBancoId    | integer            | sí       | —         | FK a `cuentas_banco.id` (requerido al FACTURAR)                     |
| categoria\_id       | categoriaId      | integer            | sí       | —         | FK a `categorias.id` (nullable; ver decisión D-17)                  |
| fecha\_aprobacion   | fechaAprobacion  | timestamp          | sí       | —         | Timestamp de aprobación                                             |
| fecha\_facturacion  | fechaFacturacion | timestamp          | sí       | —         | Timestamp de facturación                                            |
| movimiento\_id      | movimientoId     | integer            | sí       | —         | FK a `movimientos.id` (INGRESO generado al FACTURAR)                |
| subtotal            | subtotal         | numeric(15,2)      | no       | '0'       | Subtotal (suma importes)                                            |
| iva                 | iva              | numeric(15,2)      | no       | '0'       | IVA 16%                                                             |
| total               | total            | numeric(15,2)      | no       | '0'       | Total                                                               |
| notas               | notas            | text               | sí       | —         | Notas                                                               |
| creado\_por         | creadoPor        | integer            | no       | —         | FK a `usuarios.id`                                                  |
| aprobado\_por       | aprobadoPor      | integer            | sí       | —         | FK a `usuarios.id`                                                  |
| created\_at         | createdAt        | timestamp          | no       | now()     | Auditoría                                                           |
| updated\_at         | updatedAt        | timestamp          | no       | now()     | Auditoría                                                           |

Índices:

- `uq_cotizaciones_folio` (folio único).
- `idx_cotizaciones_negocio_id` sobre `negocio_id`.
- `idx_cotizaciones_estado` sobre `estado`.
- `idx_cotizaciones_fecha` sobre `fecha`.
- `idx_cotizaciones_creado_por` sobre `creado_por`.

#### Tabla: `cotizacion_items`

| Columna (DB)     | Campo (TS)     | Tipo          | Nullable | Default | Descripción                                     |
| ---------------- | -------------- | ------------- | -------- | ------- | ----------------------------------------------- |
| id               | id             | serial        | no       | —       | PK                                              |
| cotizacion\_id   | cotizacionId   | integer       | no       | —       | FK a `cotizaciones.id` (**ON DELETE CASCADE**) |
| orden            | orden          | integer       | no       | —       | Orden del ítem (1..N)                           |
| descripcion      | descripcion    | text          | no       | —       | Descripción                                     |
| cantidad         | cantidad       | numeric(10,4) | sí       | —       | Cantidad (nullable; ver decisión D-10)          |
| unidad\_medida   | unidadMedida   | varchar(50)   | sí       | —       | Unidad de medida                                |
| precio\_unitario | precioUnitario | numeric(15,2) | sí       | —       | Precio unitario (nullable; ver decisión D-10)   |
| importe          | importe        | numeric(15,2) | no       | —       | Importe de la línea                             |
| created\_at      | createdAt      | timestamp     | no       | now()   | Auditoría                                       |

Índices:

- `idx_cotizacion_items_cotizacion_id` sobre `cotizacion_id`.

Referencia:

- Esquema completo: [drizzle.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/drizzle.ts#L127-L257)
- Migración: [0006_ambitious_blink.sql](file:///c:/Users/nadir/SergioMadrid/onebusiness/drizzle/migrations/0006_ambitious_blink.sql)

#### Folio de cotizaciones

Formato automático:

- Formato: `COT-YYYY-NNN`
- Ejemplo: `COT-2026-001`
- `NNN`: correlativo por año con padding a 3 dígitos
- Alcance del correlativo: global por año (no por negocio)
- `folio_externo`: campo opcional para preservar folios históricos en migración

Referencia:

- Generación: [generarFolio](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/services/cotizacion.service.ts#L64-L84)

#### Tabla: `audit_logs`

| Columna (DB) | Campo (TS) | Tipo         | Nullable | Default | Descripción             |
| ------------ | ---------- | ------------ | -------- | ------- | ----------------------- |
| id           | id         | serial       | no       | —       | PK                      |
| user\_id     | userId     | integer      | sí       | —       | Usuario asociado        |
| negocio\_id  | negocioId  | integer      | sí       | —       | Negocio asociado        |
| evento       | evento     | varchar(60)  | no       | —       | Tipo de evento (string) |
| recurso      | recurso    | varchar(100) | sí       | —       | Recurso afectado        |
| recurso\_id  | recursoId  | varchar(50)  | sí       | —       | ID del recurso          |
| exitoso      | exitoso    | boolean      | no       | —       | éxito/fallo             |
| detalles     | detalles   | text         | sí       | —       | Texto libre             |
| ip\_address  | ipAddress  | varchar(45)  | sí       | —       | IP                      |
| user\_agent  | userAgent  | varchar(300) | sí       | —       | User agent              |
| request\_id  | requestId  | varchar(36)  | sí       | —       | Correlación             |
| creado\_en   | creadoEn   | timestamp    | no       | now()   | Timestamp evento        |

Índices (migración):

- `idx_audit_logs_user_id`, `idx_audit_logs_evento`, `idx_audit_logs_creado_en` (DESC),
  `idx_audit_logs_negocio_id` (partial, solo cuando negocio\_id no es null).

Referencia:

- [drizzle.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/drizzle.ts#L249-L262)

### 3.2 Historial de migraciones (drizzle/migrations)

|    # | Archivo                                       | Cambio                                                                                                                        |
| ---: | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 0001 | 0001\_init.sql                                | Crea `negocios`, `centros_costo`, `roles`, `usuarios`, `usuario_negocio`; enum `rol_nombre`; índices; inserta roles iniciales |
| 0002 | 0002\_token\_version.sql                      | Agrega `usuarios.token_version` (invalidación de access tokens)                                                               |
| 0003 | 0003\_add\_cuentas\_banco.sql                 | Crea enum `tipo_cuenta`, `tipo_movimiento`, `estado_movimiento`; crea `cuentas_banco` e índices                               |
| 0004 | 0004\_add\_movimientos.sql                    | Crea `movimientos`, FKs e índices (incluye `traspaso_ref_id`)                                                                 |
| 0004 | 0004\_aspiring\_iron\_monger.sql              | Crea enum `tipo_categoria`; crea `categorias` e índices                                                                       |
| 0005 | 0005\_yielding\_firestar.sql                  | Agrega índice único `uq_categorias_nombre_negocio`                                                                            |
| 0006 | 0006\_refresh\_token\_rotation.sql            | Agrega `usuarios.refresh_token_hash` (rotación de refresh tokens)                                                             |
| 0006 | 0006\_ambitious\_blink.sql                    | Agrega enum `estado_cotizacion`; agrega columnas `rfc/direccion/telefono` a `negocios`; crea tablas `cotizaciones` y `cotizacion_items` |
| 0007 | 0007\_audit\_logs.sql                         | Crea `audit_logs` e índices para auditoría                                                                                    |
| 0008 | 0008\_semaforo\_umbrales\_y\_traspaso\_id.sql | Agrega `umbral_alerta/critico` a `negocios`; renombra `movimientos.traspaso_ref_id` → `traspaso_id`                           |

## 4. Autenticación y seguridad

### 4.1 Flujo completo de login (paso a paso)

1. El usuario abre `/login` y envía email/password.
2. La UI llama `POST /api/auth/login` con body `{ email, password }`.
3. El endpoint valida credenciales llamando `AuthService.login(...)`.
4. Si es correcto, el servidor:
   - Genera `accessToken` (JWT corto) y `refreshToken` (token largo).
   - Persiste **hash SHA-256** del refresh token en `usuarios.refresh_token_hash` (una sola sesión activa).
   - Setea cookie httpOnly: `onebusiness_refresh_token`.
   - Setea cookie **no httpOnly**: `onebusiness_session` (solo “marcador” de sesión para middleware UI).
5. La UI guarda el `accessToken` en memoria (React state) y lo configura en el cliente HTTP.
6. La UI navega al dashboard.

Referencias:

- Endpoint login: [login route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/auth/login/route.ts)
- Lógica: [auth.service.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/services/auth.service.ts)
- Estado del cliente: [auth-context.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/contexts/auth-context.tsx)

### 4.1.1 Recuperación de sesión al recargar página

Flujo exacto (desde el montaje de `AuthProvider`):

1. `AuthProvider` monta con estado inicial: `accessToken=null`, `user=null`, `isLoading=true`.
2. En el `useEffect` de montaje, se ejecuta `refreshSession()` y al finalizar se setea `isLoading=false`.
3. `refreshSession()`:
   - Deduplica llamadas concurrentes (`isRefreshing` + `refreshPromise`).
   - Llama `POST /api/auth/refresh` con `credentials:'include'` y body `{}`.
4. Si la respuesta no es OK:
   - Limpia sesión: `accessToken=null`, `user=null`, `setApiClientAccessToken(null)`.
   - Limpia cookie “marcador” `onebusiness_session`.
   - Retorna `null`.
5. Si la respuesta es OK:
   - Parsea JSON y toma `accessToken` y `user` (o `usuario`).
   - Si falta token o user, aplica el mismo “logout local” del punto 4.
   - Si existen:
     - Setea `accessToken` y `user` en estado.
     - Setea `setApiClientAccessToken(accessToken)` para futuras llamadas API.
     - Setea cookie “marcador” `onebusiness_session=1`.
     - Retorna el token.
6. Estado final:
   - Autenticado: `isAuthenticated === true` (token y user presentes).
   - No autenticado: `isAuthenticated === false` (token/user null) y la UI/middleware redirige a `/login` según la ruta.

Referencias:

- [auth-context.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/contexts/auth-context.tsx)
- [refresh route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/auth/refresh/route.ts)

### 4.2 Dónde vive el accessToken

- Vive **solo en memoria** dentro de `AuthContext` (useState) y se propaga al cliente de API mediante `setApiClientAccessToken`.
- No se usa `localStorage` para persistir el access token.

Referencia:

- [auth-context.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/contexts/auth-context.tsx)
- API client: [api-client.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/api-client.ts)

### 4.3 Dónde vive el refreshToken

- Vive en una **cookie httpOnly** `onebusiness_refresh_token` (enviada automáticamente por el browser en requests a `/api/auth/refresh`).
- Además, el servidor devuelve `refreshToken` en el JSON del login/refresh (no es la fuente primaria de persistencia).

Referencia:

- [login route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/auth/login/route.ts)
- [refresh route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/auth/refresh/route.ts)

### 4.4 Rotación de refresh tokens

Modelo implementado (1 sesión activa por usuario):

- `AuthService.login(...)` genera refresh token y guarda `refreshTokenHash`.
- `AuthService.refresh(...)` valida que el hash del refresh token recibido coincida con el hash guardado.
- Si coincide, rota:
  - Genera nuevo refresh token,
  - Actualiza `refreshTokenHash`,
  - Setea nueva cookie `onebusiness_refresh_token`.

Referencia:

- [auth.service.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/services/auth.service.ts)
- Migración: [0006\_refresh\_token\_rotation.sql](file:///c:/Users/nadir/SergioMadrid/onebusiness/drizzle/migrations/0006_refresh_token_rotation.sql)

### 4.5 Detección de replay attack (refresh token)

El “replay” se detecta por **mismatch de hash**:

- Si llega un refresh token cuyo SHA-256 **no coincide** con el hash persistido, se considera token inválido y se revoca la sesión (hash a null) y se fuerza re-login.

⚠️ Observación (estado real):

- Existe el tipo de evento `REPLAY_ATTACK_DETECTED` en el audit logger, pero en el código actual no se emite explícitamente ese evento en el flujo de refresh.

Referencia:

- [auth.service.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/services/auth.service.ts)
- Tipos de auditoría: [audit-logger.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/audit-logger.ts)

### 4.6 Rate limiting

El rate limiter está implementado en memoria (sin Redis), con un mapa por `key` (ej. `ip:...` o `user:...`) y “cooldown” por bloqueo.

Valores exactos (`RATE_LIMIT_CONFIGS`):

| Endpoint                      | Intentos máx | Ventana | Bloqueo |
| ----------------------------- | -----------: | ------: | ------: |
| Login (`/api/auth/login`)     |            5 |  15 min |  15 min |
| Refresh (`/api/auth/refresh`) |           20 |   1 min |   5 min |

Referencia:

- Implementación: [rate-limiter.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/rate-limiter.ts)
- Uso: [login route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/auth/login/route.ts)

### 4.7 Security headers (Next.js)

Se configuran headers de seguridad en `next.config.mjs` (via `headers()`), con los valores exactos siguientes:

| Header                    | Valor                                                                                                                                                                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| X-Content-Type-Options    | `nosniff`                                                                                                                                                                                                                                     |
| X-Frame-Options           | `DENY`                                                                                                                                                                                                                                        |
| Referrer-Policy           | `strict-origin-when-cross-origin`                                                                                                                                                                                                             |
| Permissions-Policy        | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()`                                                                                                                                                            |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` (solo producción)                                                                                                                                                                              |
| Content-Security-Policy   | `default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; worker-src 'self' blob:` |

Referencia:

- [next.config.mjs](file:///c:/Users/nadir/SergioMadrid/onebusiness/next.config.mjs)

### 4.8 Audit logging

Se registra en tabla `audit_logs` mediante `auditLog(...)`.

Tipos de eventos definidos:

- Seguridad/auth: `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `LOGOUT`, `TOKEN_REFRESH_SUCCESS`, `TOKEN_REFRESH_FAILURE`, `REPLAY_ATTACK_DETECTED`, `ACCESS_DENIED`, `RATE_LIMIT_HIT`
- Operación: `MOVIMIENTO_CREADO`, `MOVIMIENTO_APROBADO`, `MOVIMIENTO_RECHAZADO`, `MOVIMIENTO_ELIMINADO`, `MOVIMIENTO_IMPORTADO`, `TRASPASO_CREADO`, `COTIZACION_CREADA`, `COTIZACION_ACTUALIZADA`, `COTIZACION_APROBADA`, `COTIZACION_FACTURADA`, `COTIZACION_CANCELADA`, `COTIZACION_ELIMINADA`, `USUARIO_CREADO`, `ROL_CAMBIADO`, `NEGOCIO_ASIGNADO`

Eventos efectivamente emitidos (verificados en código):

- `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `LOGOUT`, `RATE_LIMIT_HIT`
- `MOVIMIENTO_CREADO`, `MOVIMIENTO_APROBADO`, `MOVIMIENTO_RECHAZADO`, `TRASPASO_CREADO`, `MOVIMIENTO_IMPORTADO`
- `COTIZACION_CREADA`, `COTIZACION_ACTUALIZADA`, `COTIZACION_APROBADA`, `COTIZACION_FACTURADA`, `COTIZACION_CANCELADA`, `COTIZACION_ELIMINADA`

Referencia:

- [audit-logger.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/audit-logger.ts)
- Movimientos: [movimiento.service.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/services/movimiento.service.ts)
- Auth endpoints: [src/app/api/auth](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/auth)

## 5. Autorización (RBAC)

### 5.1 Roles

Roles reales del sistema (DB enum `rol_nombre`):

- Dueño
- Socio
- Admin
- Externo

Referencia:

- [drizzle.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/drizzle.ts#L54-L70)

### 5.2 “Tenant” por negocio (negocioId)

Para roles distintos de Dueño:

- Cada request debe declarar el `negocioId` (query param o header `x-negocio-id`).
- Se valida que el `negocioId` esté en la lista de negocios del usuario (tabla `usuario_negocio`).

Dueño:

- Puede omitir `negocioId` (contexto `negocioId: null`) y acceder transversalmente, pero algunos endpoints requieren explícitamente negocioId.

Referencia:

- [tenant-middleware.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/middleware/tenant-middleware.ts)
- [auth-middleware.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/middleware/auth-middleware.ts)

### 5.3 Matriz de permisos por método (enforcement real)

El enforcement de permisos en middleware es **por HTTP method** (no por “recurso/acción” granular):

| Método | Permiso requerido |
| ------ | ----------------- |
| GET    | read              |
| POST   | write             |
| PATCH  | write             |
| PUT    | write             |
| DELETE | delete            |

Permisos base por rol (en código):

- Dueño: `read`, `write`, `delete`
- Socio: `read`, `write`
- Admin: `read`, `write`, `delete`
- Externo: caso especial: **solo read** (aunque exista configuración conflictiva en tipos)

Accesos clave (endpoint + reglas adicionales en route):

| Acción                           | Endpoint                            | Método | Roles permitidos (efectivo)                       |
| -------------------------------- | ----------------------------------- | ------ | ------------------------------------------------- |
| Ver resumen global del dashboard | `/api/dashboard/resumen-global`     | GET    | `Dueño`, `Socio`                                  |
| Configurar umbrales de semáforo  | `/api/negocios/:id/umbrales`        | PATCH  | `Dueño`                                           |
| Crear traspasos                  | `/api/traspasos`                    | POST   | `Dueño`, `Socio`, `Admin` (con acceso al negocio) |
| Ver contador de pendientes       | `/api/movimientos/pendientes/count` | GET    | `Dueño`, `Admin`                                  |

⚠️ Deuda técnica detectada:

- En `ROLE_PERMISSIONS` (types) el rol `Externo` incluye `write`, pero `hasPermission` lo bloquea explícitamente a `read`. El enforcement efectivo es “solo lectura”.

Referencias:

- Middleware permisos: [permissions.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/middleware/permissions.ts)
- Tipos: [permissions.types.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/types/permissions.types.ts)

### 5.4 Validación de acceso en API

Patrón aplicado en endpoints:

- `authenticateRequest(request)` valida Authorization Bearer y retorna usuario (con rol y negocios).
- `validateTenantAccess(request, user)` valida `negocioId` según rol.
- Algunas rutas hacen checks extra por rol (ej. dashboard global solo Dueño/Socio).

Referencia:

- [auth-middleware.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/middleware/auth-middleware.ts)

### 5.5 Validación de acceso en UI

Patrón en UI:

- `DashboardShell` y páginas dependen de `AuthContext` (si no hay sesión, redirige a `/login`).
- Algunas acciones se ocultan o deshabilitan según `rol` (ej. botones de crear/aprobar).
- Middleware de Next usa cookie `onebusiness_session` para proteger rutas del dashboard (solo marca; no valida JWT).

Referencia:

- UI Auth: [auth-context.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/contexts/auth-context.tsx)
- Middleware Next: [middleware.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/middleware.ts)

## 6. APIs disponibles

Convenciones:

- Todas las rutas están bajo `src/app/api/**/route.ts`.
- Auth usa cookies + Authorization header.
- “Tenant”/negocio se pasa como query `?negocioId=` y/o header `x-negocio-id`.

⚠️ IMPORTANTE: Los roles listados por endpoint son el resultado de:

- Permisos por método en middleware, y
- Validaciones adicionales dentro del endpoint/servicio.

### 6.1 Auth

#### POST `/api/auth/login`

- Roles: público.
- Rate limit: `LOGIN` (5 intentos / 15 min; bloqueo 15 min).
- Body (zod): `{ email: string(email), password: string(min 6) }`.
- Respuesta 200:

```json
{
  "success": true,
  "accessToken": "jwt...",
  "refreshToken": "refresh...",
  "user": { "id": 1, "email": "a@b.com", "rol": "Socio", "negocios": [1] },
  "usuario": { "id": 1, "email": "a@b.com", "rol": "Socio", "negocios": [1] }
}
```

- Respuesta 401: `{ success:false, error }`
- Respuesta 429: `{ success:false, error, retryAfterSeconds? }` + headers `Retry-After`, `X-RateLimit-*`
- Cookies:
  - httpOnly `onebusiness_refresh_token` (maxAge 7d)
  - no-httpOnly `onebusiness_session=1` (maxAge 7d)

Referencia: [login route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/auth/login/route.ts)

#### POST `/api/auth/refresh`

- Roles: público (pero requiere refresh token).
- Rate limit: `REFRESH` (20 intentos / 1 min; bloqueo 5 min).
- Body opcional: `{ refreshToken?: string }`. Si no viene, lee cookie `onebusiness_refresh_token`.
- Respuesta 200:

```json
{
  "success": true,
  "accessToken": "jwt...",
  "refreshToken": "refresh...", 
  "user": { "id": 1, "email": "a@b.com", "rol": "Socio", "negocios": [1] },
  "usuario": { "id": 1, "email": "a@b.com", "rol": "Socio", "negocios": [1] }
}
```

Notas:

- `refreshToken` y `user/usuario` solo vienen si el service los retorna.
- Siempre setea cookie no-httpOnly `onebusiness_session=1`; setea cookie httpOnly refresh solo si rota.

Referencia: [refresh route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/auth/refresh/route.ts)

#### POST `/api/auth/logout`

- Roles: autenticado.
- Headers: `Authorization: Bearer <accessToken>`.
- Respuesta 200: `{ success:true, message:"Logout exitoso" }`
- Cookies: limpia `onebusiness_refresh_token` y `onebusiness_session`.

Referencia: [logout route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/auth/logout/route.ts)

### 6.2 Roles

#### GET `/api/roles`

- Roles: autenticado (permiso `read`).
- Tenant: valida `validateTenantAccess` (Dueño puede ir con negocioId null).
- Respuesta 200: `{ success:true, data:[{ id, nombre, descripcion }] }`

Referencia: [roles route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/roles/route.ts)

### 6.3 Negocios

#### GET `/api/negocios`

- Roles: autenticado (permiso `read`).
- Tenant:
  - Dueño: `negocioId` puede ser null (retorna lista completa).
  - Otros: `negocioId` requerido (header o query) y restringe lista.
- Respuesta 200: `{ success:true, data:[...], tenant }`

Referencia: [negocios route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/negocios/route.ts)

#### GET `/api/negocios/:id`

- Roles: autenticado (permiso `read`).
- Acceso negocio:
  - Dueño: permitido.
  - Otros: el `id` debe estar en `auth.user.negocios` (si no, 403).
- Respuesta 200:

```json
{
  "success": true,
  "data": { "id": 1, "nombre": "FOODPARK", "rfc": null, "direccion": null, "telefono": null },
  "user": { "userId": 1, "rol": "Admin", "negocios": [1] },
  "tenant": { "negocioId": 1, "isOwner": false, "negociosAccesibles": [1] }
}
```

Referencia: [negocios \[id\] route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/negocios/%5Bid%5D/route.ts)

#### GET `/api/negocios/:id/resumen?fechaDesde=&fechaHasta=`

- Roles: autenticado (permiso `read`).
- Acceso negocio:
  - Dueño: permitido.
  - Otros: `negocioId` debe estar en `auth.user.negocios`.
- Query:
  - `fechaDesde` y `fechaHasta` opcionales; acepta `YYYY-MM-DD` o string parseable por Date; default: 1er día del mes → hoy.
- Respuesta 200: `{ success:true, data:<resumen>, tenant }`
- Respuesta 404: `{ success:false, error:"Negocio no encontrado" }`

Referencia: [resumen route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/negocios/%5Bid%5D/resumen/route.ts)

#### PATCH `/api/negocios/:id/umbrales`

- Roles: `Dueño` (además de permiso `write`).
- Body: `{ umbralAlerta:number|null, umbralCritico:number|null }` con regla `umbralCritico < umbralAlerta` si ambos no son null.
- Respuesta 200: `{ success:true, data:{...negocio, umbralAlerta:number|null, umbralCritico:number|null}, tenant }`

Referencia: [umbrales route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/negocios/%5Bid%5D/umbrales/route.ts)

### 6.4 Movimientos

#### GET `/api/movimientos`

- Roles: autenticado (permiso `read`).
- Query (zod):
  - `negocioId?` (number)
  - `estado?` (`PENDIENTE|APROBADO|RECHAZADO`)
  - `tipo?` (`INGRESO|EGRESO|TRASPASO_SALIDA|TRASPASO_ENTRADA`)
  - `fechaDesde?`/`fechaHasta?` (`YYYY-MM-DD`)
  - `cuentaBancoId?` (number)
  - `page?` (int>0), `limit?` (int>0)
- Tenant:
  - Dueño puede omitir `negocioId` (retorna lista vacía con paging default).
  - No-Dueño debe operar sobre su `tenant.negocioId`.
- Special (Externo):
  - Lista solo movimientos creados por el usuario (`creadoPorId` se fuerza).
- Respuesta 200: `{ success:true, data:{ items, movimientos, total, page, limit, totalPages }, tenant }`
  - `movimientos` es alias de `items`.

Referencia: [movimientos route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/movimientos/route.ts)

#### POST `/api/movimientos`

- Roles: autenticado (permiso `write`).
- Body (zod):
  - `negocioId` (number)
  - `centroCostoId?` (number)
  - `tipo` (`INGRESO|EGRESO|TRASPASO_SALIDA`)
  - `fecha` (`YYYY-MM-DD`)
  - `concepto` (string)
  - `tercero?` (string)
  - `monto` (number>0)
  - `cuentaBancoId` (number)
  - `cuentaBancoDestinoId?` + `negocioDestinoId?` (requeridos si `tipo=TRASPASO_SALIDA`)
- Respuesta 201: `{ success:true, data:<movimientoCreado> }`

Referencia: [movimientos route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/movimientos/route.ts)

#### GET `/api/movimientos/:id`

- Roles: autenticado (permiso `read`).
- Tenant:
  - Si no es Dueño, el movimiento debe pertenecer a `tenant.negocioId` o responde 404.
- Special (Externo):
  - Solo puede acceder a movimientos creados por sí mismo (si no, 403).
- Respuesta 200: `{ success:true, data:<detalle>, tenant }`

Referencia: [movimientos \[id\] route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/movimientos/%5Bid%5D/route.ts)

#### PATCH `/api/movimientos/:id`

- Roles: autenticado (permiso `write`).
- Body (zod): `{ concepto?, tercero?, monto?, fecha?, centroCostoId? }` (al menos un campo).
- Reglas por estado:
  - `PENDIENTE`: creador o Dueño/Admin
  - `APROBADO`: solo Dueño/Admin
  - `RECHAZADO`: solo creador
- Respuesta 200: `{ success:true, data:<movimientoActualizado>, tenant }`

Referencia: [movimientos \[id\] route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/movimientos/%5Bid%5D/route.ts)

#### DELETE `/api/movimientos/:id`

- Roles: `Dueño` o `Admin` (además de permiso `delete`).
- Respuesta 200: `{ success:true, data:<resultado>, tenant }`

Referencia: [movimientos \[id\] route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/movimientos/%5Bid%5D/route.ts)

#### PATCH `/api/movimientos/:id/aprobar`

- Roles: `Dueño` o `Admin` (además de permiso `write`).
- Respuesta 200: `{ success:true, data:<movimientoAprobado>, tenant }`

Referencia: [aprobar route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/movimientos/%5Bid%5D/aprobar/route.ts)

#### PATCH `/api/movimientos/:id/rechazar`

- Roles: `Dueño` o `Admin` (además de permiso `write`).
- Body: `{ motivoRechazo: string }`
- Respuesta 200: `{ success:true, data:<movimientoRechazado>, tenant }`

Referencia: [rechazar route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/movimientos/%5Bid%5D/rechazar/route.ts)

#### PATCH `/api/movimientos/:id/reenviar`

- Roles: autenticado (permiso `write`); reglas adicionales en service.
- Body: `{ concepto?, tercero?, monto?, fecha?, centroCostoId? }` (al menos un campo).
- Respuesta 200: `{ success:true, data:<movimientoReenviado>, tenant }`

Referencia: [reenviar route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/movimientos/%5Bid%5D/reenviar/route.ts)

#### GET `/api/movimientos/pendientes`

- Roles: `Dueño` o `Admin` (además de permiso `read`).
- Respuesta 200: `{ success:true, data:[{ negocioId, count }...], tenant }`

Referencia: [pendientes route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/movimientos/pendientes/route.ts)

#### GET `/api/movimientos/pendientes/count`

- Roles: `Dueño` o `Admin` (además de permiso `read`).
- Respuesta 200: `{ success:true, count:number, tenant }`

Referencia: [pendientes count route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/movimientos/pendientes/count/route.ts)

#### GET `/api/movimientos/plantilla`

- Roles: autenticado (permiso `read`).
- Respuesta 200: descarga `.xlsx` con 3 hojas:
  - `Movimientos` (headers + ejemplos)
  - `Instrucciones`
  - `Catálogos` (negocios y cuentas desde la BD)

Referencia: [plantilla route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/movimientos/plantilla/route.ts)

#### POST `/api/movimientos/importar`

- Roles (efectivo): `Dueño`, `Socio`, `Admin` (requiere `write`; `Externo` queda bloqueado por RBAC).
- Content-Type: `multipart/form-data`
- Campo requerido: `archivo` (File)
- Límites:
  - Máximo 200 filas (no cuenta header)
  - Requiere hoja `Movimientos` y headers exactos: `fecha,tipo,concepto,monto,negocio,cuenta_banco,tercero`
- Lookup:
  - `negocio` por nombre exacto (`negocios.nombre`)
  - `cuenta_banco` por nombre exacto (`cuentas_banco.nombre`) y se valida que pertenezca al negocio
- Transaccionalidad:
  - Inserta todas las filas dentro de `db.transaction(...)`
  - Si falla cualquier inserción, revierte toda la importación (no quedan movimientos parciales)
- Audit:
  - Emite `AuditEvento.MOVIMIENTO_IMPORTADO` al finalizar con éxito

Referencia: [importar route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/movimientos/importar/route.ts)

### 6.5 Traspasos

#### POST `/api/traspasos`

- Método y ruta: `POST /api/traspasos`
- Roles permitidos (efectivo): `Dueño`, `Socio`, `Admin` (requiere `write`; `Externo` no puede).
- Body esperado (zod):
  - `negocioId: number` (int, >0)
  - `cuentaOrigenId: number` (int, >0)
  - `cuentaDestinoId: number` (int, >0)
  - `monto: number` (>0)
  - `concepto: string` (min 1)
  - `fecha: string` (min 1; se normaliza a `YYYY-MM-DD`)

Ejemplo body:

```json
{
  "negocioId": 1,
  "cuentaOrigenId": 10,
  "cuentaDestinoId": 11,
  "monto": 2500,
  "concepto": "Traspaso caja → banco",
  "fecha": "2026-03-14"
}
```

Validaciones y reglas:

- API:
  - `cuentaOrigenId !== cuentaDestinoId` (si no, 400).
  - Si el rol no es `Dueño`, el `negocioId` debe estar en `auth.user.negocios` (si no, 403).
  - `fecha` se normaliza: acepta `YYYY-MM-DD` o string parseable por `Date`; si falla, error 400.
- Service (`crearTraspasoBancario`):
  - Verifica que **ambas cuentas** existan y pertenezcan al `negocioId` (si no, error).
  - Crea 2 movimientos **en el mismo negocio**:
    - `movimientoOrigen`: tipo `EGRESO` en la cuenta origen
    - `movimientoDestino`: tipo `INGRESO` en la cuenta destino
  - Vincula ambos vía `traspasoRefId` (bidireccional).
  - Estado inicial de ambos: `PENDIENTE`.

Respuesta exitosa (201):

```json
{
  "success": true,
  "data": {
    "movimientoOrigen": { "id": 123, "tipo": "EGRESO", "estado": "PENDIENTE" },
    "movimientoDestino": { "id": 124, "tipo": "INGRESO", "estado": "PENDIENTE" }
  },
  "tenant": { "negocioId": 1, "isOwner": false, "negociosAccesibles": [1] },
  "requestId": "..."
}
```

Comportamiento transaccional:

- La creación y vinculación de los 2 movimientos ocurre dentro de `db.transaction(...)`.
- Si falla cualquier paso (cuentas inválidas, insert, update de vínculo), **se revierte toda la transacción** y no queda ningún movimiento parcial persistido.

Referencia: [traspasos route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/traspasos/route.ts)
Service: [crearTraspasoBancario](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/services/movimiento.service.ts#L462-L558)

### 6.6 Categorías

#### GET `/api/categorias?tipo=ingreso|egreso`

- Roles: autenticado (permiso `read`).
- Tenant: requiere `tenant.negocioId` (si falta, 400 `SIN_NEGOCIO`).
- Query: `tipo?` (`ingreso|egreso`) en minúsculas.
- Respuesta 200: `{ success:true, data:[...] }`

Referencia: [categorias route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/categorias/route.ts)

#### POST `/api/categorias`

- Roles: autenticado (permiso `write`) y rol != `Externo`.
- Body: `{ nombre, tipo, esGlobal? }` (`tipo` en minúsculas).
- Respuesta 201: `{ success:true, data:<categoria> }`

Referencia: [categorias route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/categorias/route.ts)

#### GET `/api/categorias/:id`

- Roles: autenticado (permiso `read`).
- Tenant: requiere `tenant.negocioId`.
- Respuesta 200: `{ success:true, data:<categoria> }`

Referencia: [categorias \[id\] route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/categorias/%5Bid%5D/route.ts)

#### PUT `/api/categorias/:id`

- Roles: autenticado (permiso `write`) y rol != `Externo`.
- Tenant: requiere `tenant.negocioId`.
- Body: `{ nombre?, activa? }` (al menos un campo).
- Respuesta 200: `{ success:true, data:<categoria> }`

Referencia: [categorias \[id\] route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/categorias/%5Bid%5D/route.ts)

#### DELETE `/api/categorias/:id`

- Roles: autenticado (permiso `delete`) y rol != `Externo`.
- Tenant: requiere `tenant.negocioId`.
- Respuesta 200: `{ success:true, data:<categoriaDesactivada> }`

Referencia: [categorias \[id\] route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/categorias/%5Bid%5D/route.ts)

### 6.7 Cuentas banco

#### GET `/api/cuentas-banco`

- Roles: autenticado (permiso `read`) y rol != `Externo`.
- Tenant: requiere `tenant.negocioId`.
- Respuesta 200: `{ success:true, data:[...], tenant }`

Referencia: [cuentas-banco route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/cuentas-banco/route.ts)

#### POST `/api/cuentas-banco`

- Roles: `Dueño` o `Admin` (además de permiso `write`).
- Body: `{ nombre, tipo, bancoInstitucion?, titular?, negocioId, saldoInicial? }`
- Respuesta 201: `{ success:true, data:<cuenta> }`

Referencia: [cuentas-banco route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/cuentas-banco/route.ts)

#### GET `/api/cuentas-banco/:id`

- Roles: autenticado (permiso `read`) y rol != `Externo`.
- Respuesta 200: `{ success:true, data:<cuenta>, tenant }`

Referencia: [cuentas-banco \[id\] route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/cuentas-banco/%5Bid%5D/route.ts)

#### PATCH `/api/cuentas-banco/:id`

- Roles: `Dueño` o `Admin` (además de permiso `write`).
- Body: `{ nombre?, tipo?, bancoInstitucion?, titular? }` (al menos un campo).
- Respuesta 200: `{ success:true, data:<cuentaActualizada> }`

Referencia: [cuentas-banco \[id\] route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/cuentas-banco/%5Bid%5D/route.ts)

#### DELETE `/api/cuentas-banco/:id`

- Roles: `Dueño` o `Admin` (además de permiso `delete`).
- Respuesta 200: `{ success:true, data:<resultado> }`

Referencia: [cuentas-banco \[id\] route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/cuentas-banco/%5Bid%5D/route.ts)

#### PATCH `/api/cuentas-banco/:id/saldo`

- Roles: `Dueño` o `Admin` (además de permiso `write`).
- Body: `{ saldoReal:number }` (>=0).
- Respuesta 200: `{ success:true, data:<cuentaActualizadaSaldo> }`

Referencia: [saldo route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/cuentas-banco/%5Bid%5D/saldo/route.ts)

### 6.8 Usuarios

#### GET `/api/usuarios?rol=&activo=`

- Roles: autenticado (permiso `read`).
- Query:
  - `rol?` (`Dueño|Socio|Admin|Externo`)
  - `activo?` (`true|false`)
- Respuesta 200: `{ success:true, data:{ usuarios:[...], total:number } }`

Referencia: [usuarios route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/usuarios/route.ts)

#### POST `/api/usuarios`

- Roles: `Dueño` o `Admin` (además de permiso `write`).
- Body: `{ nombreCompleto, email, password, rolId, negocios:number[] }`
- Restricción extra:
  - Admin solo puede asignar negocios dentro de `auth.user.negocios`.
- Respuesta 201: `{ success:true, data:<usuarioCreado> }`

Referencia: [usuarios route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/usuarios/route.ts)

#### GET `/api/usuarios/:id`

- Roles: autenticado (permiso `read`).
- Tenant: no-Dueño solo puede acceder si el usuario objetivo pertenece al negocio del tenant.
- Respuesta 200: `{ success:true, data:<usuario> }`

Referencia: [usuarios \[id\] route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/usuarios/%5Bid%5D/route.ts)

#### PUT `/api/usuarios/:id`

- Roles: `Dueño` o `Admin` (además de permiso `write`).
- Body: `{ nombreCompleto?, email?, password?, rolId?, activo? }` (al menos un campo).
- Respuesta 200: `{ success:true, data:<usuarioActualizado> }`

Referencia: [usuarios \[id\] route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/usuarios/%5Bid%5D/route.ts)

#### DELETE `/api/usuarios/:id`

- Roles: `Dueño` o `Admin` (además de permiso `delete`).
- Respuesta 200: `{ success:true, data:<resultado> }`

Referencia: [usuarios \[id\] route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/usuarios/%5Bid%5D/route.ts)

#### PUT `/api/usuarios/:id/negocios`

- Roles: `Dueño` o `Admin` (además de permiso `write`).
- Body: `{ negocios:number[] }` (min 1).
- Restricción extra:
  - Admin solo puede asignar negocios dentro de `auth.user.negocios`.
- Respuesta 200: `{ success:true, data:<usuarioActualizado> }`

Referencia: [usuarios negocios route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/usuarios/%5Bid%5D/negocios/route.ts)

### 6.9 Dashboard

#### GET `/api/dashboard/resumen-global?fechaDesde=&fechaHasta=`

- Roles: `Dueño` o `Socio` (además de permiso `read`).
- Query: `fechaDesde?`, `fechaHasta?` con normalización similar a resumen de negocio; defaults 1er día del mes → hoy.
- Respuesta 200:

```json
{
  "success": true,
  "data": {
    "resumenPorNegocio": [],
    "totalesGlobales": { "totalIngresos": 0, "totalEgresos": 0, "balance": 0 },
    "negociosCriticos": [],
    "negociosAlerta": []
  },
  "tenant": { "negocioId": null, "isOwner": false, "negociosAccesibles": [] }
}
```

Referencia: [resumen-global route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/dashboard/resumen-global/route.ts)

### 6.10 Cotizaciones

#### GET `/api/cotizaciones`

- Roles: autenticado (permiso `read`).
- Query (zod):
  - `negocioId?` (number)
  - `estado?` (`BORRADOR|ENVIADA|APROBADA|FACTURADA|CANCELADA`)
  - `fechaDesde?` / `fechaHasta?` (`YYYY-MM-DD`)
  - `busqueda?` (string; busca por `folio` o `clienteNombre`)
  - `page?` (int>0), `limit?` (int>0)
- Tenant:
  - Dueño: puede listar sin `negocioId` y ver múltiples negocios.
  - No-Dueño: restringe a negocios asignados (`usuario_negocio`).
- Respuesta 200: `{ success:true, data:{ items, total, page, totalPages } }`
  - `items[].primerConcepto`: primer ítem (`orden=1`) truncado a 80 chars.

Referencia: [cotizaciones route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/cotizaciones/route.ts)

#### POST `/api/cotizaciones`

- Roles (efectivo):
  - `Dueño`, `Socio`, `Admin`: requiere `write` (RBAC).
  - `Externo`: permitido por excepción en el endpoint (decisión D-16), pero debe tener acceso al negocio (`negocioId` ∈ `auth.user.negocios`).
- Body: `{ negocioId, clienteNombre, clienteRfc?, clienteDireccion?, fecha, notas?, categoriaId?, items[] }`
- Respuesta 201: `{ success:true, data:<cotizacionCreada> }`

Referencia: [cotizaciones route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/cotizaciones/route.ts)

#### GET `/api/cotizaciones/:id`

- Roles: autenticado (permiso `read`).
- Respuesta 200: `{ success:true, data:<cotizacionConItemsYNegocioEmisor> }`

Referencia: [cotizaciones \[id\] route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/cotizaciones/%5Bid%5D/route.ts)

#### PATCH `/api/cotizaciones/:id`

- Roles: autenticado (permiso `write`) y rol != `Externo`.
- Reglas:
  - Solo permite actualizar en estados `BORRADOR` o `ENVIADA`.
- Respuesta 200: `{ success:true, data:<cotizacionActualizada> }`

Referencia: [cotizaciones \[id\] route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/cotizaciones/%5Bid%5D/route.ts)

#### DELETE `/api/cotizaciones/:id`

- Roles: `Dueño` o `Admin` (además de permiso `delete`).
- Reglas:
  - Solo permite eliminar en estado `BORRADOR`.
- Respuesta 200: `{ success:true }`

Referencia: [cotizaciones \[id\] route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/cotizaciones/%5Bid%5D/route.ts)

#### PATCH `/api/cotizaciones/:id/estado`

- Roles: autenticado (permiso `write`).
- Body: `{ estado, numeroOc?, numeroFactura?, cuentaBancoId?, categoriaId? }`
- Respuesta 200: `{ success:true, data:<cotizacionActualizada> }`

Referencia: [estado route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/cotizaciones/%5Bid%5D/estado/route.ts)

#### GET `/api/cotizaciones/:id/pdf`

- Roles: autenticado (permiso `read`).
- Respuesta 200: descarga `application/pdf` (membretado).

Referencia: [pdf route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/cotizaciones/%5Bid%5D/pdf/route.ts)

#### 6.10.1 Transiciones de estado (enforcement real)

| Desde      | → | Hacia      | Quién puede (efectivo)                    | Datos requeridos |
| ---------- | - | ---------- | ----------------------------------------- | ---------------- |
| BORRADOR   | → | ENVIADA    | Roles con `write` (no `Externo`)          | —                |
| ENVIADA    | → | BORRADOR   | Creador o `Dueño/Admin`                   | —                |
| ENVIADA    | → | APROBADA   | `Dueño`, `Admin`                          | `numeroOc`       |
| APROBADA   | → | FACTURADA  | `Dueño`, `Admin`                          | `numeroFactura` + `cuentaBancoId` |
| cualquiera | → | CANCELADA  | `Dueño`, `Admin` (bloqueado si `movimientoId` existe) | — |

Al pasar a `FACTURADA`:

- Se genera automáticamente un movimiento `INGRESO` con estado `PENDIENTE` y se vincula por `movimientoId`.

Referencia: [cotizacion.service.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/services/cotizacion.service.ts)

### 6.11 Reportes / Empleados / Nómina (stubs)

#### GET `/api/reportes`

#### GET `/api/empleados`

#### GET `/api/nomina`

- Roles: autenticado (permiso `read`).
- Respuesta 200: `{ success:true, data:[], user, tenant }`

Referencias:

- [reportes route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/reportes/route.ts)
- [empleados route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/empleados/route.ts)
- [nomina route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/nomina/route.ts)

## 7. Componentes de UI reutilizables

### 7.1 Layout

- `DashboardShell`: layout principal del dashboard; contiene `Sidebar`, `Header` y sheets para crear movimiento/traspaso; coordina eventos de UI.
  - [dashboard-shell.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/layout/dashboard-shell.tsx)
- `Sidebar`: navegación y badge de pendientes; escucha eventos para refrescar count.
  - [sidebar.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/layout/sidebar.tsx)
- `Header`: selector de negocio y atajos; dispara `onebusiness:negocio-changed`.
  - [header.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/layout/header.tsx)

### 7.2 Componentes “comunes”

En el repo, la carpeta equivalente es `src/components/shared/` (no existe `src/components/common/`).

- `EmptyState`: estado vacío genérico.
  - [empty-state.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/shared/empty-state.tsx)
- `ErrorState`: estado de error genérico.
  - [error-state.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/shared/error-state.tsx)
- `PageLoader`: loader de página.
  - [page-loader.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/shared/page-loader.tsx)
- `ConfirmDialog`: archivo presente pero actualmente vacío (0 líneas).
  - [confirm-dialog.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/shared/confirm-dialog.tsx)
- `DatePicker`: archivo presente pero actualmente vacío (0 líneas).
  - [date-picker.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/shared/date-picker.tsx)

### 7.3 Componentes de dominio (movimientos)

- `MovimientoForm`: formulario para crear/editar movimientos.
- `TraspasoForm`: formulario para crear traspasos (movimiento doble vinculado).
- `MovimientosTable`: tabla con acciones y listeners de refresh.
- `AprobacionTable`: tabla de pendientes para aprobación.
- `RechazoDialog`: diálogo de rechazo con motivo.
- `MovimientoDetalleSheet`: sheet con detalle.
- `EstadoBadge`: badge por estado.
- `MovimientosFilters`: filtros.
- `MovimientoCard` y `MovimientoList`: archivos presentes pero actualmente vacíos (0 líneas).

Referencias:

- [src/components/movimientos](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/movimientos)

### 7.4 Componentes de dominio (cotizaciones)

Componentes:

- [cotizacion-estado-badge.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/cotizaciones/cotizacion-estado-badge.tsx): badge con 5 colores por estado
- [cotizacion-form.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/cotizaciones/cotizacion-form.tsx): formulario crear/editar con `useFieldArray`
- [cotizacion-pdf.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/cotizaciones/cotizacion-pdf.tsx): PDF server-only (`@react-pdf/renderer`)
- [enviar-cotizacion-dialog.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/cotizaciones/enviar-cotizacion-dialog.tsx): dialog `BORRADOR → ENVIADA`
- [aprobar-cotizacion-dialog.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/cotizaciones/aprobar-cotizacion-dialog.tsx): dialog `ENVIADA → APROBADA` (pide `numeroOc`)
- [facturar-cotizacion-dialog.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/cotizaciones/facturar-cotizacion-dialog.tsx): dialog `APROBADA → FACTURADA` (pide factura + cuenta)
- [cancelar-cotizacion-dialog.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/cotizaciones/cancelar-cotizacion-dialog.tsx): dialog `→ CANCELADA`

Páginas:

- [cotizaciones/page.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/%28dashboard%29/cotizaciones/page.tsx): lista con filtros, paginación, acciones inline
- [cotizaciones/nueva/page.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/%28dashboard%29/cotizaciones/nueva/page.tsx): formulario de creación
- [cotizaciones/[id]/page.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/%28dashboard%29/cotizaciones/%5Bid%5D/page.tsx): detalle solo lectura + botón PDF
- [cotizaciones/[id]/editar/page.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/%28dashboard%29/cotizaciones/%5Bid%5D/editar/page.tsx): formulario de edición
- [importar-movimientos/page.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/%28dashboard%29/importar-movimientos/page.tsx): flujo 3 fases (subir → previsualizar → resultado)

### 7.5 UI base (shadcn/ui)

Solo listado de nombres (archivos en `src/components/ui/`):

- alert-dialog
- badge
- button
- card
- checkbox
- dialog
- form
- input
- select
- sheet
- skeleton
- sonner
- table
- textarea
- tooltip

Referencia:

- [src/components/ui](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/ui)

### 7.6 Convenciones — Cómo agregar un evento CustomEvent

1. Definir un nombre con prefijo `onebusiness:` en una constante (para que sea buscable por texto).
2. Disparar el evento:

```ts
window.dispatchEvent(new CustomEvent('onebusiness:mi-evento', { detail: { /* opcional */ } }));
```

1. Escuchar el evento en un `useEffect` con cleanup:

```ts
useEffect(() => {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent).detail;
  };
  window.addEventListener('onebusiness:mi-evento', handler as EventListener);
  return () => window.removeEventListener('onebusiness:mi-evento', handler as EventListener);
}, []);
```

1. Documentar el evento en la sección [Sistema de eventos](#9-sistema-de-eventos-del-cliente) (emisor, receptor, `detail`, propósito).

## 8. Flujos de usuario

### 8.1 Login y recuperación de sesión al recargar

1. Login (ver sección 4.1).
2. Al recargar:
   - `AuthContext` intenta recuperar sesión llamando a `/api/auth/refresh` (si hay cookie refresh).
   - Si refresh es exitoso, actualiza `accessToken` en memoria y deja al usuario en dashboard.
   - Si falla, limpia sesión y redirige a `/login`.

Referencia:

- [auth-context.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/contexts/auth-context.tsx)

### 8.2 Crear un movimiento (desde el Sheet)

1. Usuario abre el sheet de “Nuevo movimiento” (evento `onebusiness:new-movimiento-open`).
2. Completa `MovimientoForm`.
3. UI hace `POST /api/movimientos`.
4. Al éxito:
   - UI dispara `onebusiness:movimientos-refresh` y `onebusiness:pending-count-refresh`.
   - UI cierra sheet y muestra toast.

Referencias:

- Orquestación: [dashboard-shell.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/layout/dashboard-shell.tsx)
- Form: [movimiento-form.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/movimientos/movimiento-form.tsx)

### 8.3 Aprobar un movimiento (inline)

1. Usuario ve la tabla de movimientos (o aprobación).
2. Clic “Aprobar” llama `POST /api/movimientos/:id/aprobar`.
3. Al éxito:
   - Estado del movimiento pasa a `APROBADO` y se registra audit log.
   - Se actualizan tabla y badge de pendientes vía eventos.

Referencias:

- [movimientos-table.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/movimientos/movimientos-table.tsx)
- [aprobar route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/movimientos/%5Bid%5D/aprobar/route.ts)

### 8.4 Crear un traspaso

1. Usuario abre el sheet “Nuevo traspaso” (evento `onebusiness:new-traspaso-open`).
2. Completa `TraspasoForm`.
3. UI hace `POST /api/traspasos`.
4. Servicio crea el par de movimientos vinculados por `traspaso_id`.

Referencia:

- [traspaso-form.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/movimientos/traspaso-form.tsx)
- [traspasos route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/traspasos/route.ts)

### 8.5 Aprobar un traspaso (y qué pasa con el par)

Al aprobar un movimiento que pertenece a un traspaso:

- El servicio localiza el movimiento “espejo” vía `traspaso_id`.
- Aprueba ambos para mantener consistencia.

Referencia:

- [movimiento.service.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/services/movimiento.service.ts)

### 8.6 Configurar umbrales del semáforo

1. En el dashboard, el usuario ajusta umbrales (UI).
2. UI llama `PATCH /api/negocios/:id/umbrales`.
3. Se persisten `umbral_alerta` y `umbral_critico` en `negocios`.

Referencias:

- UI: [dashboard page.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/\(dashboard\)/dashboard/page.tsx)
- API: [umbrales route.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/api/negocios/%5Bid%5D/umbrales/route.ts)

## 9. Sistema de eventos del cliente

El proyecto usa `window.dispatchEvent(new CustomEvent(...))` para comunicación entre layout y páginas/tablas.

Lista completa (ground truth) de CustomEvents `onebusiness:*` encontrados en `src/`.

| Evento                              | Emite (dispatchEvent)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Escucha (addEventListener)                                                                                                                                                                                                                                     | `event.detail`                                 | Propósito                                                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `onebusiness:negocio-changed`       | [header.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/layout/header.tsx) (2 dispatch)[dashboard-shell.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/layout/dashboard-shell.tsx)[dashboard page.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/\(dashboard\)/dashboard/page.tsx)                                                                                                                                                                        | [movimientos page.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/\(dashboard\)/movimientos/page.tsx)[dashboard page.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/\(dashboard\)/dashboard/page.tsx) (hook `useSelectedNegocioId`) | `{ negocioId: number }`                        | Notificar cambio de negocio seleccionado para que otras vistas cambien su `negocioId`.                    |
| `onebusiness:negocio-select`        | No se encontró `dispatchEvent` en `src/` (solo listener).                                                                                                                                                                                                                                                                                                                                                                                                                                                        | [dashboard-shell.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/layout/dashboard-shell.tsx)                                                                                                                                               | `{ negocioId?: unknown }` (se parsea a number) | Punto de extensión para “seleccionar negocio” desde otros componentes sin acoplarlos al Shell.            |
| `onebusiness:new-movimiento-open`   | [movimientos-table.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/movimientos/movimientos-table.tsx)                                                                                                                                                                                                                                                                                                                                                                                        | [dashboard-shell.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/layout/dashboard-shell.tsx)                                                                                                                                               | No usa `detail`.                               | Abrir el Sheet “Nuevo movimiento” desde componentes anidados (sin prop drilling).                         |
| `onebusiness:new-traspaso-open`     | No se encontró `dispatchEvent` en `src/` (solo listener).                                                                                                                                                                                                                                                                                                                                                                                                                                                        | [dashboard-shell.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/layout/dashboard-shell.tsx)                                                                                                                                               | No usa `detail`.                               | Punto de extensión para abrir el Sheet “Nuevo traspaso” desde otros componentes (actualmente sin emisor). |
| `onebusiness:movimientos-refresh`   | [dashboard-shell.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/layout/dashboard-shell.tsx) (tras crear movimiento)[traspaso-form.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/movimientos/traspaso-form.tsx)[use-movimientos.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/hooks/use-movimientos.ts)[facturar-cotizacion-dialog.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/cotizaciones/facturar-cotizacion-dialog.tsx)[importar-movimientos page.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/\(dashboard\)/importar-movimientos/page.tsx)                                                                                                                                                      | [movimientos-table.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/movimientos/movimientos-table.tsx)[movimientos page.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/\(dashboard\)/movimientos/page.tsx)                    | No usa `detail`.                               | Forzar refetch de listas/tablas cuando un movimiento/traspaso cambia el estado de la UI.                  |
| `onebusiness:pending-count-refresh` | [dashboard-shell.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/layout/dashboard-shell.tsx) (tras crear movimiento)[movimientos-table.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/movimientos/movimientos-table.tsx) (aprobar/rechazar/eliminar)[traspaso-form.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/movimientos/traspaso-form.tsx)[use-movimientos.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/hooks/use-movimientos.ts)[facturar-cotizacion-dialog.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/cotizaciones/facturar-cotizacion-dialog.tsx)[importar-movimientos page.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/\(dashboard\)/importar-movimientos/page.tsx) | [sidebar.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/layout/sidebar.tsx)[movimientos page.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/app/\(dashboard\)/movimientos/page.tsx)                                             | No usa `detail`.                               | Refrescar el badge/contador de pendientes (“Por aprobar”) en sidebar y dashboard operativo.               |

Referencias:

- [dashboard-shell.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/layout/dashboard-shell.tsx)
- [header.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/layout/header.tsx)
- [movimientos-table.tsx](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/components/movimientos/movimientos-table.tsx)
- [use-movimientos.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/hooks/use-movimientos.ts)

## 10. Tests

Framework:

- Vitest (`npm test` ejecuta `vitest run`).

Estructura:

- `tests/integration/*`
- `tests/unit/*`

Suites y cantidad de tests (conteo real por runner `vitest run`):

✅ Última ejecución verificada: `npm test` → **215 passed / 0 failed** (24 archivos)

### Integration (13 archivos, 117 tests)

| Archivo                                   | Tests |
| ----------------------------------------- | ----: |
| integration/auth.test.ts                  |    11 |
| integration/categorias.test.ts            |    12 |
| integration/cotizaciones-api.test.ts      |    17 |
| integration/dashboard-metrics.test.ts     |    11 |
| integration/importar-movimientos.test.ts  |     7 |
| integration/login-flow\.test.ts           |     1 |
| integration/multi-tenancy.test.ts         |     5 |
| integration/negocios-api.test.ts          |     4 |
| integration/rbac.test.ts                  |    27 |
| integration/traspasos-api.test.ts         |     4 |
| integration/usuarios-api.test.ts          |     6 |
| integration/usuarios-id-api.test.ts       |     7 |
| integration/usuarios-negocios-api.test.ts |     5 |

### Unit (11 archivos, 98 tests)

| Archivo                        | Tests |
| ------------------------------ | ----: |
| unit/audit-logger.test.ts      |     7 |
| unit/auth-middleware.test.ts   |    10 |
| unit/auth.service.test.ts      |    16 |
| unit/categoria.service.test.ts |    20 |
| unit/cotizacion.service.test.ts |     5 |
| unit/jwt.test.ts               |     6 |
| unit/negocio.service.test.ts   |     7 |
| unit/permissions.test.ts       |     9 |
| unit/rate-limiter.test.ts      |     9 |
| unit/tenant-middleware.test.ts |     8 |
| unit/usuario.service.test.ts   |     1 |

Cómo ejecutar:

```bash
npm test
```

Cobertura:

```bash
npm run test:coverage
```

Referencias:

- Config: [vitest.config.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/vitest.config.ts)
- Tests: [tests](file:///c:/Users/nadir/SergioMadrid/onebusiness/tests)

## 11. Scripts

Scripts (package.json):

| Script        | Comando                    | Propósito                 | Cuándo usar                |
| ------------- | -------------------------- | ------------------------- | -------------------------- |
| dev           | next dev                   | Dev server                | Desarrollo local           |
| build         | next build                 | Build producción          | CI / pre-deploy            |
| start         | next start                 | Servir build              | Validación local prod-like |
| lint          | next lint                  | Lint                      | Antes de PR                |
| db:generate   | drizzle-kit generate       | Generar artifacts Drizzle | Cambios de schema          |
| db:migrate    | npx tsx scripts/migrate.ts | Aplicar migraciones       | Inicializar/actualizar DB  |
| db:studio     | drizzle-kit studio         | UI DB                     | Inspección local           |
| db:create     | tsx src/lib/create-db.ts   | Crear DB (utilidad)       | Setup local                |
| db:seed       | tsx src/lib/seed.ts        | Seed                      | Datos demo                 |
| test          | vitest run                 | Tests                     | CI / antes de merge        |
| test:coverage | vitest run --coverage      | Cobertura                 | Medir cobertura            |

Referencia:

- [package.json](file:///c:/Users/nadir/SergioMadrid/onebusiness/package.json)

## 12. Variables de entorno

Fuente principal de ejemplo:

- [.env.example](file:///c:/Users/nadir/SergioMadrid/onebusiness/.env.example)

| Variable                    | Requerida | Descripción                                                                                                                                        | Ejemplo (no real)                             |
| --------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| DATABASE\_URL               | sí        | Connection string PostgreSQL                                                                                                                       | postgresql://user:pass\@host:5432/onebusiness |
| JWT\_SECRET                 | sí        | Secreto para firmar JWT (mín 32 chars recomendado)                                                                                                 | "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"            |
| JWT\_EXPIRES\_IN            | sí        | TTL del access token                                                                                                                               | "15m"                                         |
| REFRESH\_TOKEN\_EXPIRES\_IN | sí        | TTL del refresh token                                                                                                                              | "7d"                                          |
| NEXT\_PUBLIC\_APP\_URL      | no        | Base URL usada en emails y links                                                                                                                   | "<http://localhost:3000>"                     |
| NODE\_ENV                   | no        | Valores: `development \| production \| test`. En `production`, cookies de auth usan `secure=true` (HTTPS), incluyendo `onebusiness_refresh_token`. | "development"                                 |
| RESEND\_API\_KEY            | cond.     | API key de Resend (obligatoria en production)                                                                                                      | "re\_xxx"                                     |
| RESEND\_FROM\_EMAIL         | no        | Remitente de emails                                                                                                                                | "OneBusiness \<notificaciones\@...>"          |

Referencias:

- JWT: [jwt.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/lib/jwt.ts)
- DB migrate: [scripts/migrate.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/scripts/migrate.ts)
- Email: [email.service.ts](file:///c:/Users/nadir/SergioMadrid/onebusiness/src/services/email.service.ts)
