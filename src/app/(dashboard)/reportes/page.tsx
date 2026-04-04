'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ReporteFilters, periodoToFechas } from '@/components/reportes/reporte-filters';
import { DistribucionNegocioChart } from '@/components/reportes/distribucion-negocio-chart';
import { IngresosEgresosChart } from '@/components/reportes/ingresos-egresos-chart';
import { KpiCards } from '@/components/reportes/kpi-cards';
import { RankingNegociosTable } from '@/components/reportes/ranking-negocios-table';
import { TendenciaBalanceChart } from '@/components/reportes/tendencia-balance-chart';
import { TopCategoriasChart } from '@/components/reportes/top-categorias-chart';
import { PageHeader } from '@/components/shared/page-header';
import { useAuth } from '@/hooks/use-auth';
import { useNegocios } from '@/hooks/use-negocios';
import { useReportes } from '@/hooks/use-reportes';
import { useDashboardContext } from '@/app/(dashboard)/providers';

type Periodo = 'este_mes' | 'mes_anterior' | 'ultimos_3_meses' | 'este_anio';

type NegocioOption = { id: number; nombre: string };

export default function ReportesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { negocioId: dashboardNegocioId, setNegocioId } = useDashboardContext();

  const isAllowed = user?.rol === 'Dueño' || user?.rol === 'Socio';
  const isOwner = user?.rol === 'Dueño';

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (user.rol !== 'Dueño' && user.rol !== 'Socio') {
      router.replace('/dashboard');
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!user) return;
    if (isOwner) return;
    if (typeof dashboardNegocioId === 'number') return;
    const first = user.negocios?.[0] ?? null;
    setNegocioId(typeof first === 'number' ? first : null);
  }, [dashboardNegocioId, isOwner, setNegocioId, user]);

  const [periodo, setPeriodo] = useState<Periodo>('este_anio');
  const [negocioId, setNegocioIdFiltro] = useState<number | null>(null);

  const { fechaDesde, fechaHasta } = periodoToFechas(periodo);

  const negociosQuery = useNegocios({
    negocioId: isOwner ? undefined : typeof dashboardNegocioId === 'number' ? dashboardNegocioId : undefined,
    enabled: Boolean(user) && (isOwner || typeof dashboardNegocioId === 'number'),
  });

  const negocios = useMemo<NegocioOption[]>(() => {
    if (isOwner) {
      const data = negociosQuery.data?.data ?? [];
      return data.map((n) => ({ id: n.id, nombre: n.nombre }));
    }
    if (!user) return [];
    return (user.negocios ?? []).map((id) => ({ id, nombre: `Negocio ${id}` }));
  }, [isOwner, negociosQuery.data?.data, user]);

  const reportes = useReportes({
    fechaDesde,
    fechaHasta,
    negocioId,
    enabled: Boolean(isAllowed),
  });

  const datos = reportes.data?.data;

  if (authLoading) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <KpiCards totalIngresos={0} totalEgresos={0} balance={0} totalPendientes={0} isLoading />
      </div>
    );
  }

  if (!user) return null;

  if (!isAllowed) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <PageHeader title="Reportes" description="Análisis financiero del holding" />
      </div>
    );
  }

  const isLoading = reportes.isLoading;
  const isError = reportes.isError;

  return (
    <div className="container mx-auto space-y-6 py-6">
      <PageHeader title="Reportes" description="Análisis financiero del holding" />

      <ReporteFilters
        periodo={periodo}
        negocioId={negocioId}
        negocios={negocios}
        onPeriodoChange={setPeriodo}
        onNegocioChange={setNegocioIdFiltro}
        disabled={isLoading}
      />

      {isError ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Error al cargar los reportes. Intenta de nuevo.
        </div>
      ) : null}

      <KpiCards
        totalIngresos={datos?.resumenEjecutivo?.totalIngresos ?? 0}
        totalEgresos={datos?.resumenEjecutivo?.totalEgresos ?? 0}
        balance={datos?.resumenEjecutivo?.balance ?? 0}
        totalPendientes={datos?.resumenEjecutivo?.totalPendientes ?? 0}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <IngresosEgresosChart data={datos?.ingresosPorMes ?? []} isLoading={isLoading} />
        <DistribucionNegocioChart data={datos?.distribucionPorNegocio ?? []} isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TendenciaBalanceChart data={datos?.tendenciaBalance ?? []} isLoading={isLoading} />
        <TopCategoriasChart
          datosIngreso={datos?.topCategoriasIngreso ?? []}
          datosEgreso={datos?.topCategoriasEgreso ?? []}
          isLoading={isLoading}
        />
      </div>

      <RankingNegociosTable data={datos?.rankingNegocios ?? []} isLoading={isLoading} />
    </div>
  );
}
