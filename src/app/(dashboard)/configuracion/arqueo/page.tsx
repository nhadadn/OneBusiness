'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Landmark } from 'lucide-react';

import { ArqueoSummary } from '@/components/arqueo/arqueo-summary';
import { ArqueoTable } from '@/components/arqueo/arqueo-table';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { ConfigListLoader } from '@/components/shared/page-loader';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useArqueoNegocio } from '@/hooks/use-arqueo';
import { useAuth } from '@/hooks/use-auth';
import { useNegocios } from '@/hooks/use-negocios';

type NegocioOption = { id: number; label: string };

function getTodayYYYYMMDD(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ArqueoConfigPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!user) return;
    const allowed = user.rol === 'Dueño' || user.rol === 'Admin';
    if (!allowed) {
      router.replace('/dashboard');
    }
  }, [router, user]);

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

  const [negocioId, setNegocioId] = useState<number | null>(null);
  const [fechaCorte, setFechaCorte] = useState<string>(() => getTodayYYYYMMDD());

  useEffect(() => {
    if (!user) return;
    if (typeof negocioId === 'number') return;
    const first = negocioOptions[0]?.id ?? null;
    setNegocioId(first);
  }, [negocioId, negocioOptions, user]);

  const arqueoQuery = useArqueoNegocio({ negocioId, fechaCorte: fechaCorte || undefined });
  const arqueo = arqueoQuery.data?.data ?? null;

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <ConfigListLoader />
      </div>
    );
  }

  if (!user) return null;
  if (user.rol !== 'Dueño' && user.rol !== 'Admin') return null;

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Arqueo</h1>
          <p className="text-slate-600">Revisa saldos calculados vs saldos reales por cuenta y consolidado por negocio.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={negocioId ? String(negocioId) : ''} onValueChange={(val) => setNegocioId(Number(val))}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Seleccionar negocio" />
            </SelectTrigger>
            <SelectContent>
              {negocioOptions.map((opt) => (
                <SelectItem key={opt.id} value={String(opt.id)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="fecha-corte">
              Fecha de corte
            </label>
            <Input
              id="fecha-corte"
              type="date"
              value={fechaCorte}
              onChange={(e) => {
                setFechaCorte(e.target.value);
              }}
              className="w-[240px]"
            />
          </div>
        </div>
      </div>

      {typeof negocioId !== 'number' ? (
        <EmptyState
          icon={<Landmark className="h-12 w-12 text-muted-foreground" />}
          title="Sin negocio seleccionado"
          description="Selecciona un negocio para ver su arqueo."
        />
      ) : arqueoQuery.isLoading ? (
        <ConfigListLoader />
      ) : arqueoQuery.error instanceof Error ? (
        <ErrorState message={arqueoQuery.error.message} onRetry={() => arqueoQuery.refetch()} />
      ) : !arqueo ? (
        <EmptyState
          icon={<Landmark className="h-12 w-12 text-muted-foreground" />}
          title="Sin datos"
          description="No se pudo obtener el arqueo para este negocio."
        />
      ) : arqueo.cuentas.length === 0 ? (
        <EmptyState
          icon={<Landmark className="h-12 w-12 text-muted-foreground" />}
          title="Sin cuentas activas"
          description="Configura cuentas bancarias para ver el arqueo."
        />
      ) : (
        <div className="space-y-6">
          <ArqueoSummary arqueo={arqueo} />
          <ArqueoTable cuentas={arqueo.cuentas} />
        </div>
      )}
    </div>
  );
}

