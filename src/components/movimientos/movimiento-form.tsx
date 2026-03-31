'use client';

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
import { SheetFooter } from '@/components/ui/sheet';
import { useCuentasBanco } from '@/hooks/use-cuentas-banco';
import { useAuth } from '@/hooks/use-auth';
import { useNegocios } from '@/hooks/use-negocios';
import { useCreateMovimiento, type CreateMovimientoData } from '@/hooks/use-movimientos';

const schema = z
  .object({
    negocioId: z.number().positive(),
    tipo: z.enum(['INGRESO', 'EGRESO', 'TRASPASO_SALIDA']),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    concepto: z.string().min(1, 'Concepto requerido'),
    tercero: z.string().optional(),
    monto: z
      .string()
      .min(1, 'Monto requerido')
      .refine((value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) && !Number.isNaN(parsed) && parsed > 0;
      }, 'Monto debe ser positivo'),
    cuentaBancoId: z.number().positive('Cuenta requerida'),
    cuentaBancoDestinoId: z.number().optional(),
    negocioDestinoId: z.number().optional(),
    centroCostoId: z.number().optional(),
    efectuado: z.boolean(),
  })
  .refine((data) => data.tipo !== 'TRASPASO_SALIDA' || (!!data.cuentaBancoDestinoId && !!data.negocioDestinoId), {
    message: 'Traspaso requiere cuenta y negocio de destino',
    path: ['cuentaBancoDestinoId'],
  });

type Values = z.infer<typeof schema>;

export type MovimientoFormProps = {
  onSuccess: () => void;
  onSuccessAndNew?: () => void;
  onCancel?: () => void;
  negocioId?: number | null;
};

function todayISO() {
  return new Date().toISOString().split('T')[0]!;
}

