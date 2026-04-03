'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, CircleCheck, Loader2, Search, Upload, X } from 'lucide-react';

import { MovimientosTable, useMovimientoInlineModeration } from '@/components/movimientos/movimientos-table';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/format';
import { useDashboardContext } from '@/app/(dashboard)/providers';
import { useAuth } from '@/hooks/use-auth';
import { useMovimientos } from '@/hooks/use-movimientos';
import { usePendingCount } from '@/hooks/use-pending-count';
import type { MovimientosFilters as FiltersState, MovimientoListItem } from '@/hooks/use-movimientos';
import type { EstadoMovimiento, TipoMovimiento } from '@/types/movimiento.types';

function toISODate(d: Date) {
  return d.toISOString().split('T')[0]!;
}

function getDefaultRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { fechaDesde: toISODate(start), fechaHasta: toISODate(now) };
}

function parseMoney(raw: string) {
  const num = Number(raw);
  return Number.isFinite(num) && !Number.isNaN(num) ? num : 0;
}

function formatDateDMY(value: string) {
  const [y, m, d] = value.split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

type EstadoTabKey = 'all' | 'approved' | 'pending' | 'rejected' | 'paid' | 'canceled';
type PeriodPreset = 'this_month' | 'last_month' | 'last_3_months' | 'custom';

function getEstadoFromTab(tab: EstadoTabKey): EstadoMovimiento | undefined {
  if (tab === 'approved') return 'APROBADO';
  if (tab === 'pending') return 'PENDIENTE';
  if (tab === 'rejected') return 'RECHAZADO';
  if (tab === 'paid') return 'PAGADO';
  if (tab === 'canceled') return 'CANCELADO';
  return undefined;
}

function getRangeFromPreset(preset: PeriodPreset) {
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
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return { fechaDesde: toISODate(start), fechaHasta: toISODate(now) };
  }
  return getDefaultRange();
}

