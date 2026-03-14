'use client';

import { useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';

import { BusinessSelector } from '@/components/dashboard/business-selector';
import { BusinessTable } from '@/components/dashboard/business-table';
import { DashboardCharts } from '@/components/dashboard/charts';
import { DashboardStats } from '@/components/dashboard/dashboard-stats';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { EmptyState } from '@/components/shared/empty-state';
import { DashboardLoader } from '@/components/shared/page-loader';
import { useAuth } from '@/hooks/use-auth';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const [selectedNegocio, setSelectedNegocio] = useState<number | null>(null);

  const isDueño = user?.rol === 'Dueño';
  const canSelectNegocio = isDueño || user?.rol === 'Admin' || user?.rol === 'Socio';
  const isSocio = user?.rol === 'Socio';
  const isExterno = user?.rol === 'Externo';

  const negociosToShow = useMemo(() => {
    if (!user) return [];
    if (isDueño) return 'all' as const;
    return user.negocios;
  }, [isDueño, user]);

  const effectiveNegocioId = useMemo(() => {
    if (!user) return undefined;
    if (isDueño) return selectedNegocio ?? undefined;
    if (canSelectNegocio && selectedNegocio !== null) {
      return selectedNegocio;
    }
    return user.negocios[0] ?? undefined;
  }, [isDueño, canSelectNegocio, selectedNegocio, user]);

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <DashboardLoader />
      </div>
    );
  }
  if (!user) return null;
  if (!isDueño && (user.negocios?.length ?? 0) === 0) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <EmptyState
          icon={Building2}
          title="Sin negocios asignados"
          description="No tienes negocios asignados. Contacta a un administrador para que te asigne acceso."
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
          <p className="text-slate-600">
            Bienvenido, {user.nombre} ({user.rol})
          </p>
        </div>

        {canSelectNegocio && (
          <BusinessSelector
            value={selectedNegocio}
            onChange={setSelectedNegocio}
            negocioIds={isDueño ? undefined : user!.negocios}
          />
        )}
      </div>

      <DashboardStats negocios={negociosToShow} selectedNegocio={selectedNegocio} rol={user.rol} />

      <DashboardCharts negocios={negociosToShow} selectedNegocio={selectedNegocio} rol={user.rol} negocioId={effectiveNegocioId} />

      <BusinessTable negocioId={selectedNegocio ?? undefined} />

      {!isExterno && !isSocio && <QuickActions rol={user.rol} />}

      {isSocio && (
        <div className="flex justify-end">
          <QuickActions rol={user.rol} />
        </div>
      )}
    </div>
  );
}