export function MovimientoForm({
  onSuccess,
  onSuccessAndNew,
  onCancel,
  negocioId: preferredNegocioId,
}: MovimientoFormProps) {
  const { user, isLoading } = useAuth();
  const isOwner = user?.rol === 'Dueño';
  const [submitMode, setSubmitMode] = React.useState<'close' | 'new'>('close');

  const negociosQuery = useNegocios({ negocioId: undefined, enabled: Boolean(isOwner) });

  const negocioOptions = React.useMemo(() => {
    if (!user) return [];
    if (isOwner) {
      const apiItems = negociosQuery.data?.data ?? [];
      if (apiItems.length > 0) {
        return apiItems.map((n) => ({ id: n.id, label: n.nombre?.trim() ? n.nombre : `Negocio ${n.id}` }));
      }
    }
    return (user.negocios ?? []).map((id) => ({ id, label: `Negocio ${id}` }));
  }, [isOwner, negociosQuery.data?.data, user]);

  const defaultNegocioId = React.useMemo(() => {
    if (!user) return 0;
    if (typeof preferredNegocioId === 'number' && negocioOptions.some((n) => n.id === preferredNegocioId)) {
      return preferredNegocioId;
    }
    return negocioOptions[0]?.id ?? user.negocios?.[0] ?? 0;
  }, [negocioOptions, preferredNegocioId, user]);

  const createMovimiento = useCreateMovimiento();

  const form = useForm<Values, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      negocioId: defaultNegocioId,
      tipo: 'INGRESO',
      fecha: todayISO(),
      concepto: '',
      tercero: '',
      monto: '',
      cuentaBancoId: undefined as unknown as number,
      cuentaBancoDestinoId: undefined,
      negocioDestinoId: undefined,
      efectuado: false,
    },
  });


  React.useEffect(() => {
    if (!user) return;
    form.reset({
      ...form.getValues(),
      negocioId: defaultNegocioId,
    });
  }, [defaultNegocioId, form, user]);

  const tipo = form.watch('tipo');
  const negocioId = form.watch('negocioId');
  const negocioDestinoId = form.watch('negocioDestinoId');
  const efectuado = form.watch('efectuado');

  const cuentasOrigenQuery = useCuentasBanco({ negocioId: typeof negocioId === 'number' ? negocioId : null });
  const cuentasDestinoQuery = useCuentasBanco({ negocioId: typeof negocioDestinoId === 'number' ? negocioDestinoId : null });

  React.useEffect(() => {
    form.setValue('cuentaBancoId', undefined as unknown as number);
  }, [form, negocioId]);

  React.useEffect(() => {
    form.setValue('cuentaBancoDestinoId', undefined);
  }, [form, negocioDestinoId]);

  React.useEffect(() => {
    if (tipo !== 'TRASPASO_SALIDA') {
      form.setValue('negocioDestinoId', undefined);
      form.setValue('cuentaBancoDestinoId', undefined);
    }
  }, [form, tipo]);

  const isSubmitting = createMovimiento.isPending;

  const onSubmit = async (values: Values) => {
    const payload: CreateMovimientoData = {
      negocioId: values.negocioId,
      tipo: values.tipo,
      fecha: values.fecha,
      concepto: values.concepto,
      tercero: values.tercero?.trim() ? values.tercero : undefined,
      monto: Number(values.monto),
      cuentaBancoId: values.cuentaBancoId,
      cuentaBancoDestinoId: values.cuentaBancoDestinoId,
      negocioDestinoId: values.negocioDestinoId,
      centroCostoId: values.centroCostoId,
      efectuado: values.efectuado,
    };

    try {
      await createMovimiento.mutateAsync(payload);
      if (submitMode === 'new') {
        const negocioIdToKeep = values.negocioId;
        const cuentaBancoIdToKeep = values.cuentaBancoId;
        const fechaToKeep = values.fecha;

        if (typeof negocioIdToKeep === 'number' && typeof cuentaBancoIdToKeep === 'number' && typeof fechaToKeep === 'string') {
          form.reset({
            negocioId: negocioIdToKeep,
            tipo: 'INGRESO',
            fecha: fechaToKeep,
            concepto: '',
            tercero: '',
            monto: '',
            cuentaBancoId: cuentaBancoIdToKeep,
            cuentaBancoDestinoId: undefined,
            negocioDestinoId: undefined,
            centroCostoId: undefined,
          });
        } else {
          form.reset({
            negocioId: defaultNegocioId,
            tipo: 'INGRESO',
            fecha: todayISO(),
            concepto: '',
            tercero: '',
            monto: '',
            cuentaBancoId: undefined as unknown as number,
            cuentaBancoDestinoId: undefined,
            negocioDestinoId: undefined,
            centroCostoId: undefined,
          });
        }

        if (onSuccessAndNew) {
          onSuccessAndNew();
        } else {
          toast.success('Movimiento guardado. Agrega el siguiente.', { duration: 2500 });
        }

        return;
      }

      toast.success('Movimiento creado exitosamente', { duration: 2500 });
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear el movimiento', { duration: 5000 });
    }
  };

  if (isLoading) return null;
  if (!user) return null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="negocioId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Negocio</FormLabel>
              <FormControl>
                <Select value={field.value ? String(field.value) : ''} onValueChange={(val) => field.onChange(Number(val))} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar negocio" />
                  </SelectTrigger>
                  <SelectContent>
                    {negocioOptions.map((n) => (
                      <SelectItem key={n.id} value={String(n.id)}>
                        {n.label}
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
          name="tipo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={(val) => field.onChange(val)} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INGRESO">Ingreso</SelectItem>
                    <SelectItem value="EGRESO">Egreso</SelectItem>
                    <SelectItem value="TRASPASO_SALIDA">Traspaso</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fecha"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="concepto"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Concepto</FormLabel>
              <FormControl>
                <Input placeholder="Concepto" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="monto"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monto</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder="0.00"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cuentaBancoId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cuenta</FormLabel>
              <FormControl>
                <Select
                  value={field.value ? String(field.value) : ''}
                  onValueChange={(val) => field.onChange(Number(val))}
                  disabled={isSubmitting || cuentasOrigenQuery.isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={cuentasOrigenQuery.isLoading ? 'Cargando...' : 'Seleccionar cuenta'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(cuentasOrigenQuery.data?.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nombre}
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
          name="tercero"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tercero (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Proveedor, cliente..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {tipo === 'TRASPASO_SALIDA' && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
            <div className="text-sm text-slate-700">Se crearán automáticamente 2 movimientos espejo</div>

            <FormField
              control={form.control}
              name="negocioDestinoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Negocio destino</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(val) => field.onChange(Number(val))}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar negocio" />
                      </SelectTrigger>
                      <SelectContent>
                        {negocioOptions.map((n) => (
                          <SelectItem key={n.id} value={String(n.id)}>
                            {n.label}
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
              name="cuentaBancoDestinoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cuenta destino</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(val) => field.onChange(Number(val))}
                      disabled={isSubmitting || cuentasDestinoQuery.isLoading || typeof negocioDestinoId !== 'number'}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            typeof negocioDestinoId !== 'number'
                              ? 'Selecciona un negocio destino'
                              : cuentasDestinoQuery.isLoading
                                ? 'Cargando...'
                                : 'Seleccionar cuenta'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {(cuentasDestinoQuery.data?.data ?? []).map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {createMovimiento.error instanceof Error && <div className="text-sm text-red-600">{createMovimiento.error.message}</div>}

        <FormField
          control={form.control}
          name="efectuado"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="flex items-start gap-3 rounded-md border border-slate-200 bg-white p-3">
                  <Checkbox checked={Boolean(field.value)} onCheckedChange={(val) => field.onChange(val === true)} disabled={isSubmitting} />
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-slate-900">Este movimiento ya fue efectuado</div>
                    <div className="text-xs text-slate-600">Se registrará como PAGADO y afectará el saldo inmediatamente.</div>
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {efectuado ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            Este movimiento se creará directamente como PAGADO y el saldo de la cuenta se actualizará de inmediato.
          </div>
        ) : null}

        <SheetFooter className="mt-6">
          {typeof onCancel === 'function' ? (
            <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </Button>
          ) : null}
          <Button
            variant="outline"
            type="submit"
            onClick={() => setSubmitMode('new')}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar y agregar otro'}
          </Button>
          <Button type="submit" onClick={() => setSubmitMode('close')} disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar y cerrar'}
          </Button>
        </SheetFooter>
      </form>
    </Form>
  );
}