export default function MovimientosPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { negocioId, openNewMovimiento } = useDashboardContext();
  const pendingCountQuery = usePendingCount();
  const canManage = user?.rol === 'Dueño' || user?.rol === 'Admin';
  const canImport = user?.rol === 'Dueño' || user?.rol === 'Socio' || user?.rol === 'Admin';
  const pendingCount = pendingCountQuery.data?.count;

  const [pendientesPage, setPendientesPage] = useState(1);
  useEffect(() => {
    setPendientesPage(1);
  }, [negocioId]);

  const pendientesQuery = useMovimientos({
    negocioId: typeof negocioId === 'number' ? negocioId : undefined,
    estado: 'PENDIENTE',
    page: pendientesPage,
    limit: 10,
  });

  const moderation = useMovimientoInlineModeration({
    negocioId: typeof negocioId === 'number' ? negocioId : undefined,
  });

  const pendientesItems = useMemo(() => {
    const base = pendientesQuery.data?.items ?? [];
    return base
      .map((mov) => {
        const nextEstado = moderation.optimisticEstado[mov.id];
        return nextEstado ? { ...mov, estado: nextEstado } : mov;
      })
      .filter((mov) => mov.estado === 'PENDIENTE');
  }, [moderation.optimisticEstado, pendientesQuery.data?.items]);

  const pendientesTotal = pendientesQuery.data?.total ?? 0;
  const pendientesTotalPages = Math.max(1, Math.ceil(pendientesTotal / 10));
  const pendientesCanPrev = pendientesPage > 1;
  const pendientesCanNext = pendientesPage < pendientesTotalPages;

  const [estadoTab, setEstadoTab] = useState<EstadoTabKey>('all');
  const [tipoFilter, setTipoFilter] = useState<'all' | 'INGRESO' | 'EGRESO'>('all');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('this_month');
  const [customDesde, setCustomDesde] = useState(getDefaultRange().fechaDesde);
  const [customHasta, setCustomHasta] = useState(getDefaultRange().fechaHasta);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const historyRange = useMemo(() => {
    if (periodPreset !== 'custom') return getRangeFromPreset(periodPreset);
    return { fechaDesde: customDesde, fechaHasta: customHasta };
  }, [customDesde, customHasta, periodPreset]);

  const historyFilters = useMemo<FiltersState>(() => {
    return {
      negocioId: typeof negocioId === 'number' ? negocioId : undefined,
      estado: getEstadoFromTab(estadoTab),
      tipo: tipoFilter === 'all' ? undefined : (tipoFilter as TipoMovimiento),
      fechaDesde: historyRange.fechaDesde,
      fechaHasta: historyRange.fechaHasta,
      page: 1,
      limit: 20,
    };
  }, [estadoTab, historyRange.fechaDesde, historyRange.fechaHasta, negocioId, tipoFilter]);

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <LoadingSkeleton variant="table" rows={5} />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="container mx-auto space-y-6 py-6">
      <PageHeader
        title="Movimientos"
        description="Dashboard operativo de aprobación e historial"
        action={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
            {canImport ? (
              <Button variant="outline" onClick={() => router.push('/importar-movimientos')}>
                <Upload className="h-4 w-4" aria-hidden="true" />
                Importar
              </Button>
            ) : null}
            <Button
              variant="default"
              onClick={openNewMovimiento}
            >
              Nuevo movimiento
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="text-base font-semibold">Por aprobar</div>
                  {typeof pendingCount === 'number' ? <Badge variant="outline">{pendingCount}</Badge> : null}
                </div>
                <div className="text-sm text-muted-foreground">{typeof negocioId === 'number' ? `Negocio ${negocioId}` : 'Selecciona un negocio'}</div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {typeof negocioId !== 'number' ? (
                <EmptyState
                  icon={<CircleCheck className="h-12 w-12 text-muted-foreground" />}
                  title="Sin negocio seleccionado"
                  description="Selecciona un negocio para ver pendientes."
                />
              ) : pendientesQuery.isLoading ? (
                <LoadingSkeleton variant="table" rows={5} />
              ) : pendientesQuery.error instanceof Error ? (
                <ErrorState message={pendientesQuery.error.message} onRetry={() => pendientesQuery.refetch()} />
              ) : pendientesItems.length === 0 ? (
                <EmptyState
                  icon={<CircleCheck className="h-12 w-12 text-muted-foreground" />}
                  title="Todo al día"
                  description="Todo al día — no hay movimientos por aprobar"
                />
              ) : (
                <div className="rounded-lg border border-border bg-background">
                  <div className="divide-y divide-border">
                    {pendientesItems.map((mov: MovimientoListItem) => {
                      const amount = formatCurrency(parseMoney(mov.monto));
                      const isApproving = moderation.action?.type === 'aprobar' && moderation.action.id === mov.id;
                      const isRejecting = moderation.action?.type === 'rechazar' && moderation.action.id === mov.id;
                      const disabled = isApproving || isRejecting;
                      return (
                        <div key={mov.id} className="flex items-start gap-3 p-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-xs text-muted-foreground">{formatDateDMY(mov.fecha)}</div>
                              <div
                                className={`font-mono text-sm ${mov.tipo === 'INGRESO' ? 'text-emerald-700' : mov.tipo === 'EGRESO' ? 'text-red-700' : 'text-slate-700'}`}
                              >
                                {amount}
                              </div>
                            </div>
                            <div className="mt-1 truncate text-sm font-medium text-foreground">{mov.concepto}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>{mov.tercero ?? '—'}</span>
                            </div>
                          </div>

                          {canManage ? (
                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => moderation.handleApprove(mov)}
                                disabled={disabled}
                                aria-label="Aprobar"
                                className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                              >
                                {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => moderation.handleReject(mov)}
                                disabled={disabled}
                                aria-label="Rechazar"
                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {typeof negocioId === 'number' && pendientesTotalPages > 1 ? (
                <div className="flex items-center justify-between">
                  <Button type="button" variant="outline" size="sm" onClick={() => setPendientesPage((p) => Math.max(1, p - 1))} disabled={!pendientesCanPrev}>
                    Anterior
                  </Button>
                  <div className="text-sm text-slate-600">{`Página ${pendientesPage} de ${pendientesTotalPages}`}</div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setPendientesPage((p) => p + 1)} disabled={!pendientesCanNext}>
                    Siguiente
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="lg:col-span-8">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { key: 'all', label: 'Todos' },
                    { key: 'paid', label: 'Pagados' },
                    { key: 'approved', label: 'Aprobados' },
                    { key: 'pending', label: 'Pendientes' },
                    { key: 'rejected', label: 'Rechazados' },
                    { key: 'canceled', label: 'Cancelados' },
                  ] as const
                ).map((tab) => (
                  <Button
                    key={tab.key}
                    type="button"
                    variant={estadoTab === tab.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEstadoTab(tab.key)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="w-full md:w-[190px]">
                    <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v as typeof tipoFilter)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="INGRESO">Ingresos</SelectItem>
                        <SelectItem value="EGRESO">Egresos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full md:w-[220px]">
                    <Select value={periodPreset} onValueChange={(v) => setPeriodPreset(v as PeriodPreset)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Período" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="this_month">Este mes</SelectItem>
                        <SelectItem value="last_month">Mes anterior</SelectItem>
                        <SelectItem value="last_3_months">Últimos 3 meses</SelectItem>
                        <SelectItem value="custom">Rango personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {periodPreset === 'custom' ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input type="date" value={customDesde} onChange={(e) => setCustomDesde(e.target.value)} />
                      <Input type="date" value={customHasta} onChange={(e) => setCustomHasta(e.target.value)} />
                    </div>
                  ) : null}
                </div>

                <div className="relative w-full md:max-w-[320px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Buscar por concepto..."
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <MovimientosTable filters={historyFilters} search={debouncedSearch} />
            </div>
          </div>
        </section>
      </div>

      {moderation.dialogs}
    </div>
  );
}
