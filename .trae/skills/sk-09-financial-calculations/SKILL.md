---
name: "sk-09-financial-calculations"
description: "Cálculos financieros (saldos, arqueo, traspasos). Invocar al tocar montos NUMERIC, saldos, métricas de dashboard o movimientos espejo."
---

# SK-09 — Financial Calculations

## Cuándo invocarlo

- Al calcular saldos o métricas del dashboard.
- Al implementar traspasos (doble movimiento).
- Al corregir bugs por montos NUMERIC tratados como string.

## Regla fundamental

- Postgres `NUMERIC` llega como `string` en JS → usar `parseFloat()`. Nunca `parseInt()`.

## Fórmula de saldo calculado

El saldo calculado se deriva de:

- `saldoInicial`
- + ingresos aprobados
- + traspasos entrada aprobados
- - egresos aprobados
- - traspasos salida aprobados

CRÍTICO: Solo `estado = 'APROBADO'` afecta el saldo.

## Estado de arqueo

- `SIN_SALDO_REAL` si no hay saldo real
- `CUADRADO` si diferencia <= tolerancia (0.01)
- `SOBRANTE` si saldoReal > saldoCalculado
- `FALTANTE` si saldoReal < saldoCalculado

## Traspasos

- Siempre crear 2 movimientos en una transacción:
  - `TRASPASO_SALIDA` (origen)
  - `TRASPASO_ENTRADA` (destino)
- Ambos vinculados por self-reference (`traspasoRefId`)

