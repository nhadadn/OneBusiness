'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ArrowLeft, Download, Loader2, MoreVertical, Pencil, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { AprobarCotizacionDialog } from '@/components/cotizaciones/aprobar-cotizacion-dialog';
import { CancelarCotizacionDialog } from '@/components/cotizaciones/cancelar-cotizacion-dialog';
import { CotizacionEstadoBadge } from '@/components/cotizaciones/cotizacion-estado-badge';
import { EnviarCotizacionDialog } from '@/components/cotizaciones/enviar-cotizacion-dialog';
import { FacturarCotizacionDialog } from '@/components/cotizaciones/facturar-cotizacion-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApiClient } from '@/hooks/use-api-client';
import { useAuth } from '@/hooks/use-auth';
import type { Categoria } from '@/types/categoria.types';
import type { EstadoCotizacion } from '@/types/cotizacion.types';
import type { NegocioListItem } from '@/types/negocio.types';

type CotizacionItem = {
  id: number;
  cotizacionId: number;
  orden: number;
  descripcion: string;
  unidadMedida: string | null;
  cantidad: string | null;
  precioUnitario: string | null;
  importe: string;
};

type CotizacionDetalle = {
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
  notas: string | null;
  creadoPor: number;
  createdAt: string;
  updatedAt: string;
  items: CotizacionItem[];
};

