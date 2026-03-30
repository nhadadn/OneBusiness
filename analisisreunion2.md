# ANÁLISIS DE REUNIÓN CON CLIENTE #2

## OneBusiness - Sistema de Gestión Corporativa Multi-Negocio

**Fecha:** Marzo 2025 | **Versión:** 1.0

***

## RESUMEN EJECUTIVO

Se realizó una reunión con el cliente para revisar el estado actual del sistema y obtener feedback. Se identificaron 10 puntos de mejora y nuevas necesidades. Este documento analiza cada punto, evalúa el impacto en el alcance, nivel de complejidad y prioridad para las siguientes fases del proyecto.

***

## ANÁLISIS DETALLADO POR PUNTO

***

### PUNTO 1: División y Sub-división de Negocios

**Solicitud del cliente:**

> Los negocios, también llamados rangos, al cliente le gustaría poder tener visibilidad de divisiones del mismo rango, esto para hacer el control aun mas granular. Por ejemplo, FOODPARK es el negocio 1. FOODPARK necesita poder controlar sus dos divisiones "individualmente" para poder crear dashboards, métricas, y tener granularmente segmentado el negocio en sus divisiones y sub-divisiones:
>
> - División: OPERATIVO
>   - Sub-divisiones: RENTAS, LA BARRA, PUERTO LAGUNERO, TAQUERIA

**Análisis del estado actual:**

- El sistema actualmente tiene la entidad `CentroCosto` que permite subdividir un negocio.
- `CentroCosto` tiene: `id`, `nombre`, `codigo`, `negocioId`, `activo`.
- `Movimiento` ya tiene `centroCostoId` como campo opcional.
- La estructura actual es: Negocio → CentroCosto (1 nivel de anidación).

**Evaluación del requerimiento:**

- El cliente solicita **2 niveles de anidación**: División → Sub-división.
- El modelo actual de `CentroCosto` solo soporta 1 nivel.
- El ejemplo muestra: FOODPARK → OPERATIVO → RENTAS/LA BARRA/PUERTO LAGUNERO/TAQUERIA.

**Impacto en el alcance:** 🟡 **CAMBIO DE ALCANCE MEDIO**

**Opciones de solución:**

Opción

Descripción

Pros

Contras

A: CentroCosto jerárquico

Agregar `parentCentroCostoId` a `CentroCosto` para permitir anidación

Flexible, soporta N niveles

Complejidad en queries, UI más compleja

B: Divisiones como Negocios separados

Tratar cada división como negocio independiente

Simple, usa estructura existente

No refleja la realidad del cliente, confusión

C: Nueva entidad División

Crear entidad intermedia: Negocio → División → CentroCosto

Estructura clara, 2 niveles fijos

Más entidades, migración de datos

D: Rebranding CentroCosto

Renombrar CentroCosto a "UnidadOperativa" con padre opcional

Mínimo cambio de schema

Puede ser confuso conceptualmente

**Recomendación:** Opción A - CentroCosto jerárquico con `parentCentroCostoId`.

**Schema propuesto:**

```
export const centrosCosto = pgTable('centros_costo', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  codigo: varchar('codigo', { length: 50 }),
  negocioId: integer('negocio_id').notNull().references(() => negocios.id),
  padreId: integer('padre_id').references(() => centrosCosto.id), // NUEVO
  tipo: varchar('tipo', { length: 20 }).default('SUBDIVISION'), // NUEVO: DIVISION | SUBDIVISION
  activo: boolean('activo').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

```

**Nivel de complejidad:** 🔴 **ALTA**

- Modificación de schema existente
- Migración de datos existentes
- Queries recursivas para árbol de centros de costo
- UI para mostrar jerarquía (tree view)
- Dashboard con drill-down por niveles
- Filtros en movimientos por nivel

**Prioridad recomendada:** 🟡 **MEDIA** (Sprint 2.1 o posterior)

