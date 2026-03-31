---
name: "sk-04-react-query-custom-hooks"
description: "Patrones de React Query v5 y hooks del proyecto. Invocar al crear/editar hooks en src/hooks o al consumir APIs desde frontend."
---

# SK-04 — React Query & Custom Hooks

## Cuándo invocarlo

- Al crear/editar hooks en `src/hooks/`.
- Antes de crear un hook nuevo (verificar si ya existe).
- Al corregir invalidación de caché o queryKeys.

## Reglas clave

- Cada hook file comienza con `'use client';`
- No usar `fetch()` directo: usar `apiFetch` (`src/lib/api-client.ts`).
- `enabled`: usar `typeof negocioId === 'number'` (NO `!!negocioId`).
- Invalidar queries relevantes en `onSuccess`.

## Hooks existentes (no duplicar)

- `use-auth.ts`: `useAuth()`
- `use-negocios.ts`: `useNegocios()`, `useNegocio(id)`, `useCreateNegocio()`, `useUpdateNegocio()`, `useDeleteNegocio()`
- `use-movimientos.ts`: `useMovimientos(filters)`, `useMovimiento(id)`, `useCreateMovimiento()`, `useUpdateMovimiento()`, `useDeleteMovimiento()`, `useAprobarMovimiento()`, `useRechazarMovimiento()`, `useReenviarMovimiento()`, `useMovimientosPendientes()`
- `use-cuentas-banco.ts`: `useCuentasBanco({ negocioId })`, `useCuentaBanco(id)`, `useCreateCuentaBanco()`, `useUpdateCuentaBanco()`, `useDeleteCuentaBanco()`, `useUpdateSaldoReal()`
- `use-categorias.ts`: `useCategorias({ negocioId })`, `useCreateCategoria()`, `useUpdateCategoria()`, `useDeleteCategoria()`
- `use-cotizaciones.ts`: `useCotizaciones(params)`, `useCotizacion(id)`, `useCreateCotizacion()`, `useUpdateCotizacion()`, `useDeleteCotizacion()`, `useActualizarEstadoCotizacion()` (nombre exacto)
- `use-usuarios.ts`: `useUsuarios()`, `useUsuario(id)`, `useCreateUsuario()`, `useUpdateUsuario()`, `useDeleteUsuario()`

## Firma de apiFetch (referencia)

```ts
apiFetch<T>(
  url: string,
  options?: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
    negocioId?: number;
    body?: unknown;
  }
): Promise<T>
```

## Convención de query keys

- Lista: `['recurso', negocioId]`
- Detalle: `['recurso', id]`
- Con filtros: `['recurso', negocioId, { ...filtros }]`
- Global: `['recurso']`

