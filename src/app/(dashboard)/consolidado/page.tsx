'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Landmark } from 'lucide-react';

import { ConsolidadoFilters } from '@/components/consolidado/consolidado-filters';
import { ConsolidadoPorNegocio } from '@/components/consolidado/consolidado-por-negocio';
import { ConsolidadoResumen } from '@/components/consolidado/consolidado-resumen';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { DashboardGlobalLoader } from '@/components/shared/page-loader';
import { useAuth } from '@/hooks/use-auth';
import { useConsolidado } from '@/hooks/use-consolidado';

export default function ConsolidadoPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const isOwner = user?.rol === 'Dueño';
  const consolidado = useConsolidado({ enabled: Boolean(isOwner) });

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (user.rol !== 'Dueño') {
      router.replace('/dashboard');
    }
  }, [authLoading, router, user]);

  if (authLoading) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <DashboardGlobalLoader />
      </div>
    );
  }

  if (!user) return null;

  if (!isOwner) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <DashboardGlobalLoader />
      </div>
    );
  }

  if (consolidado.query.isLoading) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <div>
          <h1 className="text-3xl font-bold">Consolidado</h1>
          <p className="text-slate-600">Vista consolidada por negocio con saldos al corte</p>
        </div>
        <DashboardGlobalLoader />
      </div>
    );
  }

  if (consolidado.query.isError) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <div>
          <h1 className="text-3xl font-bold">Consolidado</h1>
          <p className="text-slate-600">Vista consolidada por negocio con saldos al corte</p>
        </div>
        <ErrorState
          message={consolidado.query.error?.message ?? 'No se pudo cargar el consolidado.'}
          onRetry={() => {
            void consolidado.query.refetch();
          }}
        />
      </div>
    );
  }

  const data = consolidado.query.data?.data;

  if (!data) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <div>
          <h1 className="text-3xl font-bold">Consolidado</h1>
          <p className="text-slate-600">Vista consolidada por negocio con saldos al corte</p>
        </div>
        <EmptyState
          icon={Landmark}
          title="Sin información"
          description="No hay datos disponibles para el periodo seleccionado."
          action={{
            label: 'Restablecer filtros',
            onClick: consolidado.resetFilters,
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Consolidado</h1>
          <p className="text-slate-600">Vista consolidada por negocio con saldos al corte</p>
        </div>
      </div>

      <ConsolidadoFilters
        filters={consolidado.filters}
        setEstado={consolidado.setEstado}
        setTipo={consolidado.setTipo}
        setFechaDesde={consolidado.setFechaDesde}
        setFechaHasta={consolidado.setFechaHasta}
        onReset={consolidado.resetFilters}
        disabled={consolidado.query.isFetching}
      />

      <ConsolidadoResumen resumen={data.resumenGlobal} />

      <ConsolidadoPorNegocio negocios={data.negocios} />
    </div>
  );
}

