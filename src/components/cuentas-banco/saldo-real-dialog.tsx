'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useUpdateSaldoReal } from '@/hooks/use-cuentas-banco';
import type { CuentaBancoListItem } from '@/hooks/use-cuentas-banco';

const schema = z.object({
  saldoReal: z
    .string()
    .min(1, 'Saldo requerido')
    .refine((value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && !Number.isNaN(parsed) && parsed >= 0;
    }, 'Saldo no puede ser negativo'),
});

type Values = z.infer<typeof schema>;

export type SaldoRealDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cuenta: CuentaBancoListItem | null;
  negocioId: number | null;
};

export function SaldoRealDialog({ open, onOpenChange, cuenta, negocioId }: SaldoRealDialogProps) {
  const mutation = useUpdateSaldoReal({ negocioId });

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      saldoReal: cuenta?.saldoReal ?? '',
    },
  });

  React.useEffect(() => {
    form.reset({
      saldoReal: cuenta?.saldoReal ?? '',
    });
  }, [cuenta, form]);

  const onSubmit = async (values: Values) => {
    if (!cuenta) return;
    await mutation.mutateAsync({ id: cuenta.id, saldoReal: Number(values.saldoReal) });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Actualizar saldo real</DialogTitle>
          <DialogDescription>{cuenta ? cuenta.nombre : 'Cuenta'}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="saldoReal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Saldo real</FormLabel>
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

            {mutation.error instanceof Error && <div className="text-sm text-red-600">{mutation.error.message}</div>}

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              Guardar saldo
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
