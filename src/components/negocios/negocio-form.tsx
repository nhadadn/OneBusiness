'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useActualizarNegocio, useCrearNegocio, type NegocioCrudItem } from '@/hooks/use-negocios';

const formSchema = z
  .object({
    nombre: z.string().min(1, 'Nombre requerido').max(255, 'Máximo 255 caracteres').trim(),
    rubro: z.string().max(100, 'Máximo 100 caracteres').optional(),
    modeloIngreso: z.string().max(100, 'Máximo 100 caracteres').optional(),
    rfc: z.string().max(13, 'Máximo 13 caracteres').optional(),
    telefono: z.string().max(30, 'Máximo 30 caracteres').optional(),
    direccion: z.string().optional(),
    tieneSocios: z.boolean(),
    umbralAlerta: z
      .string()
      .optional()
      .refine((v) => v === undefined || v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0), 'Umbral inválido'),
    umbralCritico: z
      .string()
      .optional()
      .refine((v) => v === undefined || v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0), 'Umbral inválido'),
  })
  .refine(
    (data) => {
      if (!data.umbralAlerta || !data.umbralCritico) return true;
      const alerta = Number(data.umbralAlerta);
      const critico = Number(data.umbralCritico);
      if (!Number.isFinite(alerta) || !Number.isFinite(critico)) return true;
      return critico < alerta;
    },
    { message: 'Umbral crítico debe ser menor que umbral de alerta', path: ['umbralCritico'] }
  );

type FormValues = z.infer<typeof formSchema>;

export type NegocioFormProps = {
  negocio?: NegocioCrudItem;
  onSuccess: () => void;
};

function toFormValue(v: string | null | undefined) {
  return v ?? '';
}

export function NegocioForm({ negocio, onSuccess }: NegocioFormProps) {
  const isEditing = Boolean(negocio?.id);

  const crear = useCrearNegocio();
  const actualizar = useActualizarNegocio();

  const form = useForm<FormValues, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditing
      ? {
          nombre: negocio?.nombre ?? '',
          rubro: toFormValue(negocio?.rubro),
          modeloIngreso: toFormValue(negocio?.modeloIngreso),
          rfc: toFormValue(negocio?.rfc),
          telefono: toFormValue(negocio?.telefono),
          direccion: toFormValue(negocio?.direccion),
          tieneSocios: negocio?.tieneSocios ?? false,
          umbralAlerta: toFormValue(negocio?.umbralAlerta),
          umbralCritico: toFormValue(negocio?.umbralCritico),
        }
      : {
          nombre: '',
          rubro: '',
          modeloIngreso: '',
          rfc: '',
          telefono: '',
          direccion: '',
          tieneSocios: false,
          umbralAlerta: '',
          umbralCritico: '',
        },
  });

  React.useEffect(() => {
    if (isEditing) {
      form.reset({
        nombre: negocio?.nombre ?? '',
        rubro: toFormValue(negocio?.rubro),
        modeloIngreso: toFormValue(negocio?.modeloIngreso),
        rfc: toFormValue(negocio?.rfc),
        telefono: toFormValue(negocio?.telefono),
        direccion: toFormValue(negocio?.direccion),
        tieneSocios: negocio?.tieneSocios ?? false,
        umbralAlerta: toFormValue(negocio?.umbralAlerta),
        umbralCritico: toFormValue(negocio?.umbralCritico),
      });
      return;
    }

    form.reset({
      nombre: '',
      rubro: '',
      modeloIngreso: '',
      rfc: '',
      telefono: '',
      direccion: '',
      tieneSocios: false,
      umbralAlerta: '',
      umbralCritico: '',
    });
  }, [form, isEditing, negocio]);

  const isSubmitting = crear.isPending || actualizar.isPending;

  const onSubmit = async (values: FormValues) => {
    const payload = {
      nombre: values.nombre,
      rubro: values.rubro?.trim() ? values.rubro : undefined,
      modeloIngreso: values.modeloIngreso?.trim() ? values.modeloIngreso : undefined,
      rfc: values.rfc?.trim() ? values.rfc : undefined,
      telefono: values.telefono?.trim() ? values.telefono : undefined,
      direccion: values.direccion?.trim() ? values.direccion : undefined,
      tieneSocios: Boolean(values.tieneSocios),
      umbralAlerta: values.umbralAlerta?.trim() ? Number(values.umbralAlerta) : null,
      umbralCritico: values.umbralCritico?.trim() ? Number(values.umbralCritico) : null,
    };

    if (isEditing) {
      await actualizar.mutateAsync({ id: negocio!.id, data: payload });
      onSuccess();
      return;
    }

    await crear.mutateAsync(payload);
    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Nombre del negocio" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rubro"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rubro (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Transporte, Restaurante..." {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="modeloIngreso"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Modelo de ingreso (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Taxi, Mixto, Arrendamiento..." {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rfc"
          render={({ field }) => (
            <FormItem>
              <FormLabel>RFC (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="XAXX010101000" {...field} disabled={isSubmitting} maxLength={13} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="telefono"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="+52..." {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="direccion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección (opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Dirección completa" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tieneSocios"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tiene socios</FormLabel>
              <FormControl>
                <div className="flex items-start gap-3 rounded-md border border-slate-200 p-3">
                  <Checkbox checked={Boolean(field.value)} onCheckedChange={(v) => field.onChange(v === true)} disabled={isSubmitting} />
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-slate-900">Este negocio tiene socios</div>
                    <div className="text-xs text-slate-600">Activa lógica relacionada a socios en algunos módulos.</div>
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="umbralAlerta"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Umbral de alerta ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min={0} placeholder="0.00" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="umbralCritico"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Umbral crítico ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min={0} placeholder="0.00" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear negocio'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

