PROMPTS SPRINT 1.6 — UI/FRONTEND FOUNDATION

Fase 11: Design System, Responsive, Accesibilidad y Feature Tour

Branch: fase-11-design Base branch: sprint-1.5 Total prompts: 13

============================================================

ÉPICA 1: UI FOUNDATION

============================================================

=== PROMPT 1.6.A === AGENTE ASIGNADO: Frontend (UI/Design System) TAREA: Instalar tailwind-merge, actualizar utilidad cn() y estandarizar Design Tokens en globals.css

Contexto del Proyecto

Estás trabajando en OneBusiness, un sistema de gestión financiera multi-tenant actualmente en producción en Vercel. El proyecto usa:

- Next.js 14 (App Router)

- Tailwind CSS

- shadcn/ui (componentes adaptados en src/components/ui/)

- Drizzle ORM con PostgreSQL (Neon)

Estado Actual del Problema

- Utilidad cn() sin merge de Tailwind:

- Archivo: src/lib/utils.ts

- La función actual solo concatena clases: values.filter(Boolean).join(' ')

- Esto causa conflictos silenciosos cuando se pasan clases contradictorias (ej: bg-primary bg-red-500)

- Design Tokens incompletos en globals.css:

- Faltan tokens semánticos para estados: success, warning, info

- Faltan tokens para estados de movimiento: pendiente, aprobado, pagado, rechazado, cancelado

- No hay soporte para dark mode

- Hardcodes de color en componentes:

