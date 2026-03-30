'use client';

// Decisión UI: se usan checkboxes directos para selección múltiple de negocios (lista corta), evitando crear un componente MultiSelect nuevo.

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { useCreateCuentaBanco, useUpdateCuentaBanco } from '@/hooks/use-cuentas-banco';
import { useNegocios } from '@/hooks/use-negocios';
import type { CuentaBancoListItem, CreateCuentaBancoData, UpdateCuentaBancoData } from '@/hooks/use-cuentas-banco';
import type { TipoCuenta } from '@/types/cuenta_banco.types';

const tiposCuenta: Array<{ value: TipoCuenta; label: string }> = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'BANCARIA', label: 'Bancaria' },
  { value: 'CAJA_CHICA', label: 'Caja chica' },
];

const formSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  tipo: z.enum(['EFECTIVO', 'BANCARIA', 'CAJA_CHICA']),
  bancoInstitucion: z.string().optional(),
  titular: z.string().optional(),
  esGlobal: z.boolean(),
  negociosCompartidos: z.array(z.number().positive()),
  saldoInicial: z
    .string()
    .optional()
    .refine((v) => v === undefined || v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0), 'Saldo inicial inválido'),
});

type FormValues = z.infer<typeof formSchema>;

export type CuentaBancoFormProps = {
  negocioId: number | null;
  cuenta: CuentaBancoListItem | null;
  onSuccess: () => void;
};

export function CuentaBancoForm({ negocioId, cuenta, onSuccess }: CuentaBancoFormProps) {
  const isEditing = Boolean(cuenta?.id);
  const { user } = useAuth();
  const isOwner = user?.rol === 'Dueño';

  const createCuenta = useCreateCuentaBanco({ negocioId });
  const updateCuenta = useUpdateCuentaBanco({ negocioId });

  const negociosQuery = useNegocios({ enabled: true });
  const negocios = negociosQuery.data?.data ?? [];

  const initialNegociosSeleccionados = React.useMemo(() => {
    if (!cuenta) {
      return typeof negocioId === 'number' ? [negocioId] : [];
    }
    if (cuenta.esGlobal) {
      return [];
    }
    const ids = new Set<number>();
    if (typeof cuenta.negocioId === 'number') {
      ids.add(cuenta.negocioId);
    }
    for (const rel of cuenta.negociosCompartidos ?? []) {
      ids.add(rel.negocioId);
    }
    if (ids.size === 0 && typeof negocioId === 'number') {
      ids.add(negocioId);
    }
    return Array.from(ids);
  }, [cuenta, negocioId]);

  const form = useForm<FormValues, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditing
      ? {
          nombre: cuenta?.nombre ?? '',
          tipo: (cuenta?.tipo ?? 'EFECTIVO') as TipoCuenta,
          bancoInstitucion: cuenta?.bancoInstitucion ?? '',
          titular: cuenta?.titular ?? '',
          esGlobal: cuenta?.esGlobal ?? false,
          negociosCompartidos: initialNegociosSeleccionados,
        }
      : {
          nombre: '',
          tipo: 'EFECTIVO',
          bancoInstitucion: '',
          titular: '',
          esGlobal: false,
          negociosCompartidos: initialNegociosSeleccionados,
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
        esGlobal: cuenta?.esGlobal ?? false,
        negociosCompartidos: initialNegociosSeleccionados,
      });
      return;
    }

    form.reset({
      nombre: '',
      tipo: 'EFECTIVO',
      bancoInstitucion: '',
      titular: '',
      esGlobal: false,
      negociosCompartidos: initialNegociosSeleccionados,
      saldoInicial: undefined,
    });
  }, [cuenta, form, initialNegociosSeleccionados, isEditing]);

  const isSubmitting = createCuenta.isPending || updateCuenta.isPending;
  const esGlobal = form.watch('esGlobal');

  const onSubmit = async (values: FormValues) => {
    try {
      if (typeof negocioId !== 'number') {
        throw new Error('Negocio requerido');
      }

      const isGlobalValue = Boolean(values.esGlobal);
      const selectedNegocios = values.negociosCompartidos;

      if (!isGlobalValue && selectedNegocios.length === 0) {
        throw new Error('Selecciona al menos un negocio o marca la cuenta como global');
      }

      const negocioPrincipal = isGlobalValue ? null : (selectedNegocios[0] ?? null);

      if (isEditing) {
        const payload: UpdateCuentaBancoData = {
          nombre: values.nombre,
          tipo: values.tipo as TipoCuenta,
          bancoInstitucion: values.bancoInstitucion?.trim() ? values.bancoInstitucion : undefined,
          titular: values.titular?.trim() ? values.titular : undefined,
          negocioId: negocioPrincipal,
          esGlobal: isOwner ? isGlobalValue : undefined,
          negociosCompartidos: isGlobalValue ? [] : selectedNegocios.length > 1 ? selectedNegocios : [],
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
        negocioId: negocioPrincipal,
        esGlobal: isOwner ? isGlobalValue : false,
        negociosCompartidos: isGlobalValue ? undefined : selectedNegocios.length > 1 ? selectedNegocios : undefined,
        saldoInicial: values.saldoInicial ? Number(values.saldoInicial) : undefined,
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

        {isOwner && (
          <FormField
            control={form.control}
            name="esGlobal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cuenta global</FormLabel>
                <FormControl>
                  <div className="flex items-start gap-3 rounded-md border border-slate-200 p-3">
                    <Checkbox
                      checked={Boolean(field.value)}
                      onCheckedChange={(checked) => {
                        const next = checked === true;
                        field.onChange(next);
                        if (next) {
                          form.setValue('negociosCompartidos' as never, [] as never, { shouldValidate: true });
                        }
                      }}
                      disabled={isSubmitting}
                    />
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-slate-900">Disponible para todos los negocios</div>
                      <div className="text-xs text-slate-600">Esta cuenta estará disponible para todos los negocios del holding.</div>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {!esGlobal && (
          <FormField
            control={form.control}
            name="negociosCompartidos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Negocios</FormLabel>
                <FormControl>
                  <div className="space-y-2 rounded-md border border-slate-200 p-3">
                    {negocios.length === 0 ? (
                      <div className="text-sm text-slate-600">No hay negocios disponibles.</div>
                    ) : (
                      negocios.map((n) => {
                        const checked = Array.isArray(field.value) ? field.value.includes(n.id) : false;
                        return (
                          <label key={n.id} className="flex items-center gap-3">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) => {
                                const nextChecked = value === true;
                                const current = Array.isArray(field.value) ? field.value : [];
                                const next = nextChecked ? Array.from(new Set([...current, n.id])) : current.filter((id) => id !== n.id);
                                field.onChange(next);
                              }}
                              disabled={isSubmitting}
                            />
                            <span className="text-sm text-slate-900">{n.nombre}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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
                    value={field.value ?? ''}
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