- No es bloqueante para el MVP actual
- El modelo actual de CentroCosto funciona para 1 nivel
- Se puede implementar como mejora en Fase 2

**Sprint sugerido:** 2.1 (post-MVP)

**Tiempo estimado:** 3-4 días

***

### PUNTO 2: Cuentas Bancarias Globales/Compartidas

**Solicitud del cliente:**

> Compartir cuenta en los negocios, las cuentas son globales es decir una cuenta puede ser usada en n número de negocios/cuentas de negocio, todas las cuentas aplican para todos los negocios.

**Análisis del estado actual:**

- El schema actual tiene `cuentasBanco.negocioId` como `NOT NULL`.
- Esto significa que cada cuenta pertenece a UN SOLO negocio.
- La arquitectura original contemplaba cuentas compartidas (N:M), pero se implementó como 1:N.

**Evaluación del requerimiento:**

- El cliente necesita que una MISMA cuenta bancaria pueda usarse en múltiples negocios.
- Ejemplo: Una cuenta bancaria del holding que se usa en FOODPARK y TRAFANSFAZA.
- Los movimientos de esa cuenta deben poder asignarse a diferentes negocios.

**Impacto en el alcance:** 🔴 **CAMBIO DE ALCANCE ALTO**

**Solución propuesta:**

1. **Modificar schema de cuentas\_banco:**

```
export const cuentasBanco = pgTable('cuentas_banco', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  tipo: tipoCuentaEnum('tipo').notNull(),
  bancoInstitucion: varchar('banco_institucion', { length: 50 }),
  titular: varchar('titular', { length: 100 }),
  // REMOVER: negocioId como NOT NULL
  negocioId: integer('negocio_id').references(() => negocios.id), // Nullable para cuentas globales
  esGlobal: boolean('es_global').default(false).notNull(), // NUEVO
  saldoInicial: numeric('saldo_inicial', { precision: 15, scale: 2 }).notNull().default('0'),
  saldoReal: numeric('saldo_real', { precision: 15, scale: 2 }),
  fechaSaldoReal: timestamp('fecha_saldo_real'),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

```

1. **Crear tabla intermedia para cuentas compartidas:**

```
export const cuentaNegocio = pgTable('cuenta_negocio', {
  id: serial('id').primaryKey(),
  cuentaId: integer('cuenta_id').notNull().references(() => cuentasBanco.id, { onDelete: 'cascade' }),
  negocioId: integer('negocio_id').notNull().references(() => negocios.id, { onDelete: 'cascade' }),
  fechaAsignacion: timestamp('fecha_asignacion').defaultNow(),
}, (table) => ({
  cuentaIdx: index('idx_cuenta_negocio_cuenta').on(table.cuentaId),
  negocioIdx: index('idx_cuenta_negocio_negocio').on(table.negocioId),
  uniqueCuentaNegocio: uniqueIndex('uq_cuenta_negocio').on(table.cuentaId, table.negocioId),
}));

```

**Lógica de negocio:**

- Si `esGlobal = true`: La cuenta está disponible para TODOS los negocios.
- Si `esGlobal = false` y tiene registros en `cuentaNegocio`: Solo para esos negocios.
- Si `esGlobal = false` y `negocioId` tiene valor: Solo para ese negocio (comportamiento actual).

**Nivel de complejidad:** 🔴 **ALTA**

- Cambio de schema con impacto en múltiples módulos
- Migración de datos existentes
- Modificación de todas las queries que filtran por cuenta
- Actualización de UI de creación/edición de cuentas
- Actualización de selectores de cuenta en movimientos
- Impacto en cálculo de saldos por negocio

**Prioridad recomendada:** 🔴 **ALTA** (Sprint 1.4 o 1.5)

- Es un cambio estructural que afecta el modelo de datos
- Mientras más datos existan, más difícil será migrar
- Debe implementarse antes de que el sistema tenga uso intensivo

**Sprint sugerido:** 1.4 o 1.5 (antes del MVP final)

