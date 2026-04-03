# Auditoría UI/UX — OneBusiness (Frontend)

Fecha: 2026-04-01  
Scope: Dashboard (Next.js App Router) + componentes UI compartidos

## 1) Resumen ejecutivo

El proyecto tiene una base sólida: navegación clara por módulos (sidebar + header), uso consistente de layouts tipo “panel”, y formularios ya estandarizados con React Hook Form + Zod. Sin embargo, la UI presenta inconsistencias visuales y de interacción que reducen legibilidad y confianza, especialmente en acciones primarias (ej. “Nuevo movimiento”), tablas y estados.

Las causas raíz más repetidas:

- Mezcla de “design tokens” (`bg-primary`, `border-border`) con colores hardcodeados (`bg-[#1e3a5f]`, `border-slate-200`).
- Utilidad `cn()` sin deduplicación/merge de clases Tailwind, lo que deja conflictos silenciosos y resultados no deterministas.
- Patrones de data-fetching dispersos (header/sidebar usan `fetch` manual; páginas usan React Query), generando refetches extra y estados de carga inconsistentes.
- Responsive: el sidebar está oculto en < `md`, lo que deja navegación incompleta en móvil.

## 2) Arquitectura Frontend (estado actual)

**Stack**

- Next.js 14 (App Router) con muchas páginas en Client Components (`'use client'`).
- TanStack React Query v5 para server state en varias pantallas.
- shadcn/ui “adaptado” (componentes `src/components/ui/*`) + Tailwind.
- Auth client-side (refresh al montar) con token en memoria y cookie “marca de sesión”.

**Rutas y layout**

- Layout principal: `DashboardShell` (sidebar + header + main) y `DashboardGuard` con loading inicial.
- Acciones “Nuevo movimiento / traspaso” en Header; el formulario se abre en un Sheet lateral.

**Riesgos**

- El “loading gate” de auth client-side penaliza el tiempo-to-interactive (T0→T1 depende de `/api/auth/refresh`).
- La UI usa eventos globales (`window.dispatchEvent`) para refrescos; funciona, pero complica trazabilidad y testing.

## 3) Revisión de UI Components (design system)

**Observación principal**

En `src/components/ui/` hay componentes base que mezclan:

- Tokens del theme (ej. `bg-primary`, `text-primary-foreground`, `border-border`)
- Colores directos (ej. `bg-[#1e3a5f]`, `border-slate-200`, `text-slate-600`)

Esto produce inconsistencias y hace más difícil implementar dark-mode o variantes coherentes.

**Ejemplo real**

- `Button` define `default` con `bg-[#1e3a5f]`, pero otras pantallas usan `bg-primary` (CSS variables). Cuando se combinan variantes + className, quedan clases conflictivas.

**Recomendación**

- Estándar único: tokens (`primary/secondary/muted/accent/border/card`) y variantes consistentes.
- Actualizar `cn()` para resolver conflictos de Tailwind (ver plan).

## 4) Patrones de diseño e interacción

**Patrones positivos**

- Tablas con estados (loading/error/empty/data) ya presentes en varias pantallas.
- Dialogs destructivos y confirmaciones presentes.
- Estados de movimientos con badges (mapeo por estado).

**Inconsistencias detectadas**

- Acciones primarias a veces usan `variant="ghost"` + `className` para “parecer primario”. Esto rompe consistencia y legibilidad.
- Textos móviles reducidos en exceso: “Nuevo” no indica qué se crea (movimiento vs otra cosa).
- Tablas mezclan `bg-white border-slate-200` con `bg-card border-border`, rompiendo jerarquía visual.

## 5) Responsive y multi-dispositivo

**Estado actual**

- Sidebar oculto en < `md` (`hidden md:flex`). En móviles se pierde navegación principal.
- Botones con labels responsive (span hidden/sm) existen, pero no siempre comunican suficiente.

**Recomendación**

- Implementar navegación móvil: header con menú (Sheet/Drawer) o bottom nav para módulos principales.
- Revisar targets táctiles: tamaño mínimo 44px, espaciado en acciones en tablas.

## 6) Rendimiento percibido (UI)

**Hallazgos**

- Header y Sidebar ejecutan fetches independientes (negocios, pendientes) que pueden duplicarse con otras pantallas.
- Re-renders y refetches disparados por eventos y por cambios de pathname.

**Recomendaciones**

- Centralizar queries en React Query (negocios, pendingCount) con `staleTime` razonable y `refetchOnWindowFocus` controlado.
- Añadir skeletons consistentes para “primera carga” y “refetch”.
- Medir: instrumentar timings (TTFB, hydration, time-to-data) en dashboard y movimientos.

## 7) Accesibilidad (a11y) y estándares

**Hallazgos**

- Varias acciones solo muestran iconos (necesitan `aria-label` consistente).
- Inputs tipo `date` dependen del navegador (Safari/Android varía UX).
- Contraste: algunos textos `text-slate-600` sobre fondos claros pueden quedar cerca del límite en pantallas con brillo bajo.

**Recomendaciones**

- Checklist WCAG AA mínimo: contraste, foco visible, navegación por teclado, labels/aria.
- Estandarizar `aria-label` en botones icon-only y controles colapsados.

## 8) Hallazgos priorizados (qué arreglar primero)

### P0 — Bloqueantes de UX (1–3 días)

- Acciones primarias: estandarizar “primary button” (sin overrides conflictivos).
- Navegación móvil mínima (menu/Sheet) o, si el producto no soporta móvil, mostrar aviso claro y layout estable.
- Consolidar estilos base de componentes críticos: Button, Badge, Card, Table containers.

### P1 — Mejora fuerte de consistencia (1–2 semanas)

- Reemplazar `cn()` por una versión con merge de Tailwind para eliminar conflictos.
- Migrar componentes UI a tokens (eliminar colores hardcodeados) y unificar bordes/fondos (`border-border`, `bg-card`, `text-foreground`).
- Definir “densidad” para tablas (compacta vs cómoda) para usuarios tipo Excel.

### P2 — Optimización avanzada (2–4 semanas)

- Reducir “loading gate” de auth con enfoque server-first (si el modelo de auth lo permite).
- Refactor de eventos globales a invalidación de queries / estado controlado.
- Auditoría completa de Core Web Vitals y mejoras (split de bundles, RSC en páginas de lectura).

## 9) Plan de acción sugerido (entregables)

1) **Design tokens y componentes base**
   - Unificar Button/Badge/Card/Table a tokens.
   - Definir variantes: primary, secondary, outline, ghost, destructive.

2) **Patrones de interacción**
   - Acciones primarias: un solo patrón de estilo y copy.
   - Confirmaciones destructivas: AlertDialog con copy uniforme.

3) **Responsive**
   - Navegación móvil (mínimo viable).
   - Revisar labels cortos + tooltips para acciones.

4) **Rendimiento**
   - Centralizar data-fetching en React Query: negocios, pendingCount, métricas.
   - StaleTime, cacheTime, y refetch policies definidos por tipo de dato.

5) **Accesibilidad**
   - Checklist WCAG AA + “keyboard-first” para usuarios de Excel.
   - Auditoría con Lighthouse + revisión manual de foco.

