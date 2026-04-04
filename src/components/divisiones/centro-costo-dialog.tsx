'use client';

import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useApiClient } from '@/hooks/use-api-client';
import type { CentroCostoListItem, TipoCentroCosto } from '@/types/centro_costo.types';

type ApiFetchFn = (url: string, options?: RequestInit & { negocioId?: number | null }) => Promise<Response>;

type ApiErrorPayload = {
  success?: boolean;
  error?: string;
  details?: unknown;
};

async function apiJson<T>(
  apiFetch: ApiFetchFn,
  url: string,
  options?: Omit<RequestInit, 'body'> & { negocioId?: number | null; json?: unknown }
): Promise<T> {
  const res = await apiFetch(url, {
    ...options,
    body: options?.json !== undefined ? JSON.stringify(options.json) : undefined,
  });

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    const payload = isJson ? ((await res.json()) as ApiErrorPayload) : undefined;
    const message = payload?.error ?? `Error HTTP ${res.status}`;
    throw new Error(message);
  }

  if (!isJson) {
    return (await res.text()) as unknown as T;
  }

  return (await res.json()) as T;
}

export interface CentroCostoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'division' | 'subdivision';
  editItem?: CentroCostoListItem | null;
  negocioId: number;
  divisiones: CentroCostoListItem[];
  onSuccess: () => void;
}

type FormValues = {
  nombre: string;
  codigo?: string;
  descripcion?: string;
  padreId?: string;
};

export function CentroCostoDialog({
  open,
  onOpenChange,
  mode,
  editItem,
  negocioId,
  divisiones,
  onSuccess,
}: CentroCostoDialogProps) {
  const { apiFetch } = useApiClient();
  const queryClient = useQueryClient();

  const title = useMemo(() => {
    if (mode === 'division' && !editItem) return 'Nueva División';
    if (mode === 'division' && editItem) return 'Editar División';
    if (mode === 'subdivision' && !editItem) return 'Nueva Sub-división';
    return 'Editar Sub-división';
  }, [editItem, mode]);

  const schema = useMemo(() => {
    return z
      .object({
        nombre: z.string().min(2, 'Mínimo 2 caracteres').max(255, 'Máximo 255 caracteres').trim(),
        codigo: z.string().max(50, 'Máximo 50 caracteres').optional(),
        descripcion: z.string().max(500, 'Máximo 500 caracteres').optional(),
        padreId: z.string().optional(),
      })
      .refine((data) => mode !== 'subdivision' || Boolean(data.padreId), {
        message: 'padreId es requerido',
        path: ['padreId'],
      });
  }, [mode]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: '',
      codigo: '',
      descripcion: '',
      padreId: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    const defaultParentId = mode === 'subdivision' ? (divisiones[0]?.id ? String(divisiones[0].id) : '') : '';

    form.reset({
      nombre: editItem?.nombre ?? '',
      codigo: editItem?.codigo ?? '',
      descripcion: editItem?.descripcion ?? '',
      padreId: mode === 'subdivision' ? (editItem?.padreId ? String(editItem.padreId) : defaultParentId) : '',
    });
  }, [divisiones, editItem, form, mode, open]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payloadBase = {
        nombre: values.nombre,
        codigo: values.codigo?.trim() ? values.codigo : undefined,
        descripcion: values.descripcion?.trim() ? values.descripcion : undefined,
      };

      if (editItem) {
        return apiJson<{ success: boolean; data: CentroCostoListItem }>(apiFetch, `/api/centros-costo/${editItem.id}`, {
          method: 'PATCH',
          negocioId,
          json: payloadBase,
        });
      }

      const tipo: TipoCentroCosto = mode === 'division' ? 'DIVISION' : 'SUBDIVISION';
      const padreId = mode === 'subdivision' ? Number(values.padreId) : null;
      return apiJson<{ success: boolean; data: CentroCostoListItem }>(apiFetch, '/api/centros-costo', {
        method: 'POST',
        negocioId,
        json: {
          negocioId,
          ...payloadBase,
          tipo,
          padreId,
        },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['centrosCostoTree', negocioId] });
      await queryClient.invalidateQueries({ queryKey: ['centrosCosto', negocioId] });
      toast.success('Cambios guardados', { duration: 2500 });
      onSuccess();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar', { duration: 5000 });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Completa la información para continuar.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl>
                    <Input placeholder="Código (opcional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descripción (opcional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mode === 'subdivision' ? (
              <FormField
                control={form.control}
                name="padreId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>División padre</FormLabel>
                    <FormControl>
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar división" />
                        </SelectTrigger>
                        <SelectContent>
                          {divisiones.map((d) => (
                            <SelectItem key={d.id} value={String(d.id)}>
                              {d.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
