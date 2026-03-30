---
name: "sk-06-typescript-strict-enforcer"
description: "Convenciones TS strict en OneBusiness. Invocar al corregir tipos, null/undefined, Decimal-string y antes de integrar cambios grandes."
---

# SK-06 — TypeScript Strict Enforcer

## Cuándo invocarlo

- Al encontrar errores de TypeScript strict (`possibly undefined`, tipos incompatibles).
- Al operar con montos NUMERIC (string) provenientes de DB.
- Antes de finalizar un cambio grande para asegurar consistencia de tipos.

## Reglas prácticas

- `NUMERIC` de Postgres llega como `string` → operar con `parseFloat()`.
- Destructuring de arrays de DB puede devolver `undefined` → checar `if (!registro)`.
- Tipos puros: `import type`.
- `apiFetch` siempre tipado: `apiFetch<T>()`.

## Errores comunes (patrones)

1) Possibly undefined
```ts
const nombre = usuario?.nombre?.toUpperCase() ?? '';
```

2) Suma de strings
```ts
const total = parseFloat(cuenta.saldoInicial) + parseFloat(movimiento.monto);
```

3) Resultado DB no encontrado
```ts
const [registro] = await db.select().from(tabla).limit(1);
if (!registro) return null;
```