**Tiempo estimado:** 4-5 días

***

### PUNTO 3: Bulk Upload de Traspasos

**Solicitud del cliente:**

> El cliente necesita poder realizar bulk uploads de traspasos entre cuentas identificando el negocio que envía, el negocio que recibe y las cuentas afectadas en el traspaso.

**Análisis del estado actual:**

- El sistema YA tiene implementado el endpoint `/api/movimientos/importar` para bulk upload.
- El sistema YA tiene traspasos implementados (`TRASPASO_SALIDA` y `TRASPASO_ENTRADA`).
- El sistema ya crea movimientos espejo automáticamente.

**Evaluación del requerimiento:**

- El cliente necesita importar MÚLTIPLES traspasos de una sola vez.
- Cada traspaso debe identificar: negocio origen, negocio destino, cuenta origen, cuenta destino.

**Impacto en el alcance:** 🟢 **SIN CAMBIO DE ALCANCE**

- La funcionalidad de importación ya existe.
- Solo requiere EXTENDER el template de importación para incluir traspasos.

**Solución propuesta:**

1. **Extender template de importación:**
   - Template actual: filas con movimientos simples (ingreso/egreso).
   - Template extendido: agregar columnas para traspasos.
2. **Formato de archivo CSV/Excel:**

```
| tipo | fecha | concepto | monto | cuenta_origen | cuenta_destino | negocio_origen | negocio_destino |
|------|-------|----------|-------|---------------|----------------|----------------|-----------------|
| TRASPASO | 2025-03-15 | Traspaso semanal | 5000 | BANCOMER_1 | BANCOMER_2 | FOODPARK | TRAFANSFAZA |

```

1. **Endpoint modificado:**
   - `POST /api/movimientos/importar` ya existe.
   - Agregar validación para tipo TRASPASO.
   - Crear movimientos espejo automáticamente.

**Nivel de complejidad:** 🟡 **MEDIA**

- Modificación del template existente
- Validación de datos de traspaso
- Testing con múltiples escenarios

**Prioridad recomendada:** 🟢 **BAJA** (Sprint 2.x)

- Es un enhancement de funcionalidad existente
- No bloquea el flujo actual de trabajo
- El usuario puede crear traspasos individuales

**Sprint sugerido:** 2.2 (con módulo de reportes)

**Tiempo estimado:** 2-3 días

***

### PUNTO 4: Aprobación por Categoría

**Solicitud del cliente:**

> Existen algunas categorías que no necesitan aprobación, el cliente quiere poder tener control de cuales categorías requerirán aprobación del movimiento, no todos los movimientos necesitan aprobación, solo los que caigan en la categoría requerida por el cliente.

**Análisis del estado actual:**

- El sistema tiene flujo de aprobación: `PENDIENTE` → `APROBADO`/`RECHAZADO`.
- TODOS los movimientos requieren aprobación actualmente.
- La entidad `Categoria` tiene: `id`, `nombre`, `tipo`, `negocioId`, `activa`.

**Evaluación del requerimiento:**

- El cliente necesita que algunos movimientos se aprueben automáticamente.
- La configuración debe ser por categoría.
- Ejemplo: Categoría "Gastos menores" → sin aprobación, Categoría "Compras mayores" → con aprobación.

**Impacto en el alcance:** 🟡 **CAMBIO DE ALCANCE MEDIO**

**Solución propuesta:**

1. **Modificar schema de categorias:**

```
export const categorias = pgTable('categorias', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  tipo: tipoCategoriaEnum('tipo').notNull(),
  negocioId: integer('negocio_id').references(() => negocios.id, { onDelete: 'cascade' }),
  requiereAprobacion: boolean('requiere_aprobacion').default(true).notNull(), // NUEVO
  montoMaxSinAprobacion: numeric('monto_max_sin_aprobacion', { precision: 15, scale: 2 }), // NUEVO: Opcional
  activa: boolean('activa').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

```

