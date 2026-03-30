---
name: "sk-11-vitest-testing-patterns"
description: "Patrones de testing con Vitest (unit e integration) en OneBusiness. Invocar al crear tests de API routes, mocks y criterios edge."
---

# SK-11 — Vitest Testing Patterns

## Cuándo invocarlo

- Al crear/actualizar tests en `tests/unit` y `tests/integration`.
- Al definir criterios de aceptación y casos edge obligatorios.

## Estructura de tests

- `tests/setup.ts`: configuración global, mocks
- `tests/helpers/db-helpers.ts`: helpers de datos
- `tests/helpers/auth-helpers.ts`: tokens por rol
- `tests/unit/`: funciones puras
- `tests/integration/`: API routes

## Casos edge obligatorios

1) Sin token → 401  
2) Token inválido → 401  
3) Rol sin permiso → 403  
4) Recurso no encontrado → 404  
5) Datos inválidos → 400  
6) Éxito → 200/201  

## Reglas

- Preferir tests de integración llamando handlers de route (cuando aplique).
- Mantener setup/cleanup claro por test suite.

