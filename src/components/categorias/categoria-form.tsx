'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiFetch } from '@/lib/api-client';
import type { Categoria, CategoriaFormData, TipoCategoria } from '@/types/categoria.types';

const tipoOptions: Array<{ value: TipoCategoria; label: string }> = [
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'egreso', label: 'Egreso' },
];

function toUiTipo(tipo: Categoria['tipo']): TipoCategoria {
  const lower = String(tipo).toLowerCase();
  return lower === 'ingreso' ? 'ingreso' : 'egreso';
}

const createSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres').trim(),
  tipo: z.enum(['ingreso', 'egreso'], { message: 'Tipo debe ser ingreso o egreso' }),
  esGlobal: z.boolean().optional(),
  requiereAprobacion: z.boolean(),
  montoMaxSinAprobacion: z.string().optional(),
});

type FormValues = z.infer<typeof createSchema>;

type ApiResponse<T> = { success: boolean; data: T };

export type CategoriaFormProps = {
  categoria?: Categoria | null;
  negocioId: number;
  rol: string;
  onExito: () => void;
  onCancelar: () => void;
};

export function CategoriaForm({ categoria, negocioId, rol, onExito, onCancelar }: CategoriaFormProps) {
  const isEditing = Boolean(categoria?.id);
  const queryClient = useQueryClient();

  const form = useForm<FormValues, unknown, FormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: isEditing
      ? {
          nombre: categoria?.nombre ?? '',
          tipo: toUiTipo(categoria!.tipo),
          esGlobal: false,
          requiereAprobacion: categoria?.requiereAprobacion ?? true,
          montoMaxSinAprobacion: categoria?.montoMaxSinAprobacion ?? '',
        }
      : {
          nombre: '',
          tipo: 'ingreso',
          esGlobal: false,
          requiereAprobacion: true,
          montoMaxSinAprobacion: '',
        },
  });

  React.useEffect(() => {
    if (isEditing) {
      form.reset({
        nombre: categoria?.nombre ?? '',
        tipo: toUiTipo(categoria!.tipo),
        esGlobal: false,
        requiereAprobacion: categoria?.requiereAprobacion ?? true,
        montoMaxSinAprobacion: categoria?.montoMaxSinAprobacion ?? '',
      });
      return;
    }
    form.reset({ nombre: '', tipo: 'ingreso', esGlobal: false, requiereAprobacion: true, montoMaxSinAprobacion: '' });
  }, [categoria, form, isEditing]);

  const requiereAprobacion = form.watch('requiereAprobacion');

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isEditing) {
        const payload: Record<string, unknown> = {};
        payload.nombre = values.nombre;
        payload.requiereAprobacion = values.requiereAprobacion;
        payload.montoMaxSinAprobacion = values.requiereAprobacion
          ? values.montoMaxSinAprobacion?.trim()
            ? values.montoMaxSinAprobacion
            : null
          : null;

        return apiFetch<ApiResponse<Categoria>>(`/api/categorias/${categoria!.id}`, {
          method: 'PUT',
          negocioId,
          body: payload,
        });
      }

      const payload: CategoriaFormData = {
        nombre: values.nombre,
        tipo: values.tipo,
        esGlobal: rol === 'Dueño' ? values.esGlobal : undefined,
        requiereAprobacion: values.requiereAprobacion,
        montoMaxSinAprobacion: values.requiereAprobacion
          ? values.montoMaxSinAprobacion?.trim()
            ? values.montoMaxSinAprobacion
            : null
          : null,
      };

      return apiFetch<ApiResponse<Categoria>>('/api/categorias', {
        method: 'POST',
        negocioId,
        body: payload,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categorias'] });
      toast.success(isEditing ? 'Categoría actualizada' : 'Categoría creada', { duration: 2500 });
      onExito();
    },
  });

  const errorMessage = mutation.error instanceof Error ? mutation.error.message : null;
  const uiError = React.useMemo(() => {
    if (!errorMessage) return null;
    if (errorMessage.includes('Ya existe')) return 'Ya existe una categoría con ese nombre';
    if (errorMessage.includes('Sin permisos') || errorMessage.includes('Solo el Dueño')) return 'Sin permisos para esta acción';
    return errorMessage;
  }, [errorMessage]);

  const onSubmit = async (values: FormValues) => {
    try {
      await mutation.mutateAsync(values);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la categoría', { duration: 5000 });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="categoria-nombre">Nombre</FormLabel>
              <FormControl>
                <Input id="categoria-nombre" placeholder="Ventas, Renta, Nómina..." disabled={mutation.isPending} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isEditing ? (
          <FormField
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <FormControl>
                  <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={mutation.isPending}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tipoOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground">Tipo</div>
            <div className="text-sm text-muted-foreground">{toUiTipo(categoria!.tipo) === 'ingreso' ? 'Ingreso' : 'Egreso'}</div>
          </div>
        )}

        {!isEditing && rol === 'Dueño' ? (
          <FormField
            control={form.control}
            name="esGlobal"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <Checkbox checked={Boolean(field.value)} onCheckedChange={(v) => field.onChange(Boolean(v))} />
                  <FormLabel className="mb-0">Categoría global (visible para todos los negocios)</FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        <div className="space-y-2 rounded-lg border border-border bg-card p-4">
          <div className="text-sm font-medium text-foreground">Configuración de aprobación</div>

          <FormField
            control={form.control}
            name="requiereAprobacion"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={Boolean(field.value)}
                    onCheckedChange={(v) => {
                      const next = v === true;
                      field.onChange(next);
                      if (!next) {
                        form.setValue('montoMaxSinAprobacion', '', { shouldValidate: true });
                      }
                    }}
                    disabled={mutation.isPending}
                  />
                  <FormLabel className="mb-0">Requiere aprobación</FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {requiereAprobacion ? (
            <FormField
              control={form.control}
              name="montoMaxSinAprobacion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto máximo sin aprobación (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder="0.00"
                      disabled={mutation.isPending}
                    />
                  </FormControl>
                  <div className="text-xs text-muted-foreground">Movimientos por debajo de este monto se aprobarán automáticamente</div>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
        </div>

        {uiError ? <div className="text-sm text-red-600">{uiError}</div> : null}

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="w-full" onClick={onCancelar} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear categoría'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
