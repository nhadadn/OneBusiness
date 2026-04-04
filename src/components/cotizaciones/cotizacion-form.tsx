'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/format';
import { useApiClient } from '@/hooks/use-api-client';
import { useAuth } from '@/hooks/use-auth';
import type { Categoria } from '@/types/categoria.types';
import type { EstadoCotizacion } from '@/types/cotizacion.types';
import type { NegocioListItem } from '@/types/negocio.types';

function todayISO() {
  return new Date().toISOString().split('T')[0]!;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function parseOptionalNumber(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return undefined;
  return parsed;
}

function parseDecimalToNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toInputDate(value: unknown): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return todayISO();
  return d.toISOString().slice(0, 10);
}

const itemSchema = z.object({
  descripcion: z.string().min(1, 'Descripción requerida'),
  cantidad: z.number().positive('Cantidad debe ser positiva').optional(),
  unidadMedida: z.string().optional(),
  precioUnitario: z.number().positive('Precio unitario debe ser positivo').optional(),
  importe: z.number().positive('Importe debe ser positivo'),
});

const schema = z.object({
  negocioId: z.number().int().positive('Negocio requerido'),
  clienteNombre: z.string().min(1, 'Nombre del cliente requerido'),
  clienteRfc: z.string().optional(),
  clienteDireccion: z.string().optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  notas: z.string().optional(),
  categoriaId: z.number().int().positive().optional(),
  items: z.array(itemSchema).min(1, 'Debe incluir al menos un ítem'),
});

type Values = z.infer<typeof schema>;

export type CotizacionConItems = {
  id: number;
  negocioId: number;
  folio: string;
  clienteNombre: string;
  clienteRfc: string | null;
  clienteDireccion: string | null;
  fecha: string;
  estado: EstadoCotizacion;
  numeroOc: string | null;
  numeroFactura: string | null;
  cuentaBancoId: number | null;
  categoriaId: number | null;
  movimientoId: number | null;
  subtotal: string;
  iva: string;
  total: string;
  notas: string | null;
  creadoPor: number;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: number;
    cotizacionId: number;
    orden: number;
    descripcion: string;
    cantidad: string | null;
    unidadMedida: string | null;
    precioUnitario: string | null;
    importe: string;
  }>;
};

export type CotizacionFormProps = {
  modo: 'crear' | 'editar';
  cotizacionInicial?: CotizacionConItems;
  onSuccess: () => void;
};

type NegociosResponse = {
  success: boolean;
  data: NegocioListItem[];
  error?: string;
};

type CategoriasResponse = {
  success: boolean;
  data: Categoria[];
  error?: string;
};

type NegocioDetalle = {
  rfc?: string | null;
  direccion?: string | null;
  telefono?: string | null;
};

type NegocioDetalleResponse = {
  success: boolean;
  data: (NegocioDetalle & { id?: number; nombre?: string }) | null;
  error?: string;
};

function SectionSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function CotizacionForm({ modo, cotizacionInicial, onSuccess }: CotizacionFormProps) {
  const { user } = useAuth();
  const { apiFetch } = useApiClient();
  const router = useRouter();

  const canEdit = user ? user.rol !== 'Externo' : false;

  const [negocios, setNegocios] = React.useState<NegocioListItem[]>([]);
  const [negociosLoading, setNegociosLoading] = React.useState(false);

  const [categorias, setCategorias] = React.useState<Categoria[]>([]);
  const [categoriasLoading, setCategoriasLoading] = React.useState(false);

  const [negocioDetalle, setNegocioDetalle] = React.useState<NegocioDetalle | null>(null);
  const [negocioDetalleLoading, setNegocioDetalleLoading] = React.useState(false);

  const [serverError, setServerError] = React.useState<string | null>(null);
  const [submitMode, setSubmitMode] = React.useState<'draft' | 'send'>('draft');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const defaultValues = React.useMemo<Values>(() => {
    if (modo === 'editar' && cotizacionInicial) {
      return {
        negocioId: cotizacionInicial.negocioId,
        clienteNombre: cotizacionInicial.clienteNombre ?? '',
        clienteRfc: cotizacionInicial.clienteRfc ?? '',
        clienteDireccion: cotizacionInicial.clienteDireccion ?? '',
        fecha: toInputDate(cotizacionInicial.fecha),
        notas: cotizacionInicial.notas ?? '',
        categoriaId: cotizacionInicial.categoriaId ?? undefined,
        items:
          cotizacionInicial.items?.length > 0
            ? cotizacionInicial.items.map((it) => ({
                descripcion: it.descripcion ?? '',
                unidadMedida: it.unidadMedida ?? '',
                cantidad: parseDecimalToNumber(it.cantidad),
                precioUnitario: parseDecimalToNumber(it.precioUnitario),
                importe: parseDecimalToNumber(it.importe) ?? 0,
              }))
            : [{ descripcion: '', unidadMedida: '', cantidad: undefined, precioUnitario: undefined, importe: 0 }],
      };
    }

    return {
      negocioId: 0,
      clienteNombre: '',
      clienteRfc: '',
      clienteDireccion: '',
      fecha: todayISO(),
      notas: '',
      categoriaId: undefined,
      items: [{ descripcion: '', unidadMedida: '', cantidad: undefined, precioUnitario: undefined, importe: 0 }],
    };
  }, [cotizacionInicial, modo]);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });

  const negocioId = form.watch('negocioId');
  const watchedItems = form.watch('items');

  const totals = React.useMemo(() => {
    const subtotal = (watchedItems ?? []).reduce((acc, item) => {
      const value = item?.importe;
      return typeof value === 'number' && Number.isFinite(value) && !Number.isNaN(value) ? acc + value : acc;
    }, 0);
    const iva = round2(subtotal * 0.16);
    const total = round2(subtotal + iva);
    return { subtotal, iva, total };
  }, [watchedItems]);

  React.useEffect(() => {
    if (!Array.isArray(watchedItems)) return;

    watchedItems.forEach((item, index) => {
      const cantidad = item?.cantidad;
      const precioUnitario = item?.precioUnitario;
      const importe = item?.importe;

      if (typeof precioUnitario === 'number' && precioUnitario > 0 && typeof cantidad === 'number' && cantidad > 0) {
        const next = round2(cantidad * precioUnitario);
        if (importe !== next) {
          form.setValue(`items.${index}.importe`, next, { shouldDirty: true, shouldValidate: false });
        }
        return;
      }

      if (typeof precioUnitario === 'number' && precioUnitario > 0 && (cantidad === undefined || cantidad === null)) {
        const next = round2(precioUnitario);
        if (importe !== next) {
          form.setValue(`items.${index}.importe`, next, { shouldDirty: true, shouldValidate: false });
        }
      }
    });
  }, [form, watchedItems]);

  React.useEffect(() => {
    if (!user) return;
    let active = true;

    const fetchNegocios = async () => {
      setNegociosLoading(true);
      try {
        const res = await apiFetch('/api/negocios', { headers: { 'Cache-Control': 'no-store' } });
        const json = (await res.json().catch(() => ({}))) as NegociosResponse;
        if (!active) return;
        if (!res.ok || !json.success) {
          setNegocios([]);
          return;
        }
        setNegocios(Array.isArray(json.data) ? json.data : []);
      } catch {
        if (!active) return;
        setNegocios([]);
      } finally {
        if (!active) return;
        setNegociosLoading(false);
      }
    };

    void fetchNegocios();

    return () => {
      active = false;
    };
  }, [apiFetch, user]);

  React.useEffect(() => {
    if (modo !== 'crear') return;
    if (!Array.isArray(negocios) || negocios.length === 0) return;
    const current = form.getValues('negocioId');
    if (typeof current === 'number' && current > 0) return;
    form.setValue('negocioId', negocios[0]!.id, { shouldDirty: false, shouldValidate: false });
  }, [form, modo, negocios]);

  React.useEffect(() => {
    if (typeof negocioId !== 'number' || negocioId <= 0) {
      setCategorias([]);
      setNegocioDetalle(null);
      return;
    }

    form.setValue('categoriaId', undefined, { shouldDirty: true, shouldValidate: false });

    let active = true;
    const controller = new AbortController();

    const fetchCategorias = async () => {
      setCategoriasLoading(true);
      try {
        const res = await apiFetch('/api/categorias', {
          headers: { 'Cache-Control': 'no-store' },
          negocioId,
          signal: controller.signal,
        });
        const json = (await res.json().catch(() => ({}))) as CategoriasResponse;
        if (!active) return;
        if (!res.ok || !json.success) {
          setCategorias([]);
          return;
        }
        setCategorias(Array.isArray(json.data) ? json.data : []);
      } catch (e) {
        if (!active) return;
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setCategorias([]);
      } finally {
        if (!active) return;
        setCategoriasLoading(false);
      }
    };

    void fetchCategorias();

    return () => {
      active = false;
      controller.abort();
    };
  }, [apiFetch, form, negocioId]);

  React.useEffect(() => {
    if (typeof negocioId !== 'number' || negocioId <= 0) return;
    let active = true;
    const controller = new AbortController();

    const fetchDetalle = async () => {
      setNegocioDetalleLoading(true);
      try {
        const res = await apiFetch(`/api/negocios/${negocioId}`, {
          headers: { 'Cache-Control': 'no-store' },
          negocioId,
          signal: controller.signal,
        });
        const json = (await res.json().catch(() => ({}))) as NegocioDetalleResponse;
        if (!active) return;
        if (!res.ok || !json.success || !json.data) {
          setNegocioDetalle(null);
          return;
        }
        setNegocioDetalle({
          rfc: json.data.rfc ?? null,
          direccion: json.data.direccion ?? null,
          telefono: json.data.telefono ?? null,
        });
      } catch (e) {
        if (!active) return;
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setNegocioDetalle(null);
      } finally {
        if (!active) return;
        setNegocioDetalleLoading(false);
      }
    };

    void fetchDetalle();

    return () => {
      active = false;
      controller.abort();
    };
  }, [apiFetch, negocioId]);

  const onSubmit = async (values: Values) => {
    if (!canEdit) return;

    setIsSubmitting(true);
    setServerError(null);

    const payloadBase = {
      negocioId: values.negocioId,
      clienteNombre: values.clienteNombre.trim(),
      clienteRfc: normalizeOptionalText(values.clienteRfc),
      clienteDireccion: normalizeOptionalText(values.clienteDireccion),
      fecha: values.fecha,
      notas: normalizeOptionalText(values.notas),
      categoriaId: values.categoriaId,
      items: values.items.map((item) => ({
        descripcion: item.descripcion.trim(),
        unidadMedida: normalizeOptionalText(item.unidadMedida),
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        importe: item.importe,
      })),
    };

    try {
      if (modo === 'crear') {
        const res = await apiFetch('/api/cotizaciones', { method: 'POST', body: JSON.stringify(payloadBase) });
        const json = (await res.json().catch(() => ({}))) as { success?: boolean; data?: { id: number }; error?: string };

        if (!res.ok || !json.success || !json.data?.id) {
          setServerError(json.error ?? 'No se pudo guardar la cotización');
          return;
        }

        if (submitMode === 'send') {
          const res2 = await apiFetch(`/api/cotizaciones/${json.data.id}/estado`, {
            method: 'PATCH',
            body: JSON.stringify({ estado: 'ENVIADA' }),
          });
          const json2 = (await res2.json().catch(() => ({}))) as { success?: boolean; error?: string };

          if (!res2.ok || !json2.success) {
            setServerError(json2.error ?? 'No se pudo enviar la cotización');
            return;
          }
        }

        onSuccess();
        return;
      }

      if (!cotizacionInicial?.id) {
        setServerError('Cotización inválida para editar');
        return;
      }

      const res = await apiFetch(`/api/cotizaciones/${cotizacionInicial.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          clienteNombre: payloadBase.clienteNombre,
          clienteRfc: payloadBase.clienteRfc,
          clienteDireccion: payloadBase.clienteDireccion,
          fecha: payloadBase.fecha,
          notas: payloadBase.notas,
          categoriaId: payloadBase.categoriaId,
          items: payloadBase.items,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };

      if (!res.ok || !json.success) {
        setServerError(json.error ?? 'No se pudo guardar la cotización');
        return;
      }

      onSuccess();
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'No se pudo guardar la cotización');
    } finally {
      setIsSubmitting(false);
    }
  };

  const missingFields = React.useMemo(() => {
    if (!negocioDetalle) return ['RFC', 'Dirección', 'Teléfono'];
    const missing: string[] = [];
    if (!negocioDetalle.rfc?.trim()) missing.push('RFC');
    if (!negocioDetalle.direccion?.trim()) missing.push('Dirección');
    if (!negocioDetalle.telefono?.trim()) missing.push('Teléfono');
    return missing;
  }, [negocioDetalle]);

  const isDetalleCompleto = missingFields.length === 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <SectionSeparator label="Datos generales" />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="negocioId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Negocio</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(val) => field.onChange(Number(val))}
                      disabled={isSubmitting || !canEdit || negociosLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={negociosLoading ? 'Cargando...' : 'Seleccionar negocio'} />
                      </SelectTrigger>
                      <SelectContent>
                        {negocios.map((n) => (
                          <SelectItem key={n.id} value={String(n.id)}>
                            {n.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {typeof negocioId === 'number' && negocioId > 0 ? (
              <div className="mt-3">
                {negocioDetalleLoading ? (
                  <div className="space-y-2 rounded-md border border-border bg-card p-3">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-72" />
                  </div>
                ) : (
                  <details
                    className={[
                      'rounded-md border p-3 text-sm',
                      isDetalleCompleto ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900',
                    ].join(' ')}
                  >
                    <summary className="cursor-pointer select-none font-medium">
                      {isDetalleCompleto ? '✓ Datos del emisor completos' : '⚠ Datos del emisor incompletos'}
                    </summary>
                    <div className="mt-2 space-y-1 text-xs">
                      {isDetalleCompleto ? (
                        <>
                          <div>
                            <span className="font-medium">RFC:</span> {negocioDetalle?.rfc}
                          </div>
                          <div>
                            <span className="font-medium">Dirección:</span> {negocioDetalle?.direccion}
                          </div>
                          <div>
                            <span className="font-medium">Teléfono:</span> {negocioDetalle?.telefono}
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="font-medium">Faltan:</span> {missingFields.join(', ')}
                          </div>
                          <div>El PDF de esta cotización no tendrá todos los datos del emisor.</div>
                          <div className="underline decoration-dotted underline-offset-2 opacity-80">Configurar en ajustes del negocio</div>
                        </>
                      )}
                    </div>
                  </details>
                )}
              </div>
            ) : null}
          </div>

          <FormField
            control={form.control}
            name="fecha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha</FormLabel>
                <FormControl>
                  <Input type="date" {...field} disabled={isSubmitting || !canEdit} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clienteNombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Nombre del cliente" {...field} disabled={isSubmitting || !canEdit} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clienteRfc"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente RFC</FormLabel>
                <FormControl>
                  <Input placeholder="RFC (opcional)" {...field} disabled={isSubmitting || !canEdit} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="categoriaId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <FormControl>
                  <Select
                    value={field.value ? String(field.value) : 'none'}
                    onValueChange={(val) => field.onChange(val === 'none' ? undefined : Number(val))}
                    disabled={isSubmitting || !canEdit || categoriasLoading || typeof negocioId !== 'number' || negocioId <= 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          typeof negocioId !== 'number' || negocioId <= 0
                            ? 'Selecciona un negocio'
                            : categoriasLoading
                              ? 'Cargando...'
                              : 'Seleccionar categoría'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin categoría</SelectItem>
                      {categorias.map((c) => (
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

          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="clienteDireccion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente dirección</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Dirección (opcional)" {...field} disabled={isSubmitting || !canEdit} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="notas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas internas</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Notas internas (no aparecen en el PDF)"
                      {...field}
                      disabled={isSubmitting || !canEdit}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <SectionSeparator label="Líneas de detalle" />

        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="w-[48px]">
                  #
                </TableHead>
                <TableHead scope="col">Descripción</TableHead>
                <TableHead scope="col" className="w-[100px]">
                  U.M.
                </TableHead>
                <TableHead scope="col" className="w-[120px] text-right">
                  Cantidad
                </TableHead>
                <TableHead scope="col" className="w-[140px] text-right">
                  Precio Unit.
                </TableHead>
                <TableHead scope="col" className="w-[140px] text-right">
                  Importe
                </TableHead>
                <TableHead scope="col" className="w-[48px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((f, index) => {
                return (
                  <TableRow key={f.id}>
                    <TableCell className="align-top text-sm text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="align-top">
                      <FormField
                        control={form.control}
                        name={`items.${index}.descripcion`}
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormControl>
                              <Input placeholder="Descripción" {...field} disabled={isSubmitting || !canEdit} />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <FormField
                        control={form.control}
                        name={`items.${index}.unidadMedida`}
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormControl>
                              <Input placeholder="Pza" {...field} disabled={isSubmitting || !canEdit} />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <FormField
                        control={form.control}
                        name={`items.${index}.cantidad`}
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormControl>
                              <Input
                                type="number"
                                inputMode="decimal"
                                step="0.0001"
                                min={0}
                                value={typeof field.value === 'number' ? String(field.value) : ''}
                                onChange={(e) => field.onChange(parseOptionalNumber(e.target.value))}
                                placeholder="0"
                                disabled={isSubmitting || !canEdit}
                                className="text-right"
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <FormField
                        control={form.control}
                        name={`items.${index}.precioUnitario`}
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormControl>
                              <Input
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                min={0}
                                value={typeof field.value === 'number' ? String(field.value) : ''}
                                onChange={(e) => field.onChange(parseOptionalNumber(e.target.value))}
                                placeholder="0.00"
                                disabled={isSubmitting || !canEdit}
                                className="text-right"
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <FormField
                        control={form.control}
                        name={`items.${index}.importe`}
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormControl>
                              <Input
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                min={0}
                                value={typeof field.value === 'number' ? String(field.value) : ''}
                                onChange={(e) => {
                                  const next = parseOptionalNumber(e.target.value);
                                  field.onChange(typeof next === 'number' ? next : 0);
                                }}
                                placeholder="0.00"
                                disabled={isSubmitting || !canEdit}
                                className="text-right"
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </TableCell>
                    <TableCell className="align-top text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={() => remove(index)}
                        disabled={isSubmitting || !canEdit || fields.length === 1}
                        aria-label="Eliminar línea"
                      >
                        ×
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              append({ descripcion: '', unidadMedida: '', cantidad: undefined, precioUnitario: undefined, importe: 0 })
            }
            disabled={isSubmitting || !canEdit}
          >
            + Agregar línea
          </Button>

          <div className="text-right text-sm">
            <div className="flex justify-end gap-3">
              <div className="text-muted-foreground">Subtotal:</div>
              <div className="w-[140px] font-mono">{formatCurrency(totals.subtotal)}</div>
            </div>
            <div className="flex justify-end gap-3">
              <div className="text-muted-foreground">IVA (16%):</div>
              <div className="w-[140px] font-mono">{formatCurrency(totals.iva)}</div>
            </div>
            <div className="flex justify-end gap-3 font-semibold">
              <div>Total:</div>
              <div className="w-[140px] font-mono">{formatCurrency(totals.total)}</div>
            </div>
          </div>
        </div>

        {serverError ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{serverError}</div> : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {modo === 'crear' ? (
            <>
              <Button type="button" variant="ghost" onClick={() => router.push('/cotizaciones')} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="outline"
                onClick={() => setSubmitMode('draft')}
                disabled={isSubmitting || !canEdit}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar como borrador'}
              </Button>
              <Button type="submit" onClick={() => setSubmitMode('send')} disabled={isSubmitting || !canEdit}>
                {isSubmitting ? 'Guardando...' : 'Guardar y enviar'}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (cotizacionInicial?.id) {
                    router.push(`/cotizaciones/${cotizacionInicial.id}`);
                    return;
                  }
                  router.push('/cotizaciones');
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || !canEdit}>
                {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </>
          )}
        </div>
      </form>
    </Form>
  );
}
