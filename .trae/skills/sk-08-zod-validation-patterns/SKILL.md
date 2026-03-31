---
name: "sk-08-zod-validation-patterns"
description: "Patrones Zod en API routes y formularios. Invocar al validar query/body/params o al integrar React Hook Form con zodResolver."
---

# SK-08 — Zod Validation Patterns

## Cuándo invocarlo

- Al implementar endpoints (query/body/params).
- Al implementar formularios con React Hook Form.
- Al estandarizar respuestas 400 con details.

## Zod en API routes

- Preferir `safeParse` para no lanzar excepción y responder 400 controlado.
- Fechas: `YYYY-MM-DD` con regex.
- Números en query: `z.coerce.number()` o preprocess.

Ejemplo:
```ts
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  fechaDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const validation = createSchema.safeParse(body);
if (!validation.success) {
  return NextResponse.json(
    { success: false, error: 'Datos inválidos', details: validation.error.flatten() },
    { status: 400 }
  );
}
```

## Zod en formularios (React Hook Form)

```ts
const formSchema = z.object({
  monto: z.coerce.number().positive('El monto debe ser mayor a 0'),
  cuentaBancoId: z.coerce.number().int().positive('Selecciona una cuenta'),
});

type FormValues = z.infer<typeof formSchema>;
```

## Patrones comunes

- `z.coerce.number()` para inputs numéricos en forms.
- `.transform(v => v || undefined)` para opcionales que pueden venir como string vacío.