type CotizacionResponse = {
  success: boolean;
  data?: CotizacionDetalle;
  error?: string;
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

type UsuarioResponse = {
  success: boolean;
  data?: { id: number; nombreCompleto: string };
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

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function parseMoney(raw: unknown) {
  const num = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(num) && !Number.isNaN(num) ? num : 0;
}

function formatCurrencyMXN(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

function formatDateDMY(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('es-MX');
}

function CotizacionDetalleSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3 space-y-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-3 h-4 w-64" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <Skeleton className="h-5 w-40" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <Skeleton className="h-5 w-32" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CotizacionDetallePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { apiFetch } = useApiClient();

  const canEdit = user ? user.rol !== 'Externo' : false;
  const canManage = user?.rol === 'Dueño' || user?.rol === 'Admin';

  const [data, setData] = React.useState<CotizacionDetalle | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statusCode, setStatusCode] = React.useState<number | null>(null);

  const [negocioNombre, setNegocioNombre] = React.useState<string | null>(null);
  const [negocioDetalle, setNegocioDetalle] = React.useState<NegocioDetalle | null>(null);
  const [categorias, setCategorias] = React.useState<Categoria[]>([]);
  const [creadoPorNombre, setCreadoPorNombre] = React.useState<string | null>(null);

  const [dialog, setDialog] = React.useState<null | 'enviar' | 'aprobar' | 'facturar' | 'cancelar'>(null);

  const fetchCotizacion = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setStatusCode(null);
    try {
      const res = await apiFetch(`/api/cotizaciones/${params.id}`, { headers: { 'Cache-Control': 'no-store' } });
      const json = (await res.json().catch(() => ({}))) as CotizacionResponse;

      if (!res.ok || !json.success || !json.data) {
        setStatusCode(res.status);
        setData(null);
        setError(json.error ?? 'No se pudo cargar la cotización');
        return;
      }

      setData(json.data);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'No se pudo cargar la cotización');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, params.id]);

  React.useEffect(() => {
    void fetchCotizacion();
  }, [fetchCotizacion]);

  React.useEffect(() => {
    if (!data) return;
    let active = true;

    const fetchExtra = async () => {
      try {
        const [negociosRes, negocioDetalleRes, categoriasRes, usuarioRes] = await Promise.all([
          apiFetch('/api/negocios', { headers: { 'Cache-Control': 'no-store' }, negocioId: data.negocioId }),
          apiFetch(`/api/negocios/${data.negocioId}`, { headers: { 'Cache-Control': 'no-store' }, negocioId: data.negocioId }),
          apiFetch('/api/categorias', { headers: { 'Cache-Control': 'no-store' }, negocioId: data.negocioId }),
          apiFetch(`/api/usuarios/${data.creadoPor}`, { headers: { 'Cache-Control': 'no-store' }, negocioId: data.negocioId }),
        ]);

        const negociosJson = (await negociosRes.json().catch(() => ({}))) as NegociosResponse;
        const detalleJson = (await negocioDetalleRes.json().catch(() => ({}))) as NegocioDetalleResponse;
        const categoriasJson = (await categoriasRes.json().catch(() => ({}))) as CategoriasResponse;
        const usuarioJson = (await usuarioRes.json().catch(() => ({}))) as UsuarioResponse;

        if (!active) return;

        if (negociosRes.ok && negociosJson.success && Array.isArray(negociosJson.data) && negociosJson.data[0]) {
          setNegocioNombre(negociosJson.data[0].nombre);
        } else {
          setNegocioNombre(null);
        }

        if (negocioDetalleRes.ok && detalleJson.success && detalleJson.data) {
          setNegocioDetalle({
            rfc: detalleJson.data.rfc ?? null,
            direccion: detalleJson.data.direccion ?? null,
            telefono: detalleJson.data.telefono ?? null,
          });
        } else {
          setNegocioDetalle(null);
        }

        if (categoriasRes.ok && categoriasJson.success && Array.isArray(categoriasJson.data)) {
          setCategorias(categoriasJson.data);
        } else {
          setCategorias([]);
        }

        if (usuarioRes.ok && usuarioJson.success && usuarioJson.data?.nombreCompleto) {
          setCreadoPorNombre(usuarioJson.data.nombreCompleto);
        } else {
          setCreadoPorNombre(null);
        }
      } catch {
        if (!active) return;
        setNegocioNombre(null);
        setNegocioDetalle(null);
        setCategorias([]);
        setCreadoPorNombre(null);
      }
    };

    void fetchExtra();

    return () => {
      active = false;
    };
  }, [apiFetch, data]);

  const totals = React.useMemo(() => {
    const subtotal = (data?.items ?? []).reduce((acc, item) => acc + parseMoney(item.importe), 0);
    const iva = round2(subtotal * 0.16);
    const total = round2(subtotal + iva);
    return { subtotal, iva, total };
  }, [data?.items]);

  const categoriaNombre = React.useMemo(() => {
    if (!data?.categoriaId) return null;
    const found = categorias.find((c) => c.id === data.categoriaId);
    return found?.nombre ?? null;
  }, [categorias, data?.categoriaId]);

  const canShowEditButton = Boolean(data && canEdit && (data.estado === 'BORRADOR' || data.estado === 'ENVIADA'));

  const actionItems = React.useMemo(() => {
    if (!data) return { canEnviar: false, canAprobar: false, canFacturar: false, canCancelar: false };
    return {
      canEnviar: data.estado === 'BORRADOR' && canEdit,
      canAprobar: data.estado === 'ENVIADA' && canManage,
      canFacturar: data.estado === 'APROBADA' && canManage,
      canCancelar: (data.estado === 'BORRADOR' || data.estado === 'ENVIADA' || data.estado === 'APROBADA') && canManage,
    };
  }, [canEdit, canManage, data]);

  const hasAnyAction = actionItems.canEnviar || actionItems.canAprobar || actionItems.canFacturar || actionItems.canCancelar;

  const [pdfDownloading, setPdfDownloading] = React.useState(false);

  const handleDownloadPdf = React.useCallback(async () => {
    if (!data) return;
    setPdfDownloading(true);
    try {
      const res = await apiFetch(`/api/cotizaciones/${data.id}/pdf`, { negocioId: data.negocioId });
      if (!res.ok) {
        toast.error('No se pudo generar el PDF', { duration: 5000 });
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = `cotizacion-${data.folio}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo generar el PDF', { duration: 5000 });
    } finally {
      setPdfDownloading(false);
    }
  }, [apiFetch, data]);

  if (loading) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-64" />
        </div>
        <CotizacionDetalleSkeleton />
      </div>
    );
  }

  if (statusCode === 404) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <EmptyState
          icon={Send}
          title="Cotización no encontrada"
          description="La cotización no existe o fue eliminada."
          action={{ label: 'Volver a cotizaciones', onClick: () => router.push('/cotizaciones') }}
        />
      </div>
    );
  }

  if (statusCode === 403) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <ErrorState message="No tienes acceso a esta cotización" />
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => router.push('/cotizaciones')}>
            Volver a cotizaciones
          </Button>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <ErrorState message={error ?? 'No se pudo cargar la cotización'} onRetry={() => fetchCotizacion()} />
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => router.push('/cotizaciones')}>
            Volver a cotizaciones
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Button variant="ghost" onClick={() => router.push('/cotizaciones')}>
            <ArrowLeft className="h-4 w-4" />
            Cotizaciones
          </Button>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">Folio:</div>
            <Badge variant="outline" className="font-mono">
              {data.folio}
            </Badge>
          </div>
          <CotizacionEstadoBadge estado={data.estado} />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {canShowEditButton ? (
            <Button variant="outline" onClick={() => router.push(`/cotizaciones/${data.id}/editar`)}>
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          ) : null}

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="outline" disabled={!hasAnyAction}>
                <MoreVertical className="h-4 w-4" />
                Acciones
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="z-50 min-w-[220px] rounded-md border border-slate-200 bg-white p-1 shadow-md"
              >
                {actionItems.canEnviar ? (
                  <DropdownMenu.Item
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm text-slate-900 outline-none hover:bg-slate-100"
                    onSelect={() => setDialog('enviar')}
                  >
                    <Send className="h-4 w-4" />
                    Enviar
                  </DropdownMenu.Item>
                ) : null}

                {actionItems.canAprobar ? (
                  <DropdownMenu.Item
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm text-slate-900 outline-none hover:bg-slate-100"
                    onSelect={() => setDialog('aprobar')}
                  >
                    <Send className="h-4 w-4" />
                    Aprobar
                  </DropdownMenu.Item>
                ) : null}

                {actionItems.canFacturar ? (
                  <DropdownMenu.Item
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm text-slate-900 outline-none hover:bg-slate-100"
                    onSelect={() => setDialog('facturar')}
                  >
                    <Send className="h-4 w-4" />
                    Facturar
                  </DropdownMenu.Item>
                ) : null}

                {actionItems.canCancelar ? (
                  <>
                    <div className="my-1 h-px bg-slate-200" />
                    <DropdownMenu.Item
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm text-slate-900 outline-none hover:bg-slate-100"
                      onSelect={() => setDialog('cancelar')}
                    >
                      <Trash2 className="h-4 w-4" />
                      Cancelar
                    </DropdownMenu.Item>
                  </>
                ) : null}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <Button variant="outline" onClick={handleDownloadPdf} disabled={pdfDownloading}>
            {pdfDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {pdfDownloading ? 'Generando PDF...' : 'Descargar PDF'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Detalle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Datos del emisor</div>
                <div className="font-semibold">{negocioNombre ?? `Negocio ${data.negocioId}`}</div>
                <div className="text-sm text-muted-foreground">
                  RFC: {negocioDetalle?.rfc?.trim() ? negocioDetalle.rfc : 'No configurado'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {negocioDetalle?.direccion?.trim() ? negocioDetalle.direccion : 'No configurada'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {negocioDetalle?.telefono?.trim() ? negocioDetalle.telefono : 'No configurado'}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</div>
                <div className="font-semibold">{data.clienteNombre}</div>
                <div className="text-sm text-muted-foreground">RFC: {data.clienteRfc?.trim() ? data.clienteRfc : '—'}</div>
                <div className="text-sm text-muted-foreground">{data.clienteDireccion?.trim() ? data.clienteDireccion : '—'}</div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Líneas de detalle</div>
                <div className="rounded-lg border border-border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[48px]">#</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="w-[80px]">UM</TableHead>
                        <TableHead className="w-[90px] text-right">Cant</TableHead>
                        <TableHead className="w-[120px] text-right">Precio Unit.</TableHead>
                        <TableHead className="w-[120px] text-right">Importe</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data.items ?? []).map((item, idx) => (
                        <TableRow key={item.id ?? idx}>
                          <TableCell className="text-sm text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="max-w-[360px]">
                            <div className="font-medium">{item.descripcion}</div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.unidadMedida?.trim() ? item.unidadMedida : '—'}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{item.cantidad ? parseMoney(item.cantidad).toString() : '—'}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {item.precioUnitario ? formatCurrencyMXN(parseMoney(item.precioUnitario)) : '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatCurrencyMXN(parseMoney(item.importe))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-1 text-right text-sm">
                  <div className="flex justify-end gap-3">
                    <div className="text-muted-foreground">Subtotal:</div>
                    <div className="w-[140px] font-mono">{formatCurrencyMXN(totals.subtotal)}</div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <div className="text-muted-foreground">IVA 16%:</div>
                    <div className="w-[140px] font-mono">{formatCurrencyMXN(totals.iva)}</div>
                  </div>
                  <div className="flex justify-end gap-3 font-semibold">
                    <div>Total:</div>
                    <div className="w-[140px] font-mono">{formatCurrencyMXN(totals.total)}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Metadatos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-muted-foreground">Folio:</div>
                <div className="text-right font-mono">{data.folio}</div>
                <div className="text-muted-foreground">Fecha:</div>
                <div className="text-right">{formatDateDMY(data.fecha)}</div>
                <div className="text-muted-foreground">Estado:</div>
                <div className="text-right">
                  <CotizacionEstadoBadge estado={data.estado} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="text-muted-foreground">Número OC:</div>
                <div className="text-right">{data.numeroOc?.trim() ? data.numeroOc : '—'}</div>
                <div className="text-muted-foreground">Nº Factura:</div>
                <div className="text-right">{data.numeroFactura?.trim() ? data.numeroFactura : '—'}</div>
                <div className="text-muted-foreground">Cuenta:</div>
                <div className="text-right">{data.cuentaBancoId ? `#${data.cuentaBancoId}` : '—'}</div>
                <div className="text-muted-foreground">Categoría:</div>
                <div className="text-right">{categoriaNombre ?? '—'}</div>
              </div>

              <div className="space-y-2">
                <div className="text-muted-foreground">Movimiento asociado:</div>
                {data.movimientoId ? (
                  <Button variant="outline" className="w-full" onClick={() => router.push('/movimientos')}>
                    Ver movimiento #{data.movimientoId}
                  </Button>
                ) : (
                  <div>—</div>
                )}
              </div>

              <div className="space-y-1">
                <div className="text-muted-foreground">Notas:</div>
                <div className="whitespace-pre-wrap">{data.notas?.trim() ? data.notas : '—'}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="text-muted-foreground">Creado por:</div>
                <div className="text-right">{creadoPorNombre ?? `Usuario #${data.creadoPor}`}</div>
                <div className="text-muted-foreground">Fecha:</div>
                <div className="text-right">{formatDateDMY(data.createdAt)}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <EnviarCotizacionDialog
        open={dialog === 'enviar'}
        onOpenChange={(open) => setDialog(open ? 'enviar' : null)}
        cotizacion={{ id: data.id, folio: data.folio, clienteNombre: data.clienteNombre }}
        onSuccess={() => {
          void fetchCotizacion();
        }}
      />
      <AprobarCotizacionDialog
        open={dialog === 'aprobar'}
        onOpenChange={(open) => setDialog(open ? 'aprobar' : null)}
        cotizacion={{ id: data.id, folio: data.folio, clienteNombre: data.clienteNombre }}
        onSuccess={() => {
          void fetchCotizacion();
        }}
      />
      <FacturarCotizacionDialog
        open={dialog === 'facturar'}
        onOpenChange={(open) => setDialog(open ? 'facturar' : null)}
        cotizacion={{ id: data.id, folio: data.folio, negocioId: data.negocioId, total: String(totals.total), categoriaId: data.categoriaId }}
        onSuccess={() => {
          void fetchCotizacion();
        }}
      />
      <CancelarCotizacionDialog
        open={dialog === 'cancelar'}
        onOpenChange={(open) => setDialog(open ? 'cancelar' : null)}
        cotizacion={{ id: data.id, folio: data.folio }}
        onSuccess={() => {
          void fetchCotizacion();
        }}
      />
    </div>
  );
}
