'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AprobacionTable } from '@/components/movimientos/aprobacion-table';
import { MovimientoDetalleSheet } from '@/components/movimientos/movimiento-detalle-sheet';
import { RechazoDialog } from '@/components/movimientos/rechazo-dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useNegocios } from '@/hooks/use-negocios';
import {
  useAprobarMovimiento,
  useMovimientoDetalle,
  useMovimientoPendientesCount,
  useRechazarMovimiento,
  type MovimientoListItem,
} from '@/hooks/use-movimientos';

const LAST_NEGOCIO_KEY = 'onebusiness_last_negocio';

function safeParseLastNegocio(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(LAST_NEGOCIO_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

type NegocioOption = { id: number; label: string };

export default function AprobacionPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const isOwner = user?.rol === 'Dueño';
  const canManage = user?.rol === 'Dueño' || user?.rol === 'Admin';

  const negociosQuery = useNegocios({ negocioId: undefined, enabled: Boolean(isOwner) });
  const pendientesQuery = useMovimientoPendientesCount();

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

  const [negocioId, setNegocioId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.rol === 'Socio' || user.rol === 'Externo') {
      router.push('/movimientos');
      return;
    }
  }, [router, user]);

  useEffect(() => {
    if (!user) return;
    if (typeof negocioId === 'number') return;

    const last = safeParseLastNegocio();
    const fallback = negocioOptions[0]?.id ?? user.negocios?.[0];
    const next = last && negocioOptions.some((n) => n.id === last) ? last : fallback;

    setNegocioId(typeof next === 'number' ? next : null);
  }, [negocioId, negocioOptions, user]);

  useEffect(() => {
    if (typeof negocioId !== 'number') return;
    localStorage.setItem(LAST_NEGOCIO_KEY, String(negocioId));
  }, [negocioId]);

  const aprobar = useAprobarMovimiento();
  const rechazar = useRechazarMovimiento();

  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [rechazoOpen, setRechazoOpen] = useState(false);
  const [rechazoTarget, setRechazoTarget] = useState<MovimientoListItem | null>(null);

  const detalleQuery = useMovimientoDetalle(detalleId, negocioId);
  const totalPendientes = pendientesQuery.data?.total ?? 0;

  if (isLoading) return null;
  if (!user) return null;
  if (!canManage) return null;

  const handleSelect = (mov: MovimientoListItem) => {
    setDetalleId(mov.id);
    setDetalleOpen(true);
  };

  const handleAprobar = async (mov: MovimientoListItem) => {
    if (typeof negocioId !== 'number') return;
    await aprobar.mutateAsync({ id: mov.id, negocioId });
  };

  const handleOpenRechazo = (mov: MovimientoListItem) => {
    setRechazoTarget(mov);
    setRechazoOpen(true);
  };

  const handleConfirmRechazo = async (motivo: string) => {
    if (!rechazoTarget) return;
    if (typeof negocioId !== 'number') return;
    await rechazar.mutateAsync({ id: rechazoTarget.id, motivoRechazo: motivo, negocioId });
  };

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">Panel de aprobación</h1>
            <Badge variant="outline">{totalPendientes}</Badge>
          </div>
          <p className="text-slate-500">Aprueba o rechaza movimientos pendientes</p>
        </div>
      </div>

      <AprobacionTable
        negocioId={negocioId}
        onNegocioChange={setNegocioId}
        negocioOptions={negocioOptions}
        onSelectMovimiento={handleSelect}
        onAprobar={handleAprobar}
        onRechazar={handleOpenRechazo}
      />

      <MovimientoDetalleSheet
        movimientoId={detalleId}
        negocioId={negocioId}
        open={detalleOpen}
        onOpenChange={setDetalleOpen}
        canManage={canManage}
        onAprobar={() => {
          if (!detalleId || typeof negocioId !== 'number') return;
          aprobar.mutateAsync({ id: detalleId, negocioId });
        }}
        onRechazar={() => {
          if (!detalleId) return;
          setRechazoTarget((detalleQuery.data?.data as MovimientoListItem | undefined) ?? ({ id: detalleId } as MovimientoListItem));
          setRechazoOpen(true);
        }}
      />

      <RechazoDialog
        open={rechazoOpen}
        onOpenChange={setRechazoOpen}
        movimiento={rechazoTarget}
        onConfirm={handleConfirmRechazo}
        isPending={rechazar.isPending}
      />
    </div>
  );
}