1. **Lógica de negocio:**

```
// Al crear un movimiento:
if (!categoria.requiereAprobacion) {
  movimiento.estado = 'APROBADO';
  movimiento.aprobadoPor = usuarioCreador.id; // Auto-aprobado
  movimiento.fechaAprobacion = new Date();
} else if (categoria.montoMaxSinAprobacion && movimiento.monto <= categoria.montoMaxSinAprobacion) {
  movimiento.estado = 'APROBADO';
  movimiento.aprobadoPor = usuarioCreador.id;
  movimiento.fechaAprobacion = new Date();
} else {
  movimiento.estado = 'PENDIENTE';
}

```

**Nivel de complejidad:** 🟡 **MEDIA**

- Modificación de schema
- Modificación de la lógica de creación de movimientos
- UI de configuración de categorías
- Tests para validar diferentes escenarios

**Prioridad recomendada:** 🟡 **MEDIA** (Sprint 1.5 o 2.x)

- Mejora la eficiencia operativa
- Reduce la carga de aprobación para el Dueño/Admin
- No es bloqueante para MVP

**Sprint sugerido:** 1.5 o 2.1

**Tiempo estimado:** 2-3 días

***

### PUNTO 5: Estados de Pago y Aprobación Separados

**Solicitud del cliente:**

> El cliente quisiera 2 botones: pagado y aprobación y que no refleje el movimiento. Existen movimientos que no deben de afectar el saldo hasta que sea "pagado". Puede que un movimiento se apruebe pero aún no se apliqué. La situación más común es al crear un pago, algunas veces el movimiento existe y es aprobado pero no pagado aún, por lo que no debería de afectar automáticamente la cuenta; esto no aplica para todos los movimientos, cuando este escenario se presente, debería de haber algún checkbox (bandera) al crear el movimiento que sea "¿Ya efectuado? Sí | No". Si el usuario registra el movimiento como "No efectuado" requerirá confirmar pago antes de verse reflejado. Si el movimiento Sí esta efectuado, entonces afecta directamente.

**Análisis del estado actual:**

- Estado actual: `PENDIENTE` → `APROBADO` → (afecta saldo).
- No hay distinción entre "aprobado" y "pagado".
- Los movimientos aprobados afectan el saldo inmediatamente.

**Evaluación del requerimiento:**

- El cliente necesita un estado intermedio: `APROBADO` → `PAGADO` → (afecta saldo).
- Solo los movimientos `PAGADO` deben afectar el saldo.
- Campo `efectuado` al crear el movimiento.

**Impacto en el alcance:** 🔴 **CAMBIO DE ALCANCE ALTO**

**Solución propuesta:**

1. **Modificar enum de estado:**

```
export const estadoMovimientoEnum = pgEnum('estado_movimiento', [
  'PENDIENTE',      // Creado, esperando aprobación
  'APROBADO',       // Aprobado, pero NO afecta saldo aún
  'RECHAZADO',      // Rechazado
  'PAGADO',         // Aprobado + Pagado → AFECTA SALDO
  'CANCELADO'       // Cancelado después de aprobado
]);

```

1. **Modificar schema de movimientos:**

```
export const movimientos = pgTable('movimientos', {
  // ... campos existentes ...
  estado: estadoMovimientoEnum('estado').notNull().default('PENDIENTE'),
  efectuado: boolean('efectuado').default(false).notNull(), // NUEVO: ¿Ya se realizó el pago?
  fechaPago: timestamp('fecha_pago'), // NUEVO: Cuándo se pagó
  pagadoPor: integer('pagado_por').references(() => usuarios.id), // NUEVO: Quién confirmó el pago
  // ... resto de campos ...
});

```

1. **Lógica de negocio:**

