---
name: "sk-14-anti-duplication-auditor"
description: "Auditor anti-duplicación (hooks, utils, endpoints, componentes). Invocar antes de crear archivos nuevos o al refactorizar para evitar duplicados."
---

# SK-14 — Anti-Duplication Auditor

## Cuándo invocarlo

- Antes de crear un hook/componente/service/util nuevo.
- Cuando el prompt pide “agregar X” y ya existe algo similar.
- Al detectar lógica repetida entre módulos (movimientos/cotizaciones/etc.).

## Reglas del proyecto

- No crear un hook si ya existe uno similar: extender el existente.
- No redefinir helpers de `src/lib/utils.ts` (`formatCurrencyMXN`, `parseMoney`, `formatDateDMY`, `cn`).
- Verificar nombre exacto de hook antes de importarlo.

## Checklist rápido (antes de crear algo nuevo)

1) Buscar si ya existe en `src/hooks/`, `src/components/`, `src/services/`.
2) Preferir agregar una función/export nuevo en el archivo existente.
3) Si es endpoint, confirmar si ya existe ruta en `src/app/api/**`.
4) Reusar patrones de `apiFetch` y queryKeys.

## Señales de duplicación a corregir

- Mismo queryKey con shape distinto.
- Dos helpers diferentes para formato de moneda/fecha.
- Dos hooks que llaman al mismo endpoint con firmas distintas.
- Dos componentes con misma UI y pequeñas variaciones (preferir props).

