'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Settings } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { SaldosBancoCard } from '@/components/dashboard/saldos-banco-card';

import { useAuth } from '@/hooks/use-auth';
import { useApiClient } from '@/hooks/use-api-client';

type PeriodKey = 'este_mes' | 'mes_anterior' | 'ultimos_3_meses' | 'este_ano';

type Semaforo = 'verde' | 'amarillo' | 'rojo';

type ResumenNegocio = {
  negocioId: number;
  nombre: string;
  totalIngresos: number;
  totalEgresos: number;
  balance: number;
  cantidadMovimientos: number;
  cantidadPendientes: number;
  semaforo: Semaforo;
};

type DashboardResumenGlobalResponse = {
  success: boolean;
  data: {
    resumenPorNegocio: ResumenNegocio[];
    totalesGlobales: { totalIngresos: number; totalEgresos: number; balance: number };
    negociosCriticos: ResumenNegocio[];
    negociosAlerta: ResumenNegocio[];
  };
  error?: string;
};

type NegocioResumenResponse = {
  success: boolean;
  data: ResumenNegocio;
  error?: string;
};

type MovimientosListItem = {
  id: number;
  negocioId: number;
  fecha: string;
  concepto: string;
  tercero: string | null;
  tipo: 'INGRESO' | 'EGRESO' | 'TRASPASO_SALIDA' | 'TRASPASO_ENTRADA';
  monto: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  cuentaBanco: { id: number; nombre: string };
};

type MovimientosListResponse = {
  success: boolean;
  data: {
    items: MovimientosListItem[];
    movimientos?: MovimientosListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages?: number;
  };
  error?: string;
};

function toISODate(d: Date) {
  return d.toISOString().split('T')[0]!;
}

function getPeriodRange(period: PeriodKey): { fechaDesde: string; fechaHasta: string } {
  const now = new Date();
  if (period === 'este_mes') {
    return { fechaDesde: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)), fechaHasta: toISODate(now) };
  }
  if (period === 'mes_anterior') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { fechaDesde: toISODate(start), fechaHasta: toISODate(end) };
  }
  if (period === 'ultimos_3_meses') {
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return { fechaDesde: toISODate(start), fechaHasta: toISODate(now) };
  }
  return { fechaDesde: toISODate(new Date(now.getFullYear(), 0, 1)), fechaHasta: toISODate(now) };
}

function semaforoRank(value: Semaforo) {
  if (value === 'rojo') return 0;
  if (value === 'amarillo') return 1;
  return 2;
}

function useSelectedNegocioId() {
  const [negocioId, setNegocioId] = React.useState<number | null>(null);

  React.useEffect(() => {
    const raw = localStorage.getItem('lastNegocioId');
    const parsed = raw ? Number(raw) : Number.NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
      setNegocioId(parsed);
    }
  }, []);

  React.useEffect(() => {
    const handler = (event: Event) => {
      const raw = (event as CustomEvent).detail as { negocioId?: unknown } | undefined;
      const parsed = typeof raw?.negocioId === 'number' ? raw.negocioId : Number(raw?.negocioId);
      if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed <= 0) return;
      setNegocioId(parsed);
    };

    window.addEventListener('onebusiness:negocio-changed', handler as EventListener);
    return () => window.removeEventListener('onebusiness:negocio-changed', handler as EventListener);
  }, []);

  return negocioId;
}

type UmbralesValues = {
  umbralAlerta: string;
  umbralCritico: string;
};

function parseNumberOrNull(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return null;
  return parsed;
}

