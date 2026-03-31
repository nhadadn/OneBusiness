---
name: "sk-02-drizzle-orm-database-schema"
description: "Guía Drizzle + schema OneBusiness. Invocar al tocar DB: tablas, enums, queries, migraciones, transacciones e índices."
---

# SK-02 — Drizzle ORM & Database Schema

## Cuándo invocarlo

- Al crear/modificar tablas, enums, índices o migraciones.
- Al escribir queries Drizzle (select/join/paginación).
- Al depurar errores de DB (columnas faltantes, enums, joins).

## Archivos fuente de verdad

- Schema principal: `src/lib/drizzle.ts`
- Conexión: `src/lib/db.ts` (importar `db` desde aquí)

## Enums definidos (referencia)

- `rolEnum`: `Dueño | Admin | Socio | Externo`
- `tipoMovimientoEnum`: `INGRESO | EGRESO | TRASPASO_SALIDA | TRASPASO_ENTRADA`
- `estadoMovimientoEnum`: `PENDIENTE | APROBADO | RECHAZADO`
- `tipoCuentaEnum`: `EFECTIVO | BANCARIA | CAJA_CHICA`
- `tipoCategoriaEnum`: `INGRESO | EGRESO`
- `estadoCotizacionEnum`: `BORRADOR | ENVIADA | APROBADA | FACTURADA | CANCELADA`

## Tablas y campos (resumen)

- `usuarios`: id, nombre, email, passwordHash, rol, activo, createdAt, updatedAt
- `negocios`: id, nombre, descripcion, activo, createdAt, updatedAt
- `usuarioNegocio`: id, usuarioId, negocioId, rol, activo
- `cuentasBanco`: id, nombre, tipo, bancoInstitucion?, titular?, negocioId, saldoInicial, saldoReal?, fechaSaldoReal?, activo, createdAt, updatedAt
- `categorias`: id, nombre, tipo, negocioId? (null=global), activa, createdAt, updatedAt
- `centrosCosto`: id, nombre, codigo?, negocioId, activo
- `movimientos`: ver archivo (incluye self-reference `traspasoRefId`, estado, categoriaId, audit fields)
- `cotizaciones` / `cotizacionItems`: ver archivo

## Importaciones correctas

```ts
import { db } from '@/lib/db';
import {
  usuarios,
  negocios,
  usuarioNegocio,
  cuentasBanco,
  categorias,
  centrosCosto,
  movimientos,
  cotizaciones,
  cotizacionItems,
} from '@/lib/drizzle';
import {
  eq,
  and,
  or,
  gte,
  lte,
  like,
  ilike,
  inArray,
  isNull,
  isNotNull,
  desc,
  asc,
  sql,
  count,
  sum,
} from 'drizzle-orm';
```

## Patrones de query

**Select básico**
```ts
await db
  .select()
  .from(movimientos)
  .where(and(eq(movimientos.negocioId, negocioId), eq(movimientos.activo, true)))
  .orderBy(desc(movimientos.createdAt));
```

**Join**
```ts
await db
  .select({
    movimiento: movimientos,
    cuenta: { nombre: cuentasBanco.nombre },
  })
  .from(movimientos)
  .leftJoin(cuentasBanco, eq(movimientos.cuentaBancoId, cuentasBanco.id))
  .where(eq(movimientos.negocioId, negocioId));
```

**Transacción (obligatoria)**
```ts
await db.transaction(async (tx) => {
  const [mov1] = await tx.insert(movimientos).values({ ... }).returning();
  const [mov2] = await tx.insert(movimientos).values({ traspasoRefId: mov1.id, ... }).returning();
  return { mov1, mov2 };
});
```

**Paginación**
```ts
const [items, [{ total }]] = await Promise.all([
  db.select().from(movimientos).where(conditions).limit(limit).offset((page - 1) * limit),
  db.select({ total: count() }).from(movimientos).where(conditions),
]);
```

## Migraciones (reglas)

- No modificar migraciones ya aplicadas.
- Campos nuevos en tablas con datos existentes: preferir nullable.
- Agregar índices para campos usados frecuentemente en WHERE.
- Flujo: editar `drizzle.ts` → `npm run db:generate` → `npm run db:migrate` → `npm run build`.