```
Creación de movimiento:
  - Si efectuado = true → estado = 'PAGADO' → afecta saldo
  - Si efectuado = false → estado = 'PENDIENTE' → NO afecta saldo

Flujo de aprobación:
  - PENDIENTE → APROBADO → NO afecta saldo aún
  - APROBADO → PAGADO → AFECTA SALDO
  - APROBADO → RECHAZADO → NO afecta saldo
  - PAGADO → CANCELADO → revierte saldo (crear movimiento inverso)

Cálculo de saldo:
  - Solo considerar movimientos con estado = 'PAGADO'

```

1. **Fórmula de saldo actualizada:**

```
saldoCalculado = 
  saldoInicial
  + SUM(monto WHERE tipo IN ('INGRESO', 'TRASPASO_ENTRADA') AND estado = 'PAGADO')
  - SUM(monto WHERE tipo IN ('EGRESO', 'TRASPASO_SALIDA') AND estado = 'PAGADO')

```

**Nivel de complejidad:** 🔴 **ALTA**

- Cambio fundamental en el modelo de estados
- Modificación de todas las queries de saldo
- Migración de datos existentes
- UI para nuevo flujo de pago
- Historial de cambios de estado
- Impacto en reportes y dashboard

**Prioridad recomendada:** 🔴 **ALTA** (Sprint 1.4 o 1.5)

- Cambio estructural importante
- Afecta la métrica principal del sistema (saldos)
- Debe implementarse antes de que el sistema tenga muchos datos

**Sprint sugerido:** 1.4 o 1.5

**Tiempo estimado:** 5-6 días

***

### PUNTO 6: Dashboard de Saldos por Banco

**Solicitud del cliente:**

> Dinero total en cada banco (dashboards) y abajo el total. El cliente requiere tener trazabilidad del saldo en cada cuenta bancaria como dashboard.

**Análisis del estado actual:**

- El sistema YA tiene `SaldoCalculado` en `cuenta_banco.types.ts`.
- El endpoint `/api/cuentas-banco/:id/saldo` ya existe.
- El dashboard actual muestra resumen por negocio.

**Evaluación del requerimiento:**

- El cliente necesita un widget específico para saldos por banco.
- Debe mostrar: cada cuenta con su saldo + total consolidado.

**Impacto en el alcance:** 🟢 **SIN CAMBIO DE ALCANCE**

- Es una mejora de UI/UX del dashboard existente.
- Los datos y endpoints ya existen.

**Solución propuesta:**

1. **Nuevo componente:** **`SaldosBancoCard`**

```
interface SaldosBancoCardProps {
  cuentas: {
    id: number;
    nombre: string;
    bancoInstitucion: string;
    tipo: TipoCuenta;
    saldoCalculado: number;
    saldoReal: number | null;
    diferencia: number | null;
  }[];
  totalConsolidado: number;
}

```

1. **UI propuesta:**

```
┌─────────────────────────────────────────────┐
│ 💰 SALDOS POR CUENTA                        │
├─────────────────────────────────────────────┤
│ Banco        │ Cuenta     │ Saldo          │
│ Bancomer     | Principal  │ $150,000.00    │
│ Bancomer     | Operativo  │ $85,000.00     │
│ Santander    | Ahorro     │ $200,000.00    │
│ Efectivo     | Caja       │ $15,000.00     │
├─────────────────────────────────────────────┤
│ TOTAL CONSOLIDADO           │ $450,000.00   │
└─────────────────────────────────────────────┘

```

1. **Endpoint existente a reutilizar:**
   - `GET /api/cuentas-banco?negocioId=X` → lista de cuentas
   - Calcular saldos en frontend o usar endpoint de saldo

**Nivel de complejidad:** 🟢 **BAJA**

- Componente de UI nuevo
- Datos ya disponibles
- No requiere cambios de backend

**Prioridad recomendada:** 🟢 **ALTA** (Sprint 1.4 o 1.5)

- Es una mejora de UX muy visible para el cliente
- Bajo esfuerzo, alto impacto
- Contribuye directamente a la métrica de éxito

**Sprint sugerido:** 1.4 o 1.5