const umbralesSchema = z
  .object({
    umbralAlerta: z.string().default(''),
    umbralCritico: z.string().default(''),
  })
  .superRefine((data, ctx) => {
    const alertaRaw = data.umbralAlerta.trim();
    const criticoRaw = data.umbralCritico.trim();

    const alerta = alertaRaw ? Number(alertaRaw) : null;
    const critico = criticoRaw ? Number(criticoRaw) : null;

    if (alertaRaw && (!Number.isFinite(alerta as number) || Number.isNaN(alerta as number))) {
      ctx.addIssue({ code: 'custom', message: 'Número inválido', path: ['umbralAlerta'] });
    }
    if (criticoRaw && (!Number.isFinite(critico as number) || Number.isNaN(critico as number))) {
      ctx.addIssue({ code: 'custom', message: 'Número inválido', path: ['umbralCritico'] });
    }

    if (alerta !== null && critico !== null && critico >= alerta) {
      ctx.addIssue({
        code: 'custom',
        message: 'El umbral crítico debe ser menor que el umbral de alerta',
        path: ['umbralCritico'],
      });
    }
  });

function SemaforoDot({ value }: { value: Semaforo }) {
  const cls =
    value === 'rojo'
      ? 'bg-destructive'
      : value === 'amarillo'
        ? 'bg-amber-500'
        : 'bg-emerald-500';
  return <span className={cn('inline-flex h-3 w-3 rounded-full', cls)} aria-hidden="true" />;
}

