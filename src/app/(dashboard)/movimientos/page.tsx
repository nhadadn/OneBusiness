'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

import { MovimientosFilters } from '@/components/movimientos/movimientos-filters';
import { MovimientosTable } from '@/components/movimientos/movimientos-table';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useNegocios } from '@/hooks/use-negocios';
import type { MovimientosFilters as FiltersState } from '@/hooks/use-movimientos';

const LAST_NEGOCIO_KEY = 'onebusiness_last_negocio';

function toISODate(d: Date) {
  return d.toISOString().split('T')[0]!;
}

function getDefaultRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { fechaDesde: toISODate(start), fechaHasta: toISODate(now) };
}

function safeParseLastNegocio(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(LAST_NEGOCIO_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

type NegocioOption = { id: number; label: string };

export default function MovimientosPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const isOwner = user?.rol === 'Dueño';

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

    const last = safeParseLastNegocio();
    const fallback = negocioOptions[0]?.id ?? user.negocios?.[0];
    const next = last && negocioOptions.some((n) => n.id === last) ? last : fallback;

    if (typeof next === 'number') {
      setFilters((prev) => ({ ...prev, negocioId: next }));
    }
  }, [filters.negocioId, negocioOptions, user]);

  useEffect(() => {
    if (typeof filters.negocioId !== 'number') return;
    localStorage.setItem(LAST_NEGOCIO_KEY, String(filters.negocioId));
  }, [filters.negocioId]);

  if (isLoading) return null;
  if (!user) return null;

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Movimientos</h1>
          <p className="text-slate-500">Lista y crea movimientos por negocio</p>
        </div>

        <Button onClick={() => router.push('/movimientos/nuevo')}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo movimiento
        </Button>
      </div>

      <MovimientosFilters filters={filters} onChange={setFilters} negocioOptions={negocioOptions} />

      <MovimientosTable filters={filters} />
    </div>
  );
}