**Tiempo estimado:** 1-2 días

***

### PUNTO 7: Perfil Externo con Cotizaciones

**Solicitud del cliente:**

> Externo: movimientos, cotizaciones, por aprobar. El perfil de externo debería de ser capaz de ver solicitar aprobación de movimientos, crear cotizaciones.

**Análisis del estado actual:**

- El sistema YA tiene el módulo de cotizaciones implementado.
- Rol `Externo` actualmente tiene permisos: `['read', 'write']`.
- `Externo` puede ver movimientos (solo los que creó).

**Evaluación del requerimiento:**

- El cliente quiere que `Externo` pueda:
  1. ✅ Ver movimientos (ya puede)
  2. ✅ Crear movimientos (ya puede con permiso 'write')
  3. ✅ Crear cotizaciones (módulo ya existe)
  4. ⚠️ Solicitar aprobación de movimientos (flujo ya existe)

**Impacto en el alcance:** 🟢 **SIN CAMBIO DE ALCANCE**

- La funcionalidad ya está implementada.
- Solo requiere verificar que los permisos estén correctos.

**Solución propuesta:**

1. **Verificar permisos actuales:**

```
// permissions.types.ts actual:
Externo: ['read', 'write'],

```

- Ya tiene `write`, puede crear movimientos y cotizaciones.

1. **Flujo de aprobación para Externo:**

- Externo crea movimiento → estado: `PENDIENTE`
- Dueño/Admin aprueba → estado: `APROBADO`
- Este flujo ya está implementado.

1. **Posible mejora de UI:**

- Mostrar botón "Solicitar aprobación" más prominentemente para Externo.
- Notificaciones al Dueño/Admin cuando Externo crea movimiento.

**Nivel de complejidad:** 🟢 **BAJA**

- Verificación de permisos existentes
- Posibles ajustes menores de UI
- Testing de flujos

**Prioridad recomendada:** 🟢 **BAJA** (Sprint 1.5 o posterior)

- Funcionalidad ya existe
- Solo requiere verificación y documentación

**Sprint sugerido:** 1.5 (verificación)

**Tiempo estimado:** 0.5-1 día

***

### PUNTO 8: Importación de PDF (Documentos)

**Solicitud del cliente:**

> Poner una importación de PDF. El cliente desea que pueda almacenar documentos internos en PDF.

**Análisis del estado actual:**

- El sistema NO tiene funcionalidad de almacenamiento de documentos.
- Los movimientos no tienen campo para documentos adjuntos.
- No hay infraestructura de almacenamiento de archivos.

**Evaluación del requerimiento:**

- El cliente necesita adjuntar PDFs a movimientos o cotizaciones.
- Ejemplo: Facturas, recibos, comprobantes de pago.

**Impacto en el alcance:** 🟡 **CAMBIO DE ALCANCE MEDIO**

**Solución propuesta:**

1. **Opciones de almacenamiento:**

Opción

Descripción

Pros

Contras

A: Local storage

Guardar en `/public/uploads`

Simple, sin costo

No escalable, se pierde en redeploy

B: Vercel Blob

Servicio nativo de Vercel

Fácil integración

Costo adicional

C: AWS S3

Almacenamiento en la nube

Escalable, económico

Configuración adicional

D: Supabase Storage

Con PostgreSQL existente

Integrado con DB

Dependencia adicional

**Recomendación:** Opción C (AWS S3) u Opción B (Vercel Blob) según el deploy.

1. **Schema modificado:**

```
export const movimientos = pgTable('movimientos', {
  // ... campos existentes ...
  documentoUrl: varchar('documento_url', { length: 500 }), // NUEVO
  documentoNombre: varchar('documento_nombre', { length: 255 }), // NUEVO
  documentoTipo: varchar('documento_tipo', { length: 50 }), // NUEVO: PDF, JPG, PNG
  // ... resto de campos ...
});

```

