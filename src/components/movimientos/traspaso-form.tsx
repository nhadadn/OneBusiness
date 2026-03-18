'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';

import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCuentasBanco } from '@/hooks/use-cuentas-banco';
import { useApiClient } from '@/hooks/use-api-client';

const schema = z
  .object({
    cuentaOrigenId: z.number().int().positive('Cuenta origen requerida'),
    cuentaDestinoId: z.number().int().positive('Cuenta destino requerida'),
    monto: z
      .string()
      .min(1, 'Monto requerido')
      .refine((value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) && !Number.isNaN(parsed) && parsed > 0;
      }, 'Monto debe ser positivo'),
    concepto: z.string().min(1, 'Concepto requerido'),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  })
  .refine((data) => data.cuentaOrigenId !== data.cuentaDestinoId, {
    message: 'La cuenta destino debe ser diferente',
    path: ['cuentaDestinoId'],
  });

type Values = z.infer<typeof schema>;

export type TraspasoFormProps = {
  negocioId: number | null;
  onSuccess: () => void;
};

function todayISO() {
  return new Date().toISOString().split('T')[0]!;
}

function formatCurrencyMXN(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

export function TraspasoForm({ negocioId, onSuccess }: TraspasoFormProps) {
  const { apiFetch } = useApiClient();
  const cuentasQuery = useCuentasBanco({ negocioId });
  const cuentas = cuentasQuery.data?.data ?? [];

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      cuentaOrigenId: undefined as unknown as number,
      cuentaDestinoId: undefined as unknown as number,
      monto: '',
      concepto: '',
      fecha: todayISO(),
    },
  });

  React.useEffect(() => {
    form.reset({
      ...form.getValues(),
      cuentaOrigenId: undefined as unknown as number,
      cuentaDestinoId: undefined as unknown as number,
    });
  }, [form, negocioId]);

  const cuentaOrigenId = form.watch('cuentaOrigenId');
  const cuentaDestinoId = form.watch('cuentaDestinoId');
  const montoRaw = form.watch('monto');

  const cuentaOrigen = cuentas.find((c) => c.id === cuentaOrigenId);
  const cuentaDestino = cuentas.find((c) => c.id === cuentaDestinoId);

  const monto = Number(montoRaw);
  const montoOk = Number.isFinite(monto) && !Number.isNaN(monto) && monto > 0;

  const canSubmit =
    typeof negocioId === 'number' &&
    typeof cuentaOrigenId === 'number' &&
    typeof cuentaDestinoId === 'number' &&
    cuentaOrigenId !== cuentaDestinoId &&
    montoOk;

  if (typeof negocioId !== 'number') {
    return (
      <EmptyState
        icon={Building2}
        title="Selecciona un negocio"
        description="Selecciona un negocio en el header para crear un traspaso."
      />
    );
  }

  if (cuentasQuery.isLoading) {
    return <div className="text-sm text-slate-600">Cargando cuentas...</div>;
  }

  if (cuentasQuery.error instanceof Error) {
    return <div className="text-sm text-red-600">{cuentasQuery.error.message}</div>;
  }

  if (cuentas.length < 2) {
    return (
      <EmptyState
        icon={Building2}
        title="Se requieren al menos 2 cuentas"
        description="Crea al menos dos cuentas bancarias para poder realizar un traspaso."
      />
    );
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          if (!canSubmit) return;

          try {
            const res = await apiFetch('/api/traspasos', {
              method: 'POST',
              body: JSON.stringify({
                negocioId,
                cuentaOrigenId: values.cuentaOrigenId,
                cuentaDestinoId: values.cuentaDestinoId,
                monto: Number(values.monto),
                concepto: values.concepto,
                fecha: values.fecha,
              }),
            });

            const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
            if (!res.ok || !json?.success) {
              throw new Error(json?.error ?? 'No se pudo crear el traspaso');
            }

            toast.success('Traspaso creado — 2 movimientos pendientes', { duration: 2500 });
            window.dispatchEvent(new CustomEvent('onebusiness:movimientos-refresh'));
            window.dispatchEvent(new CustomEvent('onebusiness:pending-count-refresh'));
            onSuccess();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'No se pudo crear el traspaso', { duration: 5000 });
          }
        })}
      >
        <FormField
          control={form.control}
          name="cuentaOrigenId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cuenta origen</FormLabel>
              <FormControl>
                <Select
                  value={field.value ? String(field.value) : ''}
                  onValueChange={(val) => field.onChange(Number(val))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cuenta origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {cuentas.map((c) => (
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
          name="cuentaDestinoId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cuenta destino</FormLabel>
              <FormControl>
                <Select
                  value={field.value ? String(field.value) : ''}
                  onValueChange={(val) => field.onChange(Number(val))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cuenta destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {cuentas.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)} disabled={typeof cuentaOrigenId === 'number' && c.id === cuentaOrigenId}>
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
                <Input placeholder="Ej: Traspaso para nómina" {...field} disabled={isSubmitting} />
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
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
          <div className="font-semibold text-foreground">Resumen</div>
          <div className="mt-1">
            Se crearán 2 movimientos pendientes de aprobación: EGRESO de{' '}
            <span className="font-semibold text-foreground">{cuentaOrigen?.nombre ?? '—'}</span> e INGRESO en{' '}
            <span className="font-semibold text-foreground">{cuentaDestino?.nombre ?? '—'}</span> por{' '}
            <span className="font-semibold text-foreground">{montoOk ? formatCurrencyMXN(monto) : '—'}</span>
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting || !canSubmit}>
          Crear traspaso
        </Button>
      </form>
    </Form>
  );
}

