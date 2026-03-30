---
name: "sk-10-shadcn-ui-component-library"
description: "Uso de shadcn/ui y patrones UI (tabla, dialogs, badges, toasts). Invocar al crear UI nueva o estandarizar UX de listas/acciones."
---

# SK-10 — shadcn/ui Component Library

## Cuándo invocarlo

- Al crear UI nueva en el dashboard.
- Al estandarizar tablas, paginación, badges de estado y confirmaciones destructivas.
- Al implementar notificaciones (toasts).

## Notificaciones (crítico)

✅ Correcto:
```ts
import { useToast } from '@/components/ui/use-toast';
const { toast } = useToast();
toast({ title: 'Éxito', description: 'Operación completada' });
```

❌ Incorrecto:
- `sonner`
- `react-hot-toast`
- `react-toastify`

## Patrón de tabla (estados)

Orden obligatorio:
1) Sin negocio → “Selecciona un negocio”  
2) Loading → skeleton/spinner  
3) Error → mensaje + retry  
4) Vacío → “No hay registros”  
5) Con datos → tabla + paginación

## AlertDialog (confirmación destructiva)

- Usar `AlertDialog` para eliminar/cancelar.
- Deshabilitar botones mientras `isPending`.

## Badge de estado (estilos)

- Mapear estilos por estado y renderizar `Badge`.

## Paginación estándar

- Mostrar “Página X de Y”
- Botones “Anterior/Siguiente” con disabled correcto