1. **Endpoints nuevos:**

- `POST /api/upload` → Subir archivo
- `GET /api/upload/[id]` → Descargar archivo
- `DELETE /api/upload/[id]` → Eliminar archivo

**Nivel de complejidad:** 🟡 **MEDIA**

- Configuración de almacenamiento en la nube
- Manejo de archivos multipart/form-data
- UI de upload/download
- Validación de tipos de archivo
- Consideraciones de seguridad

**Prioridad recomendada:** 🟡 **MEDIA** (Sprint 2.x)

- No es crítico para MVP
- Mejora la trazabilidad de documentos
- Posponer a Fase 2

**Sprint sugerido:** 2.2 o posterior

**Tiempo estimado:** 3-4 días

***

### PUNTO 9: Botón Cancelar en Factura/Cotización

**Solicitud del cliente:**

> Botón cancelar al final en factura. Una factura puede ser cancelada, no tiene botón de cancelar.

**Análisis del estado actual:**

- El sistema tiene `EstadoCotizacion`: `BORRADOR | ENVIADA | APROBADA | FACTURADA | CANCELADA`.
- El estado `CANCELADA` ya existe en el enum.
- Falta el botón/acción para cancelar.

**Evaluación del requerimiento:**

- El cliente necesita poder cancelar cotizaciones/facturas.
- La funcionalidad está parcialmente implementada.

**Impacto en el alcance:** 🟢 **SIN CAMBIO DE ALCANCE**

- Solo requiere agregar el botón y la acción.

**Solución propuesta:**

1. **Botón de cancelar en UI:**

- Agregar botón "Cancelar" en la vista de detalle de cotización.
- Confirmar con AlertDialog antes de cancelar.

1. **Endpoint existente:**

- `PATCH /api/cotizaciones/:id/estado` ya existe.
- Enviar `{ nuevoEstado: 'CANCELADA' }`.

1. **Lógica de negocio:**

```
// Solo se puede cancelar si no está ya cancelada o facturada
if (cotizacion.estado === 'CANCELADA' || cotizacion.estado === 'FACTURADA') {
  return { success: false, error: 'No se puede cancelar esta cotización' };
}

```

**Nivel de complejidad:** 🟢 **BAJA**

- Agregar botón en UI
- Verificar lógica de negocio
- Testing

**Prioridad recomendada:** 🟢 **ALTA** (Inmediato - Sprint actual)

- Es un bug/feature faltante
- Bajo esfuerzo
- Alta visibilidad para el cliente

**Sprint sugerido:** Inmediato (Sprint actual 1.4)

**Tiempo estimado:** 0.5 días

***

### PUNTO 10: Traspasos entre Cuentas y Negocios

**Solicitud del cliente:**

> Debe de existir traspasos entre cuentas y traspasos entre negocios, un traspaso entre negocio puede venir de una cuenta que también se encuentra en el negocio que envía/recibe.

**Análisis del estado actual:**

- El sistema YA tiene traspasos implementados.
- `TRASPASO_SALIDA` y `TRASPASO_ENTRADA` funcionan con movimientos espejo.
- Al crear un traspaso, se especifica: `negocioId`, `negocioDestinoId`, `cuentaBancoId`, `cuentaBancoDestinoId`.

**Evaluación del requerimiento:**

- El sistema ya soporta:
  1. ✅ Traspaso entre cuentas del mismo negocio
  2. ✅ Traspaso entre cuentas de diferentes negocios
- La funcionalidad está completa.

**Verificación de casos:**

Caso

Descripción

Soportado

Mismo negocio, misma cuenta

No tiene sentido

N/A

Mismo negocio, diferente cuenta

Traspaso interno

✅ Sí

Diferente negocio, cuentas distintas

Traspaso inter-negocio

✅ Sí

Diferente negocio, misma cuenta

Con cuenta compartida

⚠️ Depende del Punto 2

**Impacto en el alcance:** 🟢 **SIN CAMBIO DE ALCANCE**

