'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';

import { MovimientosFilters } from '@/components/movimientos/movimientos-filters';
import { MovimientosTable } from '@/components/movimientos/movimientos-table';
import { MovimientosLoader } from '@/components/shared/page-loader';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useNegocios } from '@/hooks/use-negocios';
import type { MovimientosFilters as FiltersState } from '@/hooks/use-movimientos';

function toISODate(d: Date) {
  return d.toISOString().split('T')[0]!;
}

function getDefaultRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { fechaDesde: toISODate(start), fechaHasta: toISODate(now) };
}


type NegocioOption = { id: number; label: string };

export default function MovimientosPage() {
  const { user, isLoading } = useAuth();
  const isOwner = user?.rol === 'Dueño';
  const canCreate = user?.rol !== 'Externo';

  const negociosQuery = useNegocios({ negocioId: undefined, enabled: Boolean(isOwner) });

  const negocioOptions = useMemo<NegocioOption[]>(() => {
    if (!user) return [];
    if (isOwner) {
      const apiItems = negociosQuery.data?.data ?? [];
      if (apiItems.length > 0) {
        return apiItems.map((n) => ({ id: n.id, label: n.nombre?.trim() ? n.nombre : `Negocio ${n.id}` }));
      }
    }
    return (user.negocios ?? []).map((id) => ({ id, label: `Negocio ${id}` }));
  }, [isOwner, negociosQuery.data?.data, user]);

  const [filters, setFilters] = useState<FiltersState>(() => {
    const range = getDefaultRange();
    return {
      negocioId: undefined,
      estado: undefined,
      tipo: undefined,
      fechaDesde: range.fechaDesde,
      fechaHasta: range.fechaHasta,
      page: 1,
      limit: 50,
    };
  });

  useEffect(() => {
    if (!user) return;
    if (typeof filters.negocioId === 'number') return;

    const fallback = negocioOptions[0]?.id ?? user.negocios?.[0];
    const next = fallback;

    if (typeof next === 'number') {
      setFilters((prev) => ({ ...prev, negocioId: next }));
    }
  }, [filters.negocioId, negocioOptions, user]);

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
        <div>
          <h1 className="text-3xl font-bold">Movimientos</h1>
          <p className="text-slate-600">Lista y crea movimientos por negocio</p>
        </div>

        {canCreate ? (
          <Button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('onebusiness:new-movimiento-open'));
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo movimiento
          </Button>
        ) : null}
      </div>

      <MovimientosFilters filters={filters} onChange={setFilters} negocioOptions={negocioOptions} />

      <MovimientosTable filters={filters} />
    </div>
  );
}