- button.tsx usa bg-[#1e3a5f] en lugar de bg-primary

- badge.tsx usa bg-[#1e3a5f] y bg-[#2d6a9f]

- card.tsx usa border-slate-200 bg-white en lugar de tokens

Requisitos

1. Instalar tailwind-merge

# En Windows (PowerShell/CMD)
npm install tailwind-merge

2. Actualizar src/lib/utils.ts

La nueva función cn() debe:

- Importar twMerge de tailwind-merge

- Combinar con clsx (ya instalado o instalarlo)

- Manejar objetos, arrays y strings

- Resolver conflictos de clases de Tailwind automáticamente

3. Actualizar src/app/globals.css

Agregar los siguientes tokens:

/* Estados semánticos */
--success: 142 71% 45%;
--success-foreground: 0 0% 98%;
--warning: 38 92% 50%;
--warning-foreground: 0 0% 98%;
--info: 199 89% 48%;
--info-foreground: 0 0% 98%;

/* Estados de movimiento (colores base) */
--estado-pendiente: 38 92% 50%;
--estado-aprobado: 199 89% 48%;
--estado-pagado: 142 71% 45%;
--estado-rechazado: 0 84% 60%;
--estado-cancelado: 215 16% 47%;

4. Extender tailwind.config.ts

Agregar colores extendidos para los nuevos tokens de estados.

Instrucciones de Git

Al finalizar, ejecutar:

git checkout -b fase-11-design
git add .
git commit -m "feat(ui): install tailwind-merge, update cn() utility and add design tokens"
git push https://x-access-token:$env:GITHUB_TOKEN@github.com/nhadadn/OneBusiness.git fase-11-design

Testing

- Ejecutar npm run build y verificar que no hay errores

- Ejecutar npm run lint y verificar que no hay errores nuevos

- Verificar que los componentes existentes siguen funcionando (no cambiar su código aún, solo la base)

Documentación Requerida

Al terminar, documentar en el commit o en un archivo temporal:

- Qué cambios se hicieron

- Qué dependencias se instalaron

- Qué tokens nuevos están disponibles

Checkpoints de Evaluación

-  Checkpoint 1: tailwind-merge instalado y funcionando

-  Checkpoint 2: Función cn() actualizada con twMerge

-  Checkpoint 3: Tokens semánticos agregados a globals.css

-  Checkpoint 4: tailwind.config.ts extendido con nuevos colores

-  Checkpoint 5: Build y lint pasan sin errores

-  Checkpoint 6: Commit y push exitosos al branch fase-11-design

===========================

=== PROMPT 1.6.B === AGENTE ASIGNADO: Frontend (UI Components) TAREA: Normalizar componentes Button y Badge usando design tokens, agregar variantes semánticas

Contexto del Proyecto

Estás trabajando en OneBusiness. El prompt anterior (1.6.A) ya instaló tailwind-merge, actualizó cn() y agregó design tokens. Ahora debes aplicar esos tokens a los componentes base.

Branch de trabajo: fase-11-design (ya creado en el prompt anterior)

Estado Actual del Problema

- src/components/ui/button.tsx:

- Usa hardcodes: bg-[#1e3a5f], bg-[#2d6a9f], border-slate-200, text-white

- No tiene variante destructive

- Focus ring usa ring-slate-400 en lugar de token

- src/components/ui/badge.tsx:

- Usa hardcodes: bg-[#1e3a5f], bg-[#2d6a9f], border-slate-200

- No tiene variantes para estados de movimiento (pendiente, aprobado, pagado, rechazado, cancelado)

- Solo tiene 4 variantes: default, secondary, outline, destructive

Requisitos

1. Actualizar src/components/ui/button.tsx

ANTES de hacer cambios:

- Lee el archivo actual

- Identifica TODOS los hardcodes de color

- Planifica qué tokens usar en cada caso

Cambios requeridos:

- Reemplazar bg-[#1e3a5f] por bg-primary

- Reemplazar bg-[#2d6a9f] por bg-secondary

- Reemplazar text-white por text-primary-foreground donde corresponda

- Reemplazar border-slate-200 por border-border

- Reemplazar hover:bg-slate-50 por hover:bg-accent

- Reemplazar hover:bg-slate-100 por hover:bg-accent

- Reemplazar text-slate-900 por text-foreground

- Agregar variante destructive con colores del token --destructive

- Actualizar focus ring a focus-visible:ring-ring

- Agregar aria-label como prop opcional para accesibilidad

Variantes finales:

- default: primary button (acciones principales)

- secondary: secondary button (acciones secundarias)

- outline: outlined button

- ghost: ghost/text button

- destructive: destructive action (eliminar, rechazar)

2. Actualizar src/components/ui/badge.tsx

ANTES de hacer cambios:

- Lee el archivo actual

- Identifica TODOS los hardcodes de color

- Planifica qué tokens usar

Cambios requeridos:

- Reemplazar todos los hardcodes por tokens

- Agregar variantes para estados de movimiento:

- pendiente: amarillo/warning

- aprobado: azul/info

- pagado: verde/success

- rechazado: rojo/destructive

- cancelado: gris/muted

- Actualizar tipos TypeScript

Variantes finales:

- default, secondary, outline, destructive (existentes, normalizados)

- pendiente, aprobado, pagado, rechazado, cancelado (nuevas)

Instrucciones de Git

git add .
git commit -m "feat(ui): normalize Button and Badge components with design tokens"
git push https://x-access-token:$env:GITHUB_TOKEN@github.com/nhadadn/OneBusiness.git fase-11-design

Testing

- npm run build sin errores

- npm run lint sin errores nuevos

- Verificar visualmente que los botones y badges se ven correctos

- Verificar que las variantes nuevas funcionan

Documentación Requerida

Documentar en el commit:

- Lista de cambios en Button

- Lista de cambios en Badge

- Nuevas variantes disponibles

Checkpoints de Evaluación

-  Checkpoint 1: Button sin hardcodes de color

-  Checkpoint 2: Button tiene variante destructive

-  Checkpoint 3: Badge sin hardcodes de color

-  Checkpoint 4: Badge tiene variantes de estado de movimiento

-  Checkpoint 5: Build y lint pasan

-  Checkpoint 6: Commit y push exitosos

===========================

=== PROMPT 1.6.C === AGENTE ASIGNADO: Frontend (UI Components) TAREA: Normalizar componentes Card, Input y crear componentes compartidos PageHeader, EmptyState, LoadingSkeleton

Contexto del Proyecto

Estás trabajando en OneBusiness. Los prompts anteriores (1.6.A, 1.6.B) ya normalizaron la base de design tokens, Button y Badge. Ahora debes normalizar Card, Input y crear componentes compartidos.

Branch de trabajo: fase-11-design

Estado Actual del Problema

- src/components/ui/card.tsx:

- Usa border-slate-200 bg-white en lugar de tokens

- CardDescription usa text-slate-600

- src/components/ui/input.tsx:

- Revisar si usa tokens o hardcodes

- Verificar focus ring consistente

- Faltan componentes compartidos:

- PageHeader: Título de página + subtítulo + slot para acción primaria

- EmptyState: Estado vacío con icono + título + descripción + CTA opcional

- LoadingSkeleton: Skeleton reutilizable para tablas y cards

Requisitos

1. Actualizar src/components/ui/card.tsx

ANTES de hacer cambios:

- Lee el archivo actual

- Identifica hardcodes y qué tokens usar

Cambios requeridos:

- border-slate-200 → border-border

- bg-white → bg-card

- text-slate-600 → text-muted-foreground

2. Revisar y actualizar src/components/ui/input.tsx

Cambios requeridos:

- Asegurar que usa tokens para border y focus ring

- Focus ring debe ser focus-visible:ring-2 focus-visible:ring-ring

- Verificar consistencia con otros inputs

3. Crear src/components/shared/page-header.tsx

Requisitos:

- Props: title, description, action (ReactNode opcional)

- Uso de tokens para colores

- Responsive: en móvil, el action puede ir abajo o en un menú

// Ejemplo de uso esperado:
<PageHeader
  title="Movimientos"
  description="Gestiona los movimientos de tus cuentas"
  action={<Button>Nuevo movimiento</Button>}
/>

4. Crear src/components/shared/empty-state.tsx

Requisitos:

- Props: icon (ReactNode), title, description, action (ReactNode opcional)

- Uso de tokens

- Centrado y espaciado consistente

// Ejemplo de uso esperado:
<EmptyState
  icon={<FileX className="h-12 w-12" />}
  title="No hay movimientos"
  description="Crea tu primer movimiento para comenzar"
  action={<Button>Crear movimiento</Button>}
/>

5. Crear src/components/shared/loading-skeleton.tsx

Requisitos:

- Props: variant: 'table' | 'card' | 'list'

- Props: rows (número de filas, default 5)

- Usar el componente Skeleton de shadcn que ya existe

6. Crear src/components/shared/index.ts

Exportar todos los componentes compartidos.

Instrucciones de Git

git add .
git commit -m "feat(ui): normalize Card/Input, add PageHeader, EmptyState, LoadingSkeleton components"
git push https://x-access-token:$env:GITHUB_TOKEN@github.com/nhadadn/OneBusiness.git fase-11-design

Testing

- npm run build sin errores

- npm run lint sin errores nuevos

- Verificar que Card e Input usan tokens

- Verificar que los nuevos componentes renderizan correctamente

Checkpoints de Evaluación

-  Checkpoint 1: Card usa tokens (border-border, bg-card, text-muted-foreground)

-  Checkpoint 2: Input usa tokens y focus ring correcto

-  Checkpoint 3: PageHeader creado y funcional

-  Checkpoint 4: EmptyState creado y funcional

-  Checkpoint 5: LoadingSkeleton creado y funcional

-  Checkpoint 6: Build y lint pasan

-  Checkpoint 7: Commit y push exitosos

===========================

=== PROMPT 1.6.D === AGENTE ASIGNADO: Frontend (Responsive/Mobile) TAREA: Implementar navegación móvil con Sheet/Drawer para sidebar

Contexto del Proyecto

Estás trabajando en OneBusiness. El sidebar actual está oculto en móvil (hidden md:flex), dejando a los usuarios sin navegación en dispositivos pequeños.

Branch de trabajo: fase-11-design

Estado Actual del Problema

- src/components/layout/sidebar.tsx:

- Tiene hidden md:flex que oculta el sidebar en móvil

- No hay alternativa de navegación para móviles

- Header no tiene menú hamburguesa:

- Revisar src/components/layout/header.tsx

- Falta botón de menú para móvil

- Componente Sheet disponible:

- src/components/ui/sheet.tsx existe y puede usarse para el drawer

Requisitos

1. Analizar la estructura actual

ANTES de hacer cambios:

- Lee src/components/layout/sidebar.tsx completo

- Lee src/components/layout/header.tsx completo

- Lee src/app/(dashboard)/layout.tsx para entender la estructura

- Identifica qué elementos de navegación deben verse en móvil

2. Crear componente MobileNav (o modificar Sidebar)

Opción A: Modificar Sidebar existente

- Agregar estado para controlar apertura en móvil

- Usar Sheet para envolver el contenido del sidebar en móvil

- En desktop, comportamiento sin cambios

Opción B: Crear MobileNav separado

- Nuevo componente que usa Sheet

- Contiene los mismos items de navegación

- Se muestra solo en móvil

Elige la opción que mejor se adapte a la arquitectura actual.

3. Modificar Header para incluir botón de menú

- Agregar botón hamburguesa visible solo en < md

- Al hacer clic, abre el Sheet/Drawer con navegación

- Usar icono Menu de lucide-react

4. Touch targets

- Verificar que todos los items de navegación en móvil tengan tamaño mínimo 44px

- Agregar padding suficiente

5. Cerrar menú al navegar

- Cuando el usuario hace clic en un item de navegación, el menú debe cerrarse automáticamente

Instrucciones de Git

git add .
git commit -m "feat(ui): add mobile navigation with Sheet/Drawer"
git push https://x-access-token:$env:GITHUB_TOKEN@github.com/nhadadn/OneBusiness.git fase-11-design

Testing

- npm run build sin errores

- npm run lint sin errores nuevos

- Probar en viewport < 768px (usando DevTools)

- Verificar que el menú hamburguesa funciona

- Verificar que todos los items de navegación son accesibles

- Verificar que el menú se cierra al navegar

Documentación Requerida

Documentar:

- Qué enfoque se eligió (A o B) y por qué

- Qué archivos se modificaron

- Cómo probar la navegación móvil

Checkpoints de Evaluación

-  Checkpoint 1: Header tiene botón hamburguesa visible en móvil

-  Checkpoint 2: Sheet/Drawer funciona correctamente

-  Checkpoint 3: Todos los items de navegación accesibles en móvil

-  Checkpoint 4: Touch targets ≥ 44px

-  Checkpoint 5: Menú se cierra al navegar

-  Checkpoint 6: Build y lint pasan

-  Checkpoint 7: Commit y push exitosos

===========================

=== PROMPT 1.6.E === AGENTE ASIGNADO: Frontend (Responsive) TAREA: Hacer tablas responsivas con columnas prioritarias

Contexto del Proyecto

Estás trabajando en OneBusiness. Las tablas actuales pueden tener overflow horizontal en móvil.

Branch de trabajo: fase-11-design

Estado Actual del Problema

- Revisar las tablas en:

- src/app/(dashboard)/movimientos/page.tsx

- src/app/(dashboard)/negocios/page.tsx

- src/app/(dashboard)/configuracion/cuentas-banco/page.tsx

- Identificar:

- Qué columnas son esenciales en móvil

- Qué columnas pueden ocultarse

- Si hay overflow horizontal

Requisitos

1. Analizar tablas existentes

ANTES de hacer cambios:

- Lee cada archivo de página con tablas

- Identifica las columnas de cada tabla

- Clasifica columnas como:

- Esenciales: siempre visibles

- Secundarias: pueden ocultarse en móvil

- Acciones: deben permanecer visibles

2. Implementar columnas responsivas

Opción A: Clases de Tailwind por columna

// Columna visible siempre
<TableCell>...</TableCell>

// Columna oculta en móvil
<TableCell className="hidden sm:table-cell">...</TableCell>

Opción B: Usar data-density attribute

- Agregar atributo data-priority="essential|secondary" a las celdas

- CSS para ocultar basado en viewport

Elige la opción que mejor se adapte.

3. Asegurar overflow-x-auto

- Cada tabla debe estar envuelta en un contenedor con overflow-x-auto

- No debe haber scroll horizontal de la página completa

4. Tablas específicas

Movimientos:

- Esenciales: Fecha, Concepto, Monto, Estado, Acciones

- Secundarias: Categoría, Cuenta, Referencia

Negocios:

- Esenciales: Nombre, Estado, Acciones

- Secundarias: RFC, Rubro, Umbrales

Cuentas Banco:

- Esenciales: Banco, Cuenta, Saldo, Acciones

- Secundarias: Tipo, Negocio asignado

Instrucciones de Git

git add .
git commit -m "feat(ui): make tables responsive with priority columns"
git push https://x-access-token:$env:GITHUB_TOKEN@github.com/nhadadn/OneBusiness.git fase-11-design

Testing

- npm run build sin errores

- Probar en viewport < 640px (móvil)

- Verificar que no hay scroll horizontal de página

- Verificar que columnas esenciales son visibles

- Verificar que columnas secundarias se ocultan

Checkpoints de Evaluación

-  Checkpoint 1: Tabla de movimientos responsiva

-  Checkpoint 2: Tabla de negocios responsiva

-  Checkpoint 3: Tabla de cuentas banco responsiva

-  Checkpoint 4: Sin overflow horizontal de página

-  Checkpoint 5: Build y lint pasan

-  Checkpoint 6: Commit y push exitosos

===========================

=== PROMPT 1.6.F === AGENTE ASIGNADO: Frontend (UI Pages) TAREA: Normalizar páginas Dashboard y Movimientos con componentes unificados

Contexto del Proyecto

Estás trabajando en OneBusiness. Los prompts anteriores crearon componentes compartidos: PageHeader, EmptyState, LoadingSkeleton, y normalizaron Button, Badge, Card. Ahora debes aplicar estos componentes a las páginas principales.

Branch de trabajo: fase-11-design

Estado Actual del Problema

- Dashboard (src/app/(dashboard)/page.tsx):

- Puede no usar PageHeader

- Cards pueden no usar tokens

- Sin skeleton de carga

- Movimientos (src/app/(dashboard)/movimientos/page.tsx):

- Puede no usar PageHeader

- Badges de estado pueden no usar las nuevas variantes

- Botón primario puede no usar variant="default"

- Sin skeleton consistente

Requisitos

1. Analizar estado actual

ANTES de hacer cambios:

- Lee src/app/(dashboard)/page.tsx (Dashboard)

- Lee src/app/(dashboard)/movimientos/page.tsx

- Identifica qué componentes se pueden reemplazar por los nuevos

2. Dashboard

Cambios requeridos:

- Usar PageHeader si no se usa

- Verificar que las Cards usan tokens

- Agregar LoadingSkeleton para el estado de carga inicial

- Verificar que los botones usan las variantes correctas

3. Movimientos

Cambios requeridos:

- Usar PageHeader con título y botón "Nuevo movimiento"

- Badge de estado debe usar las variantes nuevas: variant="pendiente", variant="aprobado", etc.

- Botón primario debe usar variant="default" (no ghost con overrides)

- Tabs de filtro consistentes

- EmptyState cuando no hay movimientos

- LoadingSkeleton para carga inicial

4. Verificar consistencia

- Todos los botones primarios usan variant="default"

- Todos los badges de estado usan las variantes semánticas

- Headers de página consistentes

- Estados de carga y vacío consistentes

Instrucciones de Git

git add .
git commit -m "feat(ui): normalize Dashboard and Movimientos pages with unified components"
git push https://x-access-token:$env:GITHUB_TOKEN@github.com/nhadadn/OneBusiness.git fase-11-design

Testing

- npm run build sin errores

- Verificar Dashboard visualmente

- Verificar Movimientos visualmente

- Verificar que los badges de estado tienen colores correctos

- Verificar skeletons en carga

- Verificar empty states

Checkpoints de Evaluación

-  Checkpoint 1: Dashboard usa PageHeader

-  Checkpoint 2: Dashboard usa LoadingSkeleton

-  Checkpoint 3: Movimientos usa PageHeader

-  Checkpoint 4: Badges de estado usan variantes semánticas

-  Checkpoint 5: EmptyState implementado

-  Checkpoint 6: Build y lint pasan

-  Checkpoint 7: Commit y push exitosos

===========================

=== PROMPT 1.6.G === AGENTE ASIGNADO: Frontend (UI Pages) TAREA: Normalizar páginas Negocios, Cuentas Banco y Categorías

Contexto del Proyecto

Estás trabajando en OneBusiness. Continuando con la normalización de páginas.

Branch de trabajo: fase-11-design

Estado Actual del Problema

Revisar y normalizar:

- src/app/(dashboard)/negocios/page.tsx

- src/app/(dashboard)/configuracion/cuentas-banco/page.tsx

- src/app/(dashboard)/configuracion/categorias/page.tsx (si existe)

Requisitos

1. Analizar estado actual

ANTES de hacer cambios:

- Lee cada archivo de página

- Identifica:

- Si usa PageHeader o título hardcoded

- Si usa las variantes correctas de Button

- Si tiene EmptyState

- Si tiene LoadingSkeleton

- Si usa Badge con variantes semánticas

2. Negocios

Cambios requeridos:

- Usar PageHeader con título y botón "Crear negocio"

- Tabla con badges de estado consistentes

- EmptyState cuando no hay negocios

- LoadingSkeleton para carga

- Botones de acción con variantes correctas (edit: outline, delete: destructive)

3. Cuentas Banco

Cambios requeridos:

- Usar PageHeader con título y botón "Crear cuenta"

- Badge para tipo de cuenta (global/privada)

- EmptyState cuando no hay cuentas

- LoadingSkeleton para carga

- Botones de acción consistentes

4. Categorías

Cambios requeridos:

- Usar PageHeader con título y botón "Crear categoría"

- EmptyState cuando no hay categorías

- LoadingSkeleton para carga

- Consistencia con otras páginas

5. Formularios con feedback

- Verificar que los formularios de creación/edición tienen feedback isPending

- Botón de submit debe mostrar "Guardando..." cuando está loading

Instrucciones de Git

git add .
git commit -m "feat(ui): normalize Negocios, Cuentas Banco, Categorias pages"
git push https://x-access-token:$env:GITHUB_TOKEN@github.com/nhadadn/OneBusiness.git fase-11-design

Testing

- npm run build sin errores

- Verificar cada página visualmente

- Verificar consistencia entre páginas

- Verificar formularios con feedback de loading

Checkpoints de Evaluación

-  Checkpoint 1: Negocios usa PageHeader y componentes unificados

-  Checkpoint 2: Cuentas Banco usa PageHeader y componentes unificados

-  Checkpoint 3: Categorías usa PageHeader y componentes unificados

-  Checkpoint 4: Formularios tienen feedback isPending

-  Checkpoint 5: Build y lint pasan

-  Checkpoint 6: Commit y push exitosos

===========================

=== PROMPT 1.6.H === AGENTE ASIGNADO: Frontend (UI Pages) TAREA: Normalizar páginas Arqueo y Consolidado

Contexto del Proyecto

Estás trabajando en OneBusiness. Últimas páginas a normalizar.

Branch de trabajo: fase-11-design

Estado Actual del Problema

Revisar y normalizar:

- src/app/(dashboard)/configuracion/arqueo/page.tsx

- src/app/(dashboard)/configuracion/consolidado/page.tsx (si existe)

Requisitos

1. Analizar estado actual

ANTES de hacer cambios:

- Lee cada archivo de página

- Identifica la estructura actual

- Verifica uso de tokens y componentes

2. Arqueo

Cambios requeridos:

- Usar PageHeader con título

- Cards de resumen con tokens correctos (bg-card, border-border)

- Números financieros con formato consistente

- Columna "Comprometidos" con color semántico (warning/amber)

- EmptyState cuando no hay cuentas activas

- Selector de cuenta consistente

3. Consolidado

Cambios requeridos:

- Usar PageHeader con título

- Tablas o cards de resumen con tokens

- Formato de moneda consistente

- EmptyState si aplica

- Navegación entre vistas (por cuenta, por negocio)

4. Utilidad formatCurrency

Verificar si existe una utilidad para formatear moneda. Si no, crear:

// src/lib/format.ts
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

Usar en todas las páginas donde se muestren montos.

Instrucciones de Git

git add .
git commit -m "feat(ui): normalize Arqueo and Consolidado pages"
git push https://x-access-token:$env:GITHUB_TOKEN@github.com/nhadadn/OneBusiness.git fase-11-design

Testing

- npm run build sin errores

- Verificar formato de moneda consistente

- Verificar que los números se ven correctamente

- Verificar empty states

Checkpoints de Evaluación

-  Checkpoint 1: Arqueo usa PageHeader y tokens correctos

-  Checkpoint 2: Consolidado usa PageHeader y tokens correctos

-  Checkpoint 3: formatCurrency implementado y usado

-  Checkpoint 4: Empty states implementados

-  Checkpoint 5: Build y lint pasan

-  Checkpoint 6: Commit y push exitosos

===========================

=== PROMPT 1.6.I === AGENTE ASIGNADO: Frontend (Performance/Data Fetching) TAREA: Centralizar data fetching con React Query, eliminar eventos globales

Contexto del Proyecto

Estás trabajando en OneBusiness. Actualmente hay fetches duplicados entre Header, Sidebar y páginas, y se usan eventos globales (window.dispatchEvent) para refrescos.

Branch de trabajo: fase-11-design

Estado Actual del Problema

- Header y Sidebar hacen fetches independientes:

- sidebar.tsx hace fetch a /api/movimientos/pendientes/count

- header.tsx puede hacer fetches propios

- Las páginas también hacen fetches

- Eventos globales:

- Se usa window.dispatchEvent(new CustomEvent('movimientoCreado')) para refrescar

- Esto es difícil de rastrear y testear

- React Query parcialmente implementado:

- Algunas páginas usan React Query

- Otras usan fetch manual

Requisitos

1. Analizar estado actual

ANTES de hacer cambios:

- Lee src/components/layout/sidebar.tsx y busca fetches

- Lee src/components/layout/header.tsx y busca fetches

- Busca window.dispatchEvent en el proyecto

- Busca useQuery existentes en el proyecto

2. Crear/actualizar hooks centralizados

Hook para negocios:

// src/hooks/use-negocios.ts (actualizar si existe)
export function useNegocios() {
  return useQuery({
    queryKey: ['negocios'],
    queryFn: () => apiFetch('/api/negocios').then(r => r.json()),
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
  });
}

Hook para pendientes count:

// src/hooks/use-pending-count.ts
export function usePendingCount() {
  return useQuery({
    queryKey: ['pendingCount'],
    queryFn: () => apiFetch('/api/movimientos/pendientes/count').then(r => r.json()),
    staleTime: 60 * 1000, // 1 minuto
    refetchOnWindowFocus: true, // Sí refetch al focus
  });
}

3. Actualizar Sidebar para usar hook

- Reemplazar fetch manual por usePendingCount()

- Eliminar estado local y useEffect

4. Actualizar Header si tiene fetches

- Reemplazar fetches manuales por hooks

5. Reemplazar eventos globales

- Buscar todos los window.dispatchEvent

- Reemplazar por queryClient.invalidateQueries({ queryKey: [...] })

- Ejemplo: después de crear movimiento, invalidar ['movimientos'] y ['pendingCount']

6. Configurar QueryClient

En src/app/(dashboard)/layout.tsx o en un provider, asegurar que el QueryClient tenga configuración razonable:

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

Instrucciones de Git

git add .
git commit -m "refactor: centralize data fetching with React Query, remove global events"
git push https://x-access-token:$env:GITHUB_TOKEN@github.com/nhadadn/OneBusiness.git fase-11-design

Testing

- npm run build sin errores

- Verificar Network tab: no hay fetches duplicados

- Crear un movimiento y verificar que la cuenta de pendientes se actualiza

- Verificar que no hay errores en consola

Checkpoints de Evaluación

-  Checkpoint 1: Hook usePendingCount creado/actualizado

-  Checkpoint 2: Sidebar usa hook en lugar de fetch manual

-  Checkpoint 3: Eventos globales eliminados

-  Checkpoint 4: invalidateQueries implementado correctamente

-  Checkpoint 5: Sin fetches duplicados en Network tab

-  Checkpoint 6: Build y lint pasan

-  Checkpoint 7: Commit y push exitosos

===========================

=== PROMPT 1.6.J === AGENTE ASIGNADO: Frontend (UI/UX) TAREA: Implementar skeletons y loading states consistentes

Contexto del Proyecto

Estás trabajando en OneBusiness. El prompt 1.6.C creó LoadingSkeleton. Ahora hay que implementarlo en todas las páginas.

Branch de trabajo: fase-11-design

Estado Actual del Problema

- Algunas páginas pueden no tener skeleton de carga

- Puede haber "flash" de contenido vacío antes de cargar datos

- Los estados de carga no son consistentes

Requisitos

1. Analizar estado actual

ANTES de hacer cambios:

- Revisa cada página principal:

- Dashboard

- Movimientos

- Negocios

- Cuentas Banco

- Categorías

- Arqueo

- Consolidado

- Para cada página, identifica:

- ¿Tiene estado de carga?

- ¿Muestra skeleton?

- ¿Hay flash de contenido vacío?

2. Implementar LoadingSkeleton en cada página

Para páginas con tablas:

// En el estado de carga
if (isLoading) {
  return <LoadingSkeleton variant="table" rows={5} />;
}

Para Dashboard con cards:

if (isLoading) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <LoadingSkeleton key={i} variant="card" />
      ))}
    </div>
  );
}

3. Crear Skeleton específicos si es necesario

Si el LoadingSkeleton del prompt 1.6.C no es suficiente, crear variantes específicas:

- TableSkeleton

- CardSkeleton

- ListSkeleton

4. Verificar que no hay flash

- El skeleton debe mostrarse inmediatamente

- No debe haber estado "vacio → skeleton → datos"

- Usar el estado isLoading de React Query correctamente

Instrucciones de Git

git add .
git commit -m "feat(ui): add consistent loading skeletons to all pages"
git push https://x-access-token:$env:GITHUB_TOKEN@github.com/nhadadn/OneBusiness.git fase-11-design

Testing

- npm run build sin errores

- Simular conexión lenta (DevTools → Network → Slow 3G)

- Verificar que los skeletons aparecen inmediatamente

- Verificar que no hay flash de contenido vacío

Checkpoints de Evaluación

-  Checkpoint 1: Dashboard tiene skeleton de carga

-  Checkpoint 2: Movimientos tiene skeleton de carga

-  Checkpoint 3: Negocios tiene skeleton de carga

-  Checkpoint 4: Cuentas Banco tiene skeleton de carga

-  Checkpoint 5: Arqueo tiene skeleton de carga

-  Checkpoint 6: Sin flash de contenido vacío

-  Checkpoint 7: Build y lint pasan

-  Checkpoint 8: Commit y push exitosos

===========================

=== PROMPT 1.6.K === AGENTE ASIGNADO: Frontend (Accesibilidad) TAREA: Implementar mejoras de accesibilidad WCAG AA

Contexto del Proyecto

Estás trabajando en OneBusiness. Este prompt se enfoca en accesibilidad.

Branch de trabajo: fase-11-design

Estado Actual del Problema

- Botones icon-only pueden no tener aria-label

- Focus visible puede no ser consistente

- Contraste de colores puede estar en el límite

- Tablas pueden no tener scope en headers

- Inputs pueden no tener labels asociados

Requisitos

1. Analizar estado actual

ANTES de hacer cambios:

- Ejecuta Lighthouse Accessibility audit (si es posible)

- Revisa componentes interactivos:

- Botones icon-only

- Inputs

- Selects

- Checkboxes

- Tabs

- Revisa tablas para scope

2. Botones icon-only

Cambios requeridos:

- Todo botón que solo tiene icono debe tener aria-label

- Ejemplos:

- Botón de editar: aria-label="Editar negocio"

- Botón de eliminar: aria-label="Eliminar negocio"

- Botón de menú: aria-label="Abrir menú"

<Button variant="ghost" size="icon" aria-label="Editar">
  <Pencil className="h-4 w-4" />
</Button>

3. Focus visible

Cambios requeridos:

- Verificar que todos los elementos interactivos tienen focus visible

- Usar focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2

- Verificar que el color de ring tiene suficiente contraste

4. Contraste de colores

Cambios requeridos:

- Verificar que text-muted-foreground tiene ratio ≥ 4.5:1 sobre fondos

- Si no, ajustar el valor del token

- Usar herramienta de contraste (ej: WebAIM Contrast Checker)

5. Tablas

Cambios requeridos:

- Todos los <th> deben tener scope="col" o scope="row"

- Ejemplo:

<TableHead scope="col">Nombre</TableHead>

6. Labels de inputs

Cambios requeridos:

- Todo input debe tener un label asociado

- Usar htmlFor en el label e id en el input

- O usar aria-label si el label es visual

7. Landmarks y estructura

Cambios requeridos:

- Verificar que hay landmarks semánticos: <main>, <nav>, <header>

- Agregar role si es necesario

- Títulos de página en <h1>

Instrucciones de Git

git add .
git commit -m "feat(a11y): implement WCAG AA accessibility improvements"
git push https://x-access-token:$env:GITHUB_TOKEN@github.com/nhadadn/OneBusiness.git fase-11-design

Testing

- npm run build sin errores

- Navegación por teclado completa (Tab, Enter, Escape)

- Lighthouse Accessibility score ≥ 90

- Verificar contraste con herramienta

- Probar con screen reader (opcional: NVDA, VoiceOver)

Checkpoints de Evaluación

-  Checkpoint 1: Todos los icon-only buttons tienen aria-label

-  Checkpoint 2: Focus visible en todos los elementos interactivos

-  Checkpoint 3: Contraste ≥ 4.5:1 verificado

-  Checkpoint 4: Tablas con scope en headers

-  Checkpoint 5: Inputs con labels asociados

-  Checkpoint 6: Lighthouse Accessibility ≥ 90

-  Checkpoint 7: Build y lint pasan

-  Checkpoint 8: Commit y push exitosos

===========================

=== PROMPT 1.6.L === AGENTE ASIGNADO: Frontend (Feature) TAREA: Instalar y configurar Driver.js para feature tours

Contexto del Proyecto

Estás trabajando en OneBusiness. Vamos a implementar una guía interactiva para usuarios nuevos.

Branch de trabajo: fase-11-design

Estado Actual del Problema

- No hay guía para usuarios nuevos

- El sistema puede ser confuso para usuarios que entran por primera vez

Requisitos

1. Instalar Driver.js

npm install driver.js

2. Crear hook useTour

Crear src/hooks/use-tour.ts:

Funcionalidad requerida:

- Acepta un tourId (nombre de la ruta, ej: "dashboard", "movimientos")

- Verifica si el tour ya fue completado (localStorage)

- Si no fue completado, retorna shouldShowTour: true

- Función markTourCompleted() para guardar en localStorage

- Función resetTour() para volver a mostrar (útil para testing)

Clave de localStorage: onebusiness_tour_${tourId}_completed

3. Crear componente FeatureTour

Crear src/components/shared/feature-tour.tsx:

Props:

- steps: Array de pasos del tour

- tourId: Identificador del tour

- onComplete: Callback cuando se completa

Funcionalidad:

- Usa Driver.js para mostrar el tour

- Se cierra con Escape o botón "Saltar"

- Guarda en localStorage cuando se completa

- Estilos consistentes con el design system

4. Crear provider o contexto (opcional)

Si es necesario para manejar estado global del tour.

5. Configurar estilos de Driver.js

- Traducir textos a español:

- "Siguiente" → "Siguiente"

- "Anterior" → "Anterior"

- "Done" → "Finalizar"

- "Close" → "Cerrar"

- Colores consistentes con design tokens

Instrucciones de Git

git add .
git commit -m "feat(tour): install Driver.js and create useTour hook and FeatureTour component"
git push https://x-access-token:$env:GITHUB_TOKEN@github.com/nhadadn/OneBusiness.git fase-11-design

Testing

- npm run build sin errores

- Verificar que Driver.js se importa correctamente

- Verificar que el hook funciona (puedes crear una página de prueba)

- Verificar que localStorage se lee/escribe correctamente

Checkpoints de Evaluación

-  Checkpoint 1: Driver.js instalado

-  Checkpoint 2: Hook useTour creado y funcional

-  Checkpoint 3: Componente FeatureTour creado

-  Checkpoint 4: LocalStorage funciona correctamente

-  Checkpoint 5: Build y lint pasan

-  Checkpoint 6: Commit y push exitosos

===========================

=== PROMPT 1.6.M === AGENTE ASIGNADO: Frontend (Feature) TAREA: Implementar tours guiados para cada pantalla principal

Contexto del Proyecto

Estás trabajando en OneBusiness. El prompt anterior (1.6.L) creó la infraestructura de tours. Ahora hay que implementar los tours específicos.

Branch de trabajo: fase-11-design

Tours a implementar

1. Dashboard (/ o /dashboard)

Pasos (4):

- "Bienvenido a OneBusiness" — Destacar todo el dashboard

- "Resumen de saldos" — Destacar cards de resumen

- "Movimientos pendientes" — Destacar widget de pendientes

- "Navegación" — Destacar sidebar

2. Movimientos (/movimientos)

Pasos (5):

- "Lista de movimientos" — Destacar tabla

- "Filtros de estado" — Destacar tabs de filtro

- "Crear movimiento" — Destacar botón "Nuevo"

- "Aprobar movimiento" — Destacar botón de aprobar en un row

- "Marcar como pagado" — Destacar botón de pagar

3. Negocios (/negocios)

Pasos (3):

- "Tus negocios" — Destacar tabla

- "Crear negocio" — Destacar botón "Nuevo"

- "Editar negocio" — Destacar botón de editar

4. Cuentas Banco (/configuracion/cuentas-banco)

Pasos (4):

- "Cuentas bancarias" — Destacar tabla

- "Crear cuenta" — Destacar botón "Nuevo"

- "Cuentas globales vs privadas" — Destacar badge de tipo

- "Asignar cuenta" — Destacar botón de asignar

5. Arqueo (/configuracion/arqueo)

Pasos (3):

- "Seleccionar cuenta" — Destacar selector

- "Tabla de arqueo" — Destacar tabla

- "Comprometidos" — Destacar columna de comprometidos

Requisitos

1. Crear archivos de configuración de tours

Crear src/lib/tours/ con un archivo por cada tour:

// src/lib/tours/dashboard-tour.ts
import { DriveStep } from 'driver.js';

export const dashboardTourSteps: DriveStep[] = [
  {
    element: '[data-tour="dashboard-summary"]',
    popover: {
      title: 'Resumen de saldos',
      description: 'Aquí ves el saldo total de todas tus cuentas.',
    },
  },
  // ... más pasos
];

2. Agregar data-tour attributes

En cada página, agregar data-tour="..." a los elementos que se deben destacar:

<Card data-tour="dashboard-summary">
  ...
</Card>

3. Integrar FeatureTour en cada página

// En cada página
const { shouldShowTour, markTourCompleted } = useTour('dashboard');

return (
  <>
    {shouldShowTour && (
      <FeatureTour
        tourId="dashboard"
        steps={dashboardTourSteps}
        onComplete={markTourCompleted}
      />
    )}
    {/* ... resto de la página */}
  </>
);

4. Botón "Ver tour de nuevo"

Agregar en cada página (puede ser en el PageHeader) un botón con icono ? que permite volver a ver el tour:

<Button
  variant="ghost"
  size="icon"
  aria-label="Ver guía"
  onClick={() => resetTour('dashboard')}
>
  <HelpCircle className="h-4 w-4" />
</Button>

5. Traducir textos de Driver.js

Asegurar que los botones estén en español:

- "Siguiente"

- "Anterior"

- "Finalizar"

- "Saltar"

Instrucciones de Git

git add .
git commit -m "feat(tour): implement feature tours for all main pages"
git push https://x-access-token:$env:GITHUB_TOKEN@github.com/nhadadn/OneBusiness.git fase-11-design

Testing

- npm run build sin errores

- Abrir cada página en una ventana de incógnito (localStorage limpio)

- Verificar que el tour se muestra automáticamente

- Completar el tour y verificar que no vuelve a aparecer

- Usar el botón "?" para volver a mostrar el tour

- Verificar que Escape cierra el tour

Checkpoints de Evaluación

-  Checkpoint 1: Tour de Dashboard implementado

-  Checkpoint 2: Tour de Movimientos implementado

-  Checkpoint 3: Tour de Negocios implementado

-  Checkpoint 4: Tour de Cuentas Banco implementado

-  Checkpoint 5: Tour de Arqueo implementado

-  Checkpoint 6: data-tour attributes agregados

-  Checkpoint 7: Botón "Ver guía" funcional

-  Checkpoint 8: Textos en español

-  Checkpoint 9: Build y lint pasan

-  Checkpoint 10: Commit y push exitosos

===========================

RESUMEN DE PROMPTS

 Prompt Tarea Agente Dependencias

 1.6.A Design Tokens + cn() Frontend UI -

 1.6.B Button + Badge normalizados Frontend UI 1.6.A

 1.6.C Card, Input, PageHeader, EmptyState, LoadingSkeleton Frontend UI 1.6.A

 1.6.D Navegación móvil Frontend Responsive 1.6.A

 1.6.E Tablas responsivas Frontend Responsive 1.6.C

 1.6.F Dashboard + Movimientos normalizados Frontend Pages 1.6.B, 1.6.C

 1.6.G Negocios + Cuentas + Categorías Frontend Pages 1.6.B, 1.6.C

 1.6.H Arqueo + Consolidado Frontend Pages 1.6.B, 1.6.C

 1.6.I React Query centralizado Frontend Perf -

 1.6.J Skeletons consistentes Frontend UX 1.6.C

 1.6.K Accesibilidad WCAG AA Frontend A11y 1.6.B

 1.6.L Driver.js setup Frontend Feature -

 1.6.M Tours por pantalla Frontend Feature 1.6.L, 1.6.F

Orden recomendado de ejecución:

- Semana 1 (Foundation): 1.6.A → 1.6.B → 1.6.C → 1.6.D

- Semana 2 (Pages): 1.6.E → 1.6.F → 1.6.G → 1.6.H

- Semana 2-3 (Quality): 1.6.I → 1.6.J → 1.6.K

- Semana 3 (Feature): 1.6.L → 1.6.M