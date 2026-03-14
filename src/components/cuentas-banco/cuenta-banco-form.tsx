'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateCuentaBanco, useUpdateCuentaBanco } from '@/hooks/use-cuentas-banco';
import type { CuentaBancoListItem, CreateCuentaBancoData, UpdateCuentaBancoData } from '@/hooks/use-cuentas-banco';
import type { TipoCuenta } from '@/types/cuenta_banco.types';

const tiposCuenta: Array<{ value: TipoCuenta; label: string }> = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'BANCARIA', label: 'Bancaria' },
  { value: 'CAJA_CHICA', label: 'Caja chica' },
];

const createSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  tipo: z.enum(['EFECTIVO', 'BANCARIA', 'CAJA_CHICA']),
  bancoInstitucion: z.string().optional(),
  titular: z.string().optional(),
  saldoInicial: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().min(0).optional()),
});

const updateSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  tipo: z.enum(['EFECTIVO', 'BANCARIA', 'CAJA_CHICA']),
  bancoInstitucion: z.string().optional(),
  titular: z.string().optional(),
});

type CreateValues = z.infer<typeof createSchema>;
type UpdateValues = z.infer<typeof updateSchema>;

export type CuentaBancoFormProps = {
  negocioId: number | null;
  cuenta: CuentaBancoListItem | null;
  onSuccess: () => void;
};

export function CuentaBancoForm({ negocioId, cuenta, onSuccess }: CuentaBancoFormProps) {
  const isEditing = Boolean(cuenta?.id);

  const createCuenta = useCreateCuentaBanco({ negocioId });
  const updateCuenta = useUpdateCuentaBanco({ negocioId });

  const form = useForm<CreateValues | UpdateValues>({
    resolver: zodResolver(isEditing ? updateSchema : createSchema),
    defaultValues: isEditing
      ? {
          nombre: cuenta?.nombre ?? '',
          tipo: (cuenta?.tipo ?? 'EFECTIVO') as TipoCuenta,
          bancoInstitucion: cuenta?.bancoInstitucion ?? '',
          titular: cuenta?.titular ?? '',
        }
      : {
          nombre: '',
          tipo: 'EFECTIVO',
          bancoInstitucion: '',
          titular: '',
          saldoInicial: undefined,
        },
  });

  React.useEffect(() => {
    if (isEditing) {
      form.reset({
        nombre: cuenta?.nombre ?? '',
        tipo: (cuenta?.tipo ?? 'EFECTIVO') as TipoCuenta,
        bancoInstitucion: cuenta?.bancoInstitucion ?? '',
        titular: cuenta?.titular ?? '',
      });
      return;
    }

    form.reset({
      nombre: '',
      tipo: 'EFECTIVO',
      bancoInstitucion: '',
      titular: '',
      saldoInicial: undefined,
    });
  }, [cuenta, form, isEditing]);

  const isSubmitting = createCuenta.isPending || updateCuenta.isPending;

  const onSubmit = async (values: CreateValues | UpdateValues) => {
    try {
      if (typeof negocioId !== 'number') {
        throw new Error('Negocio requerido');
      }

      if (isEditing) {
        const payload: UpdateCuentaBancoData = {
          nombre: values.nombre,
          tipo: values.tipo as TipoCuenta,
          bancoInstitucion: values.bancoInstitucion?.trim() ? values.bancoInstitucion : undefined,
          titular: values.titular?.trim() ? values.titular : undefined,
        };

        await updateCuenta.mutateAsync({ id: cuenta!.id, data: payload });
        toast.success('Cuenta bancaria actualizada', { duration: 2500 });
        onSuccess();
        return;
      }

      const payload: CreateCuentaBancoData = {
        nombre: values.nombre,
        tipo: values.tipo as TipoCuenta,
        bancoInstitucion: values.bancoInstitucion?.trim() ? values.bancoInstitucion : undefined,
        titular: values.titular?.trim() ? values.titular : undefined,
        saldoInicial: (values as CreateValues).saldoInicial,
      };

      await createCuenta.mutateAsync(payload);
      toast.success('Cuenta bancaria creada', { duration: 2500 });
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la cuenta', { duration: 5000 });
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
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Caja chica, BBVA, Banorte..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tipo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <FormControl>
                <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposCuenta.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bancoInstitucion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Banco / Institución (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="BBVA, Banorte..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="titular"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titular (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Daniel, Irving..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isEditing && (
          <FormField
            control={form.control}
            name="saldoInicial"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Saldo inicial (opcional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={field.value === undefined ? '' : String(field.value)}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder="0.00"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar cuenta' : 'Crear cuenta'}
        </Button>
      </form>
    </Form>
  );
}
