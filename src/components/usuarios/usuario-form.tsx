'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { NegociosSelector, type NegocioOption } from '@/components/usuarios/negocios-selector';
import { RolSelector } from '@/components/usuarios/rol-selector';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useCreateUsuario, useUpdateUsuario } from '@/hooks/use-usuarios';
import type { UsuarioDetail } from '@/types/usuario.types';

const usuarioSchema = z.object({
  nombreCompleto: z.string().min(1, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Password mínimo 6 caracteres').optional().or(z.literal('')),
  rolId: z.number().int().positive('Rol requerido'),
  negocios: z.array(z.number().int().positive()).optional(),
});

type FormValues = z.infer<typeof usuarioSchema>;

export type UsuarioFormProps = {
  negocioId?: number;
  usuario?: UsuarioDetail | null;
  negociosOptions: NegocioOption[];
  onSuccess: () => void;
};

export function UsuarioForm({ negocioId, usuario, negociosOptions, onSuccess }: UsuarioFormProps) {
  const isEditing = Boolean(usuario?.id);

  const createUsuario = useCreateUsuario({ negocioId });
  const updateUsuario = useUpdateUsuario({ negocioId });

  const form = useForm<FormValues>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: {
      nombreCompleto: usuario?.nombreCompleto ?? '',
      email: usuario?.email ?? '',
      password: '',
      rolId: usuario?.rolId ?? 0,
      negocios: usuario?.negocios ?? (negocioId ? [negocioId] : []),
    },
  });

  React.useEffect(() => {
    form.reset({
      nombreCompleto: usuario?.nombreCompleto ?? '',
      email: usuario?.email ?? '',
      password: '',
      rolId: usuario?.rolId ?? 0,
      negocios: usuario?.negocios ?? (negocioId ? [negocioId] : []),
    });
  }, [usuario, negocioId, form]);

  const isSubmitting = createUsuario.isPending || updateUsuario.isPending;

  const onSubmit = async (values: FormValues) => {
    if (!isEditing) {
      if (!values.password || values.password.length < 6) {
        form.setError('password', { type: 'validate', message: 'Password mínimo 6 caracteres' });
        return;
      }
      if (!values.negocios || values.negocios.length === 0) {
        form.setError('negocios', { type: 'validate', message: 'Al menos un negocio requerido' });
        return;
      }

      await createUsuario.mutateAsync({
        nombreCompleto: values.nombreCompleto,
        email: values.email,
        password: values.password,
        rolId: values.rolId,
        negocios: values.negocios,
      });
      onSuccess();
      return;
    }

    const next = {
      nombreCompleto: values.nombreCompleto,
      email: values.email,
      rolId: values.rolId,
    } as const;

    if (values.password && values.password.length > 0) {
      await updateUsuario.mutateAsync({
        id: usuario!.id,
        data: { ...next, password: values.password },
      });
      onSuccess();
      return;
    }

    await updateUsuario.mutateAsync({ id: usuario!.id, data: next });
    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nombreCompleto"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre Completo</FormLabel>
              <FormControl>
                <Input placeholder="Juan Pérez" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="usuario@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{isEditing ? 'Contraseña (opcional)' : 'Contraseña'}</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rolId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rol</FormLabel>
              <FormControl>
                <RolSelector
                  value={field.value ?? null}
                  onChange={(next) => field.onChange(next)}
                  negocioId={negocioId}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isEditing && (
          <FormField
            control={form.control}
            name="negocios"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Negocios asignados</FormLabel>
                <FormControl>
                  <NegociosSelector
                    value={field.value ?? []}
                    onChange={(next) => field.onChange(next)}
                    options={negociosOptions}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isEditing ? 'Actualizar Usuario' : 'Crear Usuario'}
        </Button>
      </form>
    </Form>
  );
}
