'use client';

import { useEffect, useMemo, useState } from 'react';

import { BusinessSelector } from '@/components/dashboard/business-selector';
import { BusinessTable } from '@/components/dashboard/business-table';
import { DashboardCharts } from '@/components/dashboard/charts';
import { DashboardStats } from '@/components/dashboard/dashboard-stats';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { useAuth } from '@/hooks/use-auth';

const SELECTED_NEGOCIO_KEY = 'onebusiness_selected_negocio';

function parseSelectedNegocio(raw: string | null): number | null {
  if (!raw) return null;
  if (raw === 'all') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const [selectedNegocio, setSelectedNegocio] = useState<number | null>(null);

  useEffect(() => {
    const stored = parseSelectedNegocio(localStorage.getItem(SELECTED_NEGOCIO_KEY));
    setSelectedNegocio(stored);
  }, []);

  useEffect(() => {
    localStorage.setItem(SELECTED_NEGOCIO_KEY, selectedNegocio === null ? 'all' : String(selectedNegocio));
  }, [selectedNegocio]);

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

  if (isLoading) return null;
  if (!user) return null;

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1e3a5f]">Dashboard</h1>
          <p className="text-slate-500">
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
