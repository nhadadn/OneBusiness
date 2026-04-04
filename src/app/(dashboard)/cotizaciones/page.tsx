'use client';

import * as React from 'react';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Eye, MoreVertical, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { CotizacionEstadoBadge } from '@/components/cotizaciones/cotizacion-estado-badge';
import { AprobarCotizacionDialog } from '@/components/cotizaciones/aprobar-cotizacion-dialog';
import { CancelarCotizacionDialog } from '@/components/cotizaciones/cancelar-cotizacion-dialog';
import { EnviarCotizacionDialog } from '@/components/cotizaciones/enviar-cotizacion-dialog';
import { FacturarCotizacionDialog } from '@/components/cotizaciones/facturar-cotizacion-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { MovimientosLoader } from '@/components/shared/page-loader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import { useApiClient } from '@/hooks/use-api-client';
import { useAuth } from '@/hooks/use-auth';
import type { EstadoCotizacion } from '@/types/cotizacion.types';
import type { NegocioListItem } from '@/types/negocio.types';

function toISODate(d: Date) {
  return d.toISOString().split('T')[0]!;
}

function formatDateDMY(value: string) {
  const [y, m, d] = value.split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function parseMoney(raw: string) {
  const num = Number(raw);
  return Number.isFinite(num) && !Number.isNaN(num) ? num : 0;
}

type PeriodPreset = 'all' | 'this_month' | 'last_month' | 'last_3_months' | 'this_year';

function getRangeFromPreset(preset: PeriodPreset): { fechaDesde?: string; fechaHasta?: string } {
  const now = new Date();

  if (preset === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { fechaDesde: toISODate(start), fechaHasta: toISODate(now) };
  }

  if (preset === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { fechaDesde: toISODate(start), fechaHasta: toISODate(end) };
  }

  if (preset === 'last_3_months') {
    const start = new Date(now);
    start.setDate(start.getDate() - 90);
    return { fechaDesde: toISODate(start), fechaHasta: toISODate(now) };
  }

  if (preset === 'this_year') {
    const start = new Date(now.getFullYear(), 0, 1);
    return { fechaDesde: toISODate(start), fechaHasta: toISODate(now) };
  }

  return {};
}

type CotizacionListItem = {
  id: number;
  negocioId: number;
  folio: string;
  clienteNombre: string;
  fecha: string;
  estado: EstadoCotizacion;
  total: string;
  movimientoId: number | null;
  categoriaId: number | null;
  primerConcepto: string | null;
};

type CotizacionesListResponse = {
  success: boolean;
  data: {
    items: CotizacionListItem[];
    total: number;
    page: number;
    totalPages: number;
  };
  error?: string;
};

type NegociosResponse = {
  success: boolean;
  data: NegocioListItem[];
  error?: string;
};

function CotizacionesTableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col" className="w-[120px]">
              Folio
            </TableHead>
            <TableHead scope="col" className="w-[100px]">
              Fecha
            </TableHead>
            <TableHead scope="col">Cliente</TableHead>
            <TableHead scope="col">Concepto</TableHead>
            <TableHead scope="col" className="w-[110px] text-right">
              Total
            </TableHead>
            <TableHead scope="col" className="w-[110px]">
              Estado
            </TableHead>
            <TableHead scope="col" className="w-[80px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-48" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-64" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="ml-auto h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-24 rounded-full" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="ml-auto h-8 w-8" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function CotizacionesPage() {
  const { user, isLoading } = useAuth();
  const { apiFetch } = useApiClient();
  const router = useRouter();

  const canManage = user?.rol === 'Dueño' || user?.rol === 'Admin';
  const canEdit = user?.rol !== 'Externo';

  const [negocios, setNegocios] = useState<NegocioListItem[]>([]);
  const [negociosLoading, setNegociosLoading] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [estado, setEstado] = useState<'all' | EstadoCotizacion>('all');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('all');
  const [negocioFilter, setNegocioFilter] = useState<'all' | string>('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const tableTopRef = useRef<HTMLDivElement | null>(null);

  const [data, setData] = useState<CotizacionesListResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [dialog, setDialog] = useState<null | 'enviar' | 'aprobar' | 'facturar' | 'cancelar'>(null);
  const [selected, setSelected] = useState<CotizacionListItem | null>(null);

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const range = useMemo(() => getRangeFromPreset(periodPreset), [periodPreset]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, estado, periodPreset, negocioFilter]);

  React.useEffect(() => {
    if (!user) return;
    let active = true;

    const fetchNegocios = async () => {
      setNegociosLoading(true);
      try {
        if (user.rol === 'Dueño') {
          const res = await apiFetch('/api/negocios', { headers: { 'Cache-Control': 'no-store' } });
          if (!res.ok) throw new Error('No se pudieron cargar los negocios');
          const json = (await res.json()) as NegociosResponse;
          if (!active) return;
          setNegocios(Array.isArray(json.data) ? json.data : []);
          return;
        }

        const ids = Array.isArray(user.negocios) ? user.negocios : [];
        const results = await Promise.all(
          ids.map(async (id) => {
            const res = await apiFetch('/api/negocios', { headers: { 'Cache-Control': 'no-store' }, negocioId: id });
            if (!res.ok) return [];
            const json = (await res.json()) as NegociosResponse;
            return Array.isArray(json.data) ? json.data : [];
          })
        );
        const merged = results.flat();
        const unique = new Map<number, NegocioListItem>();
        for (const n of merged) unique.set(n.id, n);
        if (!active) return;
        setNegocios(Array.from(unique.values()));
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

  const fetchCotizaciones = React.useCallback(async () => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));

    if (debouncedSearch.trim()) {
      params.set('busqueda', debouncedSearch.trim());
    }
    if (estado !== 'all') {
      params.set('estado', estado);
    }
    if (range.fechaDesde) {
      params.set('fechaDesde', range.fechaDesde);
    }
    if (range.fechaHasta) {
      params.set('fechaHasta', range.fechaHasta);
    }
    if (negocioFilter !== 'all') {
      params.set('negocioId', negocioFilter);
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/cotizaciones?${params.toString()}`, { headers: { 'Cache-Control': 'no-store' } });
      const json = (await res.json().catch(() => ({}))) as CotizacionesListResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'No se pudieron cargar las cotizaciones');
      }

      setData(json.data);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las cotizaciones');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, debouncedSearch, estado, limit, negocioFilter, page, range.fechaDesde, range.fechaHasta]);

  React.useEffect(() => {
    if (!user) return;
    void fetchCotizaciones();
  }, [fetchCotizaciones, refreshTick, user]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const canPrev = page > 1;
  const canNext = totalPages > 0 && page < totalPages;

  const showingFrom = total === 0 ? 0 : (page - 1) * limit + 1;
  const showingTo = total === 0 ? 0 : Math.min(page * limit, total);

  const handleDelete = async (cotizacion: CotizacionListItem) => {
    if (!canManage) return;
    const ok = window.confirm(`¿Eliminar la cotización ${cotizacion.folio}? Esta acción no se puede deshacer.`);
    if (!ok) return;

    try {
      const res = await apiFetch(`/api/cotizaciones/${cotizacion.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? 'No se pudo eliminar la cotización');
        return;
      }
      toast.success('Cotización eliminada');
      setRefreshTick((v) => v + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar la cotización');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <MovimientosLoader />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-3xl font-bold">Cotizaciones</h1>
        <Button onClick={() => router.push('/cotizaciones/nueva')}>
          <Plus className="h-4 w-4" />
          Nueva cotización
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Buscar por folio o cliente..." />
        </div>

        <div className="lg:col-span-2">
          <Select value={estado} onValueChange={(v) => setEstado(v as typeof estado)}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="BORRADOR">Borrador</SelectItem>
              <SelectItem value="ENVIADA">Enviada</SelectItem>
              <SelectItem value="APROBADA">Aprobada</SelectItem>
              <SelectItem value="FACTURADA">Facturada</SelectItem>
              <SelectItem value="CANCELADA">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="lg:col-span-3">
          <Select value={periodPreset} onValueChange={(v) => setPeriodPreset(v as PeriodPreset)}>
            <SelectTrigger>
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="this_month">Este mes</SelectItem>
              <SelectItem value="last_month">Mes anterior</SelectItem>
              <SelectItem value="last_3_months">Últimos 3 meses</SelectItem>
              <SelectItem value="this_year">Este año</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="lg:col-span-3">
          <Select value={negocioFilter} onValueChange={(v) => setNegocioFilter(v as typeof negocioFilter)} disabled={negociosLoading}>
            <SelectTrigger>
              <SelectValue placeholder={negociosLoading ? 'Cargando...' : 'Negocio'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los negocios</SelectItem>
              {negocios.map((n) => (
                <SelectItem key={n.id} value={String(n.id)}>
                  {n.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div ref={tableTopRef} />

      {loading ? (
        <CotizacionesTableSkeleton rows={limit} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchCotizaciones()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Send className="h-12 w-12 text-muted-foreground" />}
          title="No hay cotizaciones"
          description="No hay cotizaciones con los filtros actuales."
          action={{ label: 'Crear primera cotización', onClick: () => router.push('/cotizaciones/nueva') }}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="w-[120px]">
                  Folio
                </TableHead>
                <TableHead scope="col" className="w-[100px]">
                  Fecha
                </TableHead>
                <TableHead scope="col">Cliente</TableHead>
                <TableHead scope="col">Concepto</TableHead>
                <TableHead scope="col" className="w-[110px] text-right">
                  Total
                </TableHead>
                <TableHead scope="col" className="w-[110px]">
                  Estado
                </TableHead>
                <TableHead scope="col" className="w-[80px] text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => {
                const totalLabel = formatCurrency(parseMoney(row.total));
                return (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/cotizaciones/${row.id}`)}
                  >
                    <TableCell className="w-[120px]">
                      <Badge variant="outline" className="font-mono">
                        {row.folio}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-[100px] text-sm text-muted-foreground">{formatDateDMY(row.fecha)}</TableCell>
                    <TableCell className="max-w-[260px] truncate font-medium">{row.clienteNombre}</TableCell>
                    <TableCell className="max-w-[360px] truncate text-sm text-muted-foreground">
                      {row.primerConcepto ?? '—'}
                    </TableCell>
                    <TableCell className="w-[110px] text-right font-mono">{totalLabel}</TableCell>
                    <TableCell className="w-[110px]">
                      <CotizacionEstadoBadge estado={row.estado} />
                    </TableCell>
                    <TableCell className="w-[80px] text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <Button variant="ghost" size="sm" aria-label="Acciones" className="h-9 w-9 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            align="end"
                            sideOffset={6}
                            className="z-50 min-w-[200px] rounded-md border border-border bg-popover p-1 shadow-md"
                          >
                            <DropdownMenu.Item
                              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm text-foreground outline-none hover:bg-slate-100"
                              onSelect={() => router.push(`/cotizaciones/${row.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                              Ver detalle
                            </DropdownMenu.Item>

                            {(row.estado === 'BORRADOR' || row.estado === 'ENVIADA') && canEdit ? (
                              <DropdownMenu.Item
                                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm text-foreground outline-none hover:bg-slate-100"
                                onSelect={() => router.push(`/cotizaciones/${row.id}/editar`)}
                              >
                                <Pencil className="h-4 w-4" />
                                Editar
                              </DropdownMenu.Item>
                            ) : null}

                            {row.estado === 'FACTURADA' && row.movimientoId ? (
                              <DropdownMenu.Item
                                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm text-foreground outline-none hover:bg-slate-100"
                                onSelect={() => router.push(`/movimientos/${row.movimientoId}`)}
                              >
                                <Eye className="h-4 w-4" />
                                Ver movimiento
                              </DropdownMenu.Item>
                            ) : null}

                            <div className="my-1 h-px bg-slate-200" />

                            {row.estado === 'BORRADOR' ? (
                              <DropdownMenu.Item
                                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm text-foreground outline-none hover:bg-slate-100"
                                onSelect={() => {
                                  setSelected(row);
                                  setDialog('enviar');
                                }}
                              >
                                <Send className="h-4 w-4" />
                                Enviar
                              </DropdownMenu.Item>
                            ) : null}

                            {row.estado === 'ENVIADA' && canManage ? (
                              <DropdownMenu.Item
                                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm text-foreground outline-none hover:bg-slate-100"
                                onSelect={() => {
                                  setSelected(row);
                                  setDialog('aprobar');
                                }}
                              >
                                <Send className="h-4 w-4" />
                                Aprobar
                              </DropdownMenu.Item>
                            ) : null}

                            {row.estado === 'APROBADA' && canManage ? (
                              <DropdownMenu.Item
                                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm text-foreground outline-none hover:bg-slate-100"
                                onSelect={() => {
                                  setSelected(row);
                                  setDialog('facturar');
                                }}
                              >
                                <Send className="h-4 w-4" />
                                Facturar
                              </DropdownMenu.Item>
                            ) : null}

                            {(row.estado === 'ENVIADA' || row.estado === 'APROBADA') && canManage ? (
                              <DropdownMenu.Item
                                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm text-foreground outline-none hover:bg-slate-100"
                                onSelect={() => {
                                  setSelected(row);
                                  setDialog('cancelar');
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Cancelar
                              </DropdownMenu.Item>
                            ) : null}

                            {row.estado === 'BORRADOR' && canManage ? (
                              <DropdownMenu.Item
                                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm text-red-700 outline-none hover:bg-red-50"
                                onSelect={() => {
                                  void handleDelete(row);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Eliminar
                              </DropdownMenu.Item>
                            ) : null}
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">{`Mostrando ${showingFrom}-${showingTo} de ${total} cotizaciones`}</div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const next = Math.max(1, page - 1);
              setPage(next);
              tableTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            disabled={!canPrev}
          >
            ← Anterior
          </Button>
          <div className="text-sm text-muted-foreground">{`Página ${page} de ${Math.max(1, totalPages)}`}</div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPage((p) => p + 1);
              tableTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            disabled={!canNext}
          >
            Siguiente →
          </Button>
        </div>
      </div>

      <EnviarCotizacionDialog
        open={dialog === 'enviar'}
        onOpenChange={(open) => setDialog(open ? 'enviar' : null)}
        cotizacion={selected ? { id: selected.id, folio: selected.folio, clienteNombre: selected.clienteNombre } : null}
        onSuccess={() => setRefreshTick((v) => v + 1)}
      />
      <AprobarCotizacionDialog
        open={dialog === 'aprobar'}
        onOpenChange={(open) => setDialog(open ? 'aprobar' : null)}
        cotizacion={selected ? { id: selected.id, folio: selected.folio, clienteNombre: selected.clienteNombre } : null}
        onSuccess={() => setRefreshTick((v) => v + 1)}
      />
      <FacturarCotizacionDialog
        open={dialog === 'facturar'}
        onOpenChange={(open) => setDialog(open ? 'facturar' : null)}
        cotizacion={
          selected
            ? {
                id: selected.id,
                folio: selected.folio,
                negocioId: selected.negocioId,
                total: selected.total,
                categoriaId: selected.categoriaId,
              }
            : null
        }
        onSuccess={() => setRefreshTick((v) => v + 1)}
      />
      <CancelarCotizacionDialog
        open={dialog === 'cancelar'}
        onOpenChange={(open) => setDialog(open ? 'cancelar' : null)}
        cotizacion={selected ? { id: selected.id, folio: selected.folio } : null}
        onSuccess={() => setRefreshTick((v) => v + 1)}
      />
    </div>
  );
}
