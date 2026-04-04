'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Landmark } from 'lucide-react';

import { ConsolidadoFilters } from '@/components/consolidado/consolidado-filters';
import { ConsolidadoPorNegocio } from '@/components/consolidado/consolidado-por-negocio';
import { ConsolidadoResumen } from '@/components/consolidado/consolidado-resumen';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { PageHeader } from '@/components/shared/page-header';
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
        <LoadingSkeleton variant="card" />
      </div>
    );
  }

  if (!user) return null;

  if (!isOwner) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <LoadingSkeleton variant="card" />
      </div>
    );
  }

  if (consolidado.query.isLoading) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <PageHeader title="Consolidado" />
        <LoadingSkeleton variant="card" />
      </div>
    );
  }

  if (consolidado.query.isError) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <PageHeader title="Consolidado" />
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
        <PageHeader title="Consolidado" />
        <EmptyState
          icon={<Landmark className="h-12 w-12 text-muted-foreground" />}
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
      <PageHeader title="Consolidado" />

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