- La funcionalidad ya existe.
- Si se implementa el Punto 2 (cuentas compartidas), se habilitan más casos.

**Solución propuesta:**

- Verificar que la UI de traspasos sea clara.
- Documentar los casos de uso.
- Testing exhaustivo de traspasos.

**Nivel de complejidad:** 🟢 **BAJA**

- Solo verificación y testing

**Prioridad recomendada:** 🟢 **BAJA** (Verificación inmediata)

- Funcionalidad ya implementada
- Documentar para el cliente

**Sprint sugerido:** Inmediato (verificación)

**Tiempo estimado:** 0.5 días (testing y documentación)

***

## RESUMEN DE IMPACTO Y PRIORIDADES

### Cambios de Alcance Alto (🔴) - Priorizar para Sprint 1.4/1.5

\#

Punto

Complejidad

Tiempo

Sprint sugerido

2

Cuentas compartidas

ALTA

4-5 días

1.4 o 1.5

5

Estados Pago/Aprobación

ALTA

5-6 días

1.4 o 1.5

**Total tiempo:** 9-11 días

### Cambios de Alcance Medio (🟡) - Sprint 2.x o posterior

\#

Punto

Complejidad

Tiempo

Sprint sugerido

1

Divisiones/Sub-divisiones

ALTA

3-4 días

2.1

4

Aprobación por categoría

MEDIA

2-3 días

1.5 o 2.1

8

Importación PDF

MEDIA

3-4 días

2.2

**Total tiempo:** 8-11 días

### Sin Cambio de Alcance (🟢) - Implementación inmediata

\#

Punto

Complejidad

Tiempo

Sprint sugerido

3

Bulk upload traspasos

MEDIA

2-3 días

2.2

6

Dashboard saldos banco

BAJA

1-2 días

1.4 o 1.5

7

Perfil externo

BAJA

0.5-1 día

1.5

9

Botón cancelar

BAJA

0.5 días

Inmediato

10

Traspasos existentes

BAJA

0.5 días

Inmediato

**Total tiempo:** 4.5-7 días

***

## RECOMENDACIÓN DE PLAN DE ACCIÓN

### Sprint 1.4 (Actual) - Quick Wins

1. **Punto 9:** Botón cancelar (0.5 días) ✅ Inmediato
2. **Punto 10:** Verificar traspasos (0.5 días) ✅ Inmediato
3. **Punto 6:** Dashboard saldos banco (1-2 días) ✅ Alto impacto

### Sprint 1.5 - Cambios Estructurales

1. **Punto 2:** Cuentas compartidas (4-5 días) ⚠️ Cambio de schema
2. **Punto 5:** Estados Pago/Aprobación (5-6 días) ⚠️ Cambio de lógica
3. **Punto 4:** Aprobación por categoría (2-3 días)

### Sprint 2.1+ - Mejoras Post-MVP

1. **Punto 1:** Divisiones jerárquicas (3-4 días)
2. **Punto 3:** Bulk upload traspasos (2-3 días)
3. **Punto 8:** Importación PDF (3-4 días)
4. **Punto 7:** Verificar perfil externo (0.5-1 día)

***

## CONCLUSIÓN

El feedback del cliente revela necesidades que van desde correcciones menores (botón cancelar) hasta cambios estructurales significativos (estados de pago, cuentas compartidas).

**Recomendación crítica:** Implementar los cambios de alto impacto (Puntos 2 y 5) ANTES de que el sistema entre en producción con datos reales, ya que requieren migraciones de schema que serán más costosas con el tiempo.

Los puntos 6, 9 y 10 son mejoras inmediatas de bajo riesgo que pueden implementarse en el sprint actual sin afectar el cronograma.

***

**Documento generado:** Marzo 2025 **Versión:** 1.0 **Estado:** COMPLETADO **Siguiente paso:** Confirmar priorización con el cliente y generar Ground Truth v2.0