function MetricCard({
  title,
  value,
  className,
  valueClassName,
}: {
  title: string;
  value: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <Card className={cn('border-border bg-card shadow-none', className)}>
      <CardHeader className="p-4">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className={cn('mt-2 text-2xl font-semibold text-foreground', valueClassName)}>{value}</div>
      </CardHeader>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { apiFetch } = useApiClient();
  const selectedNegocioId = useSelectedNegocioId();

  const [period, setPeriod] = React.useState<PeriodKey>('este_mes');
  const [globalData, setGlobalData] = React.useState<DashboardResumenGlobalResponse['data'] | null>(null);
  const [globalLoading, setGlobalLoading] = React.useState(false);
  const [globalError, setGlobalError] = React.useState<string | null>(null);

  const [operativoResumen, setOperativoResumen] = React.useState<ResumenNegocio | null>(null);
  const [operativoMovs, setOperativoMovs] = React.useState<MovimientosListItem[]>([]);
  const [operativoLoading, setOperativoLoading] = React.useState(false);
  const [operativoError, setOperativoError] = React.useState<string | null>(null);

  const [umbralesDialog, setUmbralesDialog] = React.useState<{ open: boolean; negocio: ResumenNegocio | null }>({
    open: false,
    negocio: null,
  });

  const [umbralesByNegocio, setUmbralesByNegocio] = React.useState<Record<number, UmbralesValues | undefined>>({});

  const umbralesForm = useForm<UmbralesValues>({
    resolver: zodResolver(umbralesSchema) as unknown as Resolver<UmbralesValues>,
    defaultValues: { umbralAlerta: '', umbralCritico: '' },
  });

  const isDueño = user?.rol === 'Dueño';
  const isSocio = user?.rol === 'Socio';
  const isAdmin = user?.rol === 'Admin';
  const isExterno = user?.rol === 'Externo';

  const canSeeGlobal = isDueño || isSocio;

  const periodRange = React.useMemo(() => getPeriodRange(period), [period]);

  const loadResumenGlobal = React.useCallback(async () => {
    setGlobalLoading(true);
    setGlobalError(null);

    try {
      const url = `/api/dashboard/resumen-global?fechaDesde=${encodeURIComponent(periodRange.fechaDesde)}&fechaHasta=${encodeURIComponent(periodRange.fechaHasta)}`;
      const res = await apiFetch(url, { headers: { 'Cache-Control': 'no-store' } });
      const json = (await res.json().catch(() => null)) as DashboardResumenGlobalResponse | null;

      if (!res.ok || !json?.success) {
        const message = json?.error ?? 'No se pudo cargar el resumen global';
        setGlobalData(null);
        setGlobalError(message);
        return;
      }

      setGlobalData(json.data);
    } catch (e) {
      setGlobalData(null);
      setGlobalError(e instanceof Error ? e.message : 'No se pudo cargar el resumen global');
    } finally {
      setGlobalLoading(false);
    }
  }, [apiFetch, periodRange.fechaDesde, periodRange.fechaHasta]);

  const loadOperativo = React.useCallback(
    async (negocioId: number) => {
      setOperativoLoading(true);
      setOperativoError(null);

      try {
        const resumenUrl = `/api/negocios/${negocioId}/resumen?fechaDesde=${encodeURIComponent(periodRange.fechaDesde)}&fechaHasta=${encodeURIComponent(periodRange.fechaHasta)}`;
        const movsUrl = `/api/movimientos?negocioId=${encodeURIComponent(String(negocioId))}&fechaDesde=${encodeURIComponent(periodRange.fechaDesde)}&fechaHasta=${encodeURIComponent(periodRange.fechaHasta)}&page=1&limit=5`;

        const [resResumen, resMovs] = await Promise.all([
          apiFetch(resumenUrl, { headers: { 'Cache-Control': 'no-store' } }),
          apiFetch(movsUrl, { headers: { 'Cache-Control': 'no-store' }, negocioId }),
        ]);

        const jsonResumen = (await resResumen.json().catch(() => null)) as NegocioResumenResponse | null;
        const jsonMovs = (await resMovs.json().catch(() => null)) as MovimientosListResponse | null;

        if (!resResumen.ok || !jsonResumen?.success) {
          throw new Error(jsonResumen?.error ?? 'No se pudo cargar el resumen del negocio');
        }

        if (!resMovs.ok || !jsonMovs?.success) {
          throw new Error(jsonMovs?.error ?? 'No se pudieron cargar los movimientos');
        }

        setOperativoResumen(jsonResumen.data);
        setOperativoMovs(jsonMovs.data.movimientos ?? jsonMovs.data.items ?? []);
      } catch (e) {
        setOperativoResumen(null);
        setOperativoMovs([]);
        setOperativoError(e instanceof Error ? e.message : 'No se pudieron cargar los datos');
      } finally {
        setOperativoLoading(false);
      }
    },
    [apiFetch, periodRange.fechaDesde, periodRange.fechaHasta]
  );

  React.useEffect(() => {
    if (!user) return;
    if (!canSeeGlobal) return;
    void loadResumenGlobal();
  }, [canSeeGlobal, loadResumenGlobal, user]);

  React.useEffect(() => {
    if (!user) return;
    if (!isAdmin && !isExterno) return;
    if (typeof selectedNegocioId !== 'number') return;
    void loadOperativo(selectedNegocioId);
  }, [isAdmin, isExterno, loadOperativo, selectedNegocioId, user]);

  React.useEffect(() => {
    if (!umbralesDialog.open) return;
    const negocio = umbralesDialog.negocio;
    if (!negocio) return;

    const saved = umbralesByNegocio[negocio.negocioId];
    umbralesForm.reset(saved ?? { umbralAlerta: '', umbralCritico: '' });
  }, [umbralesByNegocio, umbralesDialog.negocio, umbralesDialog.open, umbralesForm]);

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <LoadingSkeleton variant="card" rows={4} />
      </div>
    );
  }

  if (!user) return null;

  if (!isDueño && (user.negocios?.length ?? 0) === 0) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <EmptyState
          icon={<Building2 className="h-12 w-12 text-muted-foreground" />}
          title="Sin negocios asignados"
          description="No tienes negocios asignados. Contacta a un administrador para que te asigne acceso."
        />
      </div>
    );
  }

  if (canSeeGlobal) {
    if (globalLoading) {
      return (
        <div className="container mx-auto space-y-6 py-6">
          <LoadingSkeleton variant="card" rows={4} />
        </div>
      );
    }

    if (globalError) {
      return (
        <div className="container mx-auto space-y-6 py-6">
          <ErrorState message={globalError} onRetry={() => void loadResumenGlobal()} />
        </div>
      );
    }

    const items = (globalData?.resumenPorNegocio ?? []).slice().sort((a, b) => {
      const rank = semaforoRank(a.semaforo) - semaforoRank(b.semaforo);
      if (rank !== 0) return rank;
      return a.nombre.localeCompare(b.nombre);
    });

    return (
      <div className="container mx-auto space-y-6 py-6">
        <PageHeader title="Dashboard" description={`Bienvenido, ${user.nombre} (${user.rol})`} />

        <section className="space-y-3">
          <div className="text-sm font-semibold text-foreground">Semáforo de negocios</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((n) => {
              const pending = n.cantidadPendientes ?? 0;
              const pendingLabel = pending === 1 ? 'pendiente' : 'pendientes';
              const balanceLabel = formatCurrency(n.balance);

              return (
                <Card
                  key={n.negocioId}
                  className="cursor-pointer border-border bg-card shadow-none transition-colors hover:bg-accent"
                  onClick={() => {
                    localStorage.setItem('lastNegocioId', String(n.negocioId));
                    window.dispatchEvent(new CustomEvent('onebusiness:negocio-changed', { detail: { negocioId: n.negocioId } }));
                    router.push('/movimientos');
                  }}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold text-foreground">{n.nombre?.trim() ? n.nombre : `Negocio ${n.negocioId}`}</div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <SemaforoDot value={n.semaforo} />
                          <span className="capitalize">{n.semaforo}</span>
                        </div>
                      </div>

                      {isDueño ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUmbralesDialog({ open: true, negocio: n });
                          }}
                          aria-label="Configurar umbrales"
                        >
                          <Settings className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      ) : null}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-0">
                    <div className={cn('text-2xl font-semibold', n.balance < 0 ? 'text-destructive' : 'text-foreground')}>
                      {balanceLabel}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className={cn('text-sm', pending > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                        {pending} {pendingLabel}
                      </div>
                      {pending > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          Requiere acción
                        </span>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="text-sm font-semibold text-foreground">Resumen financiero consolidado</div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricCard
              title="Total ingresos"
              value={formatCurrency(globalData?.totalesGlobales.totalIngresos ?? 0)}
              valueClassName="text-emerald-600"
            />
            <MetricCard
              title="Total egresos"
              value={formatCurrency(globalData?.totalesGlobales.totalEgresos ?? 0)}
              valueClassName="text-destructive"
            />
            <MetricCard
              title="Balance neto"
              value={formatCurrency(globalData?.totalesGlobales.balance ?? 0)}
              valueClassName={(globalData?.totalesGlobales.balance ?? 0) < 0 ? 'text-destructive' : 'text-emerald-600'}
            />
          </div>

          <SaldosBancoCard negocioId={selectedNegocioId} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Período: {periodRange.fechaDesde} → {periodRange.fechaHasta}
            </div>
            <div className="w-full sm:w-[220px]">
              <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Seleccionar período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="este_mes">Este mes</SelectItem>
                  <SelectItem value="mes_anterior">Mes anterior</SelectItem>
                  <SelectItem value="ultimos_3_meses">Últimos 3 meses</SelectItem>
                  <SelectItem value="este_ano">Este año</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <Dialog
          open={umbralesDialog.open}
          onOpenChange={(open) => setUmbralesDialog((prev) => ({ ...prev, open }))}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurar umbrales</DialogTitle>
              <DialogDescription>
                {umbralesDialog.negocio ? (umbralesDialog.negocio.nombre?.trim() ? umbralesDialog.negocio.nombre : `Negocio ${umbralesDialog.negocio.negocioId}`) : 'Negocio'}
              </DialogDescription>
            </DialogHeader>

            <Form {...umbralesForm}>
              <form
                onSubmit={umbralesForm.handleSubmit(async (values) => {
                  const target = umbralesDialog.negocio;
                  if (!target) return;

                  try {
                    const payload = {
                      umbralAlerta: parseNumberOrNull(values.umbralAlerta),
                      umbralCritico: parseNumberOrNull(values.umbralCritico),
                    };

                    const res = await apiFetch(`/api/negocios/${target.negocioId}/umbrales`, {
                      method: 'PATCH',
                      body: JSON.stringify(payload),
                    });
                    const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;

                    if (!res.ok || !json?.success) {
                      throw new Error(json?.error ?? 'No se pudieron guardar los umbrales');
                    }

                    setUmbralesByNegocio((prev) => ({ ...prev, [target.negocioId]: values }));

                    const resumenUrl = `/api/negocios/${target.negocioId}/resumen?fechaDesde=${encodeURIComponent(periodRange.fechaDesde)}&fechaHasta=${encodeURIComponent(periodRange.fechaHasta)}`;
                    const resResumen = await apiFetch(resumenUrl, { headers: { 'Cache-Control': 'no-store' } });
                    const jsonResumen = (await resResumen.json().catch(() => null)) as NegocioResumenResponse | null;
                    if (resResumen.ok && jsonResumen?.success) {
                      setGlobalData((prev) => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          resumenPorNegocio: prev.resumenPorNegocio.map((n) =>
                            n.negocioId === target.negocioId ? jsonResumen.data : n
                          ),
                        };
                      });
                    }

                    toast.success('Umbrales guardados', { duration: 2500 });
                    setUmbralesDialog({ open: false, negocio: null });
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'No se pudieron guardar los umbrales', { duration: 5000 });
                  }
                })}
                className="space-y-4"
              >
                <FormField
                  control={umbralesForm.control}
                  name="umbralAlerta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Umbral alerta</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" inputMode="decimal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={umbralesForm.control}
                  name="umbralCritico"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Umbral crítico</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" inputMode="decimal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setUmbralesDialog({ open: false, negocio: null })}>
                    Cancelar
                  </Button>
                  <Button type="submit">Guardar</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (isAdmin || isExterno) {
    if (typeof selectedNegocioId !== 'number') {
      return (
        <div className="container mx-auto space-y-6 py-6">
          <EmptyState
            icon={<Building2 className="h-12 w-12 text-muted-foreground" />}
            title="Selecciona un negocio"
            description="Selecciona un negocio en el header para ver el resumen."
          />
        </div>
      );
    }

    if (operativoLoading) {
      return (
        <div className="container mx-auto space-y-6 py-6">
          <LoadingSkeleton variant="card" rows={4} />
        </div>
      );
    }

    if (operativoError) {
      return (
        <div className="container mx-auto space-y-6 py-6">
          <ErrorState message={operativoError} onRetry={() => void loadOperativo(selectedNegocioId)} />
        </div>
      );
    }

    const balance = operativoResumen?.balance ?? 0;
    const pendientes = operativoResumen?.cantidadPendientes ?? 0;

    return (
      <div className="container mx-auto space-y-6 py-6">
        <PageHeader title="Dashboard" description={`Bienvenido, ${user.nombre} (${user.rol})`} />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard title="Pendientes" value={`${pendientes}`} />
          <MetricCard
            title="Balance (período)"
            value={formatCurrency(balance)}
            valueClassName={balance < 0 ? 'text-destructive' : 'text-emerald-600'}
          />
          <MetricCard title="Movimientos recientes" value={`${operativoMovs.length}`} />
        </div>

        <SaldosBancoCard negocioId={selectedNegocioId} />

        {isAdmin ? (
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                router.push('/movimientos/aprobacion');
              }}
              disabled={pendientes === 0}
            >
              Ir a aprobar pendientes
            </Button>
          </div>
        ) : null}

        <Card className="border-border bg-card shadow-none">
          <CardHeader className="p-4">
            <CardTitle className="text-base text-foreground">Últimos movimientos</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {operativoMovs.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sin movimientos para el período.</div>
            ) : (
              <div className="space-y-3">
                {operativoMovs.map((m) => {
                  const monto = formatCurrency(Number(m.monto) || 0);
                  return (
                    <div key={m.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-foreground">{m.concepto}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{m.fecha}</div>
                      </div>
                      <div className={cn('shrink-0 text-sm font-mono', m.tipo === 'EGRESO' ? 'text-destructive' : 'text-foreground')}>
                        {m.tipo === 'EGRESO' ? `-${monto}` : monto}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 py-6">
      <ErrorState message="Rol no soportado para dashboard." />
    </div>
  );
}
