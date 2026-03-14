'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { RechazoDialog } from '@/components/movimientos/rechazo-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useAprobarMovimiento, useMovimientoDetalle, useRechazarMovimiento, useReenviarMovimiento } from '@/hooks/use-movimientos';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(value);
}

function parseMoney(raw: string) {
  const num = Number(raw);
  return Number.isFinite(num) && !Number.isNaN(num) ? num : 0;
}

function parsePositiveInt(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

const reenviarSchema = z.object({
  concepto: z.string().min(1, 'Concepto requerido'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  monto: z
    .string()
    .min(1, 'Monto requerido')
    .refine((raw) => {
      const parsed = Number(raw);
      return Number.isFinite(parsed) && !Number.isNaN(parsed) && parsed > 0;
    }, 'Monto debe ser positivo'),
  tercero: z.string().optional(),
});

type ReenviarValues = z.infer<typeof reenviarSchema>;

export default function MovimientoDetallePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  const id = Number.parseInt(params.id, 10);
  const queryNegocioId = parsePositiveInt(searchParams.get('negocioId'));

  const canManage = user?.rol === 'Dueño' || user?.rol === 'Admin';
  const isOwner = user?.rol === 'Dueño';

  const [negocioId, setNegocioId] = React.useState<number | null>(queryNegocioId);
  const [negocioIndex, setNegocioIndex] = React.useState(0);

  React.useEffect(() => {
    if (!user) return;
    if (isOwner) return;
    if (typeof negocioId === 'number') return;
    const first = user.negocios?.[0] ?? null;
    setNegocioId(first);
  }, [isOwner, negocioId, user]);

  const detalleQuery = useMovimientoDetalle(Number.isFinite(id) ? id : null, isOwner ? null : negocioId);

  React.useEffect(() => {
    if (isOwner) return;
    if (!user) return;
    if (!detalleQuery.error) return;
    if (!(detalleQuery.error instanceof Error)) return;
    if (detalleQuery.error.message !== 'Movimiento no encontrado') return;
    const nextIndex = negocioIndex + 1;
    if (nextIndex >= (user.negocios?.length ?? 0)) return;
    setNegocioIndex(nextIndex);
    setNegocioId(user.negocios[nextIndex] ?? null);
  }, [detalleQuery.error, isOwner, negocioIndex, user]);

  const aprobar = useAprobarMovimiento();
  const rechazar = useRechazarMovimiento();
  const reenviar = useReenviarMovimiento();

  const [rechazoOpen, setRechazoOpen] = React.useState(false);

  const detalle = detalleQuery.data?.data ?? null;

  const canReenviar = Boolean(user && detalle && detalle.estado === 'RECHAZADO' && detalle.creadoPor.id === user.id);

  const form = useForm<ReenviarValues>({
    resolver: zodResolver(reenviarSchema),
    defaultValues: {
      concepto: detalle?.concepto ?? '',
      fecha: detalle?.fecha ?? '',
      monto: detalle ? String(parseMoney(detalle.monto)) : '',
      tercero: detalle?.tercero ?? '',
    },
  });

  React.useEffect(() => {
    if (!detalle) return;
    if (!canReenviar) return;
    form.reset({
      concepto: detalle.concepto ?? '',
      fecha: detalle.fecha ?? '',
      monto: String(parseMoney(detalle.monto)),
      tercero: detalle.tercero ?? '',
    });
  }, [canReenviar, detalle, form]);

  const handleConfirmRechazo = async (motivoRechazo: string) => {
    if (!detalle) return;
    await rechazar.mutateAsync({ id: detalle.id, motivoRechazo, negocioId: detalle.negocioId });
    await detalleQuery.refetch();
  };

  const handleReenviar = async (values: ReenviarValues) => {
    if (!detalle) return;
    await reenviar.mutateAsync({
      id: detalle.id,
      negocioId: detalle.negocioId,
      cambios: {
        concepto: values.concepto.trim(),
        fecha: values.fecha,
        monto: Number(values.monto),
        tercero: values.tercero?.trim() ? values.tercero.trim() : undefined,
      },
    });
    router.push('/movimientos');
  };

  if (authLoading) return null;
  if (!user) return null;
  if (!Number.isFinite(id)) return null;

  if (detalleQuery.isLoading) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <div className="text-sm text-slate-600">Cargando movimiento...</div>
      </div>
    );
  }

  if (detalleQuery.error instanceof Error) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <Button variant="ghost" className="px-0" onClick={() => router.push('/movimientos')}>
          ← Volver
        </Button>
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-red-600">{detalleQuery.error.message}</div>
      </div>
    );
  }

  if (!detalle) return null;

  const monto = formatCurrency(parseMoney(detalle.monto));

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" className="px-0" onClick={() => router.push('/movimientos')}>
            ← Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Movimiento #{detalle.id}</h1>
            <p className="text-slate-600">
              {detalle.concepto} · {monto}
            </p>
          </div>
        </div>

        {canManage && detalle.estado === 'PENDIENTE' ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setRechazoOpen(true)}
              disabled={rechazar.isPending || aprobar.isPending}
              className="border-red-200 text-red-700 hover:bg-red-50"
            >
              Rechazar
            </Button>
            <Button
              onClick={async () => {
                await aprobar.mutateAsync({ id: detalle.id, negocioId: detalle.negocioId });
                await detalleQuery.refetch();
              }}
              disabled={rechazar.isPending || aprobar.isPending}
            >
              Aprobar
            </Button>
          </div>
        ) : null}
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base text-[#1e3a5f]">Detalle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <div className="text-slate-600">Negocio</div>
            <div className="font-medium">#{detalle.negocioId}</div>
          </div>
          <div className="flex justify-between gap-4">
            <div className="text-slate-600">Tipo</div>
            <div className="font-medium">{detalle.tipo}</div>
          </div>
          <div className="flex justify-between gap-4">
            <div className="text-slate-600">Estado</div>
            <div className="font-medium">{detalle.estado}</div>
          </div>
          <div className="flex justify-between gap-4">
            <div className="text-slate-600">Fecha</div>
            <div className="font-medium">{detalle.fecha}</div>
          </div>
          <div className="flex justify-between gap-4">
            <div className="text-slate-600">Monto</div>
            <div className="font-mono font-medium">{monto}</div>
          </div>
          <div className="flex justify-between gap-4">
            <div className="text-slate-600">Cuenta</div>
            <div className="font-medium">{detalle.cuentaBanco.nombre}</div>
          </div>
          <div className="flex justify-between gap-4">
            <div className="text-slate-600">Tercero</div>
            <div className="font-medium">{detalle.tercero ?? '—'}</div>
          </div>
          <div className="flex justify-between gap-4">
            <div className="text-slate-600">Creado por</div>
            <div className="font-medium">
              {detalle.creadoPor.nombre} ({detalle.creadoPor.email})
            </div>
          </div>
          <div className="flex justify-between gap-4">
            <div className="text-slate-600">Versión</div>
            <div className="font-medium">v{detalle.version}</div>
          </div>
          <div className="flex justify-between gap-4">
            <div className="text-slate-600">Traspaso</div>
            <div className="font-medium">{detalle.traspasoRefId ? `Espejo #${detalle.traspasoRefId}` : '—'}</div>
          </div>
          {detalle.estado === 'RECHAZADO' ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <div className="font-semibold">Rechazado</div>
              <div className="mt-1">{detalle.motivoRechazo ?? 'Sin motivo'}</div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {canReenviar ? (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base text-[#1e3a5f]">Reenviar para aprobación</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleReenviar)} className="space-y-4">
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
                  name="fecha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha</FormLabel>
                      <FormControl>
                        <Input placeholder="YYYY-MM-DD" {...field} />
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
                          min={0}
                          step="0.01"
                          value={field.value === undefined ? '' : String(field.value)}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
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
                        <Input placeholder="Tercero" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit" disabled={reenviar.isPending}>
                    Reenviar para aprobación
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : null}

      <RechazoDialog
        open={rechazoOpen}
        onOpenChange={setRechazoOpen}
        movimiento={detalle}
        onConfirm={handleConfirmRechazo}
        isPending={rechazar.isPending}
      />
    </div>
  );
}
