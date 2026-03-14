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
});

const updateSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres').trim().optional(),
  activa: z.boolean().optional(),
});

type CreateValues = z.infer<typeof createSchema>;
type UpdateValues = z.infer<typeof updateSchema>;

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

  const form = useForm<CreateValues | UpdateValues>({
    resolver: zodResolver(isEditing ? updateSchema : createSchema),
    defaultValues: isEditing
      ? {
          nombre: categoria?.nombre ?? '',
        }
      : {
          nombre: '',
          tipo: 'ingreso',
          esGlobal: false,
        },
  });

  React.useEffect(() => {
    if (isEditing) {
      form.reset({ nombre: categoria?.nombre ?? '' });
      return;
    }
    form.reset({ nombre: '', tipo: 'ingreso', esGlobal: false });
  }, [categoria, form, isEditing]);

  const mutation = useMutation({
    mutationFn: async (values: CreateValues | UpdateValues) => {
      if (isEditing) {
        const updateValues = values as UpdateValues;
        const payload: UpdateValues = {};
        if (typeof updateValues.nombre === 'string') payload.nombre = updateValues.nombre;
        if (typeof updateValues.activa === 'boolean') payload.activa = updateValues.activa;

        return apiFetch<ApiResponse<Categoria>>(`/api/categorias/${categoria!.id}`, {
          method: 'PUT',
          negocioId,
          body: payload,
        });
      }

      const payload: CategoriaFormData = {
        nombre: (values as CreateValues).nombre,
        tipo: (values as CreateValues).tipo,
        esGlobal: rol === 'Dueño' ? (values as CreateValues).esGlobal : undefined,
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

  const onSubmit = async (values: CreateValues | UpdateValues) => {
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
            <div className="text-sm font-medium text-slate-700">Tipo</div>
            <div className="text-sm text-slate-600">{toUiTipo(categoria!.tipo) === 'ingreso' ? 'Ingreso' : 'Egreso'}</div>
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
