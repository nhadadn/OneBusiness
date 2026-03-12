'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import type { MovimientoListItem } from '@/hooks/use-movimientos';

const schema = z.object({
  motivoRechazo: z.string().min(1, 'El motivo es requerido').min(10, 'Describe el motivo con más detalle'),
});

type Values = z.infer<typeof schema>;

export type RechazoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movimiento: MovimientoListItem | null;
  onConfirm: (motivoRechazo: string) => Promise<void>;
  isPending: boolean;
};

function formatCurrencyMXN(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

function parseMoney(raw: string) {
  const num = Number(raw);
  return Number.isFinite(num) && !Number.isNaN(num) ? num : 0;
}

export function RechazoDialog({ open, onOpenChange, movimiento, onConfirm, isPending }: RechazoDialogProps) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { motivoRechazo: '' },
  });

  React.useEffect(() => {
    if (!open) {
      form.reset({ motivoRechazo: '' });
    }
  }, [form, open]);

  const onSubmit = async (values: Values) => {
    await onConfirm(values.motivoRechazo.trim());
    onOpenChange(false);
  };

  const monto = movimiento ? formatCurrencyMXN(parseMoney(movimiento.monto)) : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rechazar movimiento</DialogTitle>
          <DialogDescription>
            {movimiento ? `${movimiento.concepto} · ${monto}` : 'Selecciona un movimiento'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="motivoRechazo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe el motivo del rechazo..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-600/90" disabled={isPending || !movimiento}>
                Rechazar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

