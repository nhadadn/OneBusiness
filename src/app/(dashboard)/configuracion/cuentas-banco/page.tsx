'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HelpCircle, Plus } from 'lucide-react';

import { CuentaBancoDialog } from '@/components/cuentas-banco/cuenta-banco-dialog';
import { CuentasBancoTable } from '@/components/cuentas-banco/cuentas-banco-table';
import { SaldoRealDialog } from '@/components/cuentas-banco/saldo-real-dialog';
import { FeatureTour } from '@/components/shared';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cuentasBancoTourSteps } from '@/lib/tours/cuentas-banco-tour';
import { useAuth } from '@/hooks/use-auth';
import { useNegocios } from '@/hooks/use-negocios';
import type { CuentaBancoListItem } from '@/hooks/use-cuentas-banco';
import { useTour } from '@/hooks/use-tour';

type NegocioOption = { id: number; label: string };

export default function CuentasBancoPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const cuentasTour = useTour('cuentas-banco');

  useEffect(() => {
    if (!user) return;
    if (user.rol === 'Externo') {
      router.push('/movimientos');
    }
  }, [user, router]);

  const isOwner = user?.rol === 'Dueño';
  const canManage = user?.rol === 'Dueño' || user?.rol === 'Admin';

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saldoDialogOpen, setSaldoDialogOpen] = useState(false);
  const [selectedCuenta, setSelectedCuenta] = useState<CuentaBancoListItem | null>(null);
  const [selectedSaldoCuenta, setSelectedSaldoCuenta] = useState<CuentaBancoListItem | null>(null);

  useEffect(() => {
    if (!user) return;
    if (typeof negocioId === 'number') return;
    const first = negocioOptions[0]?.id ?? null;
    setNegocioId(first);
  }, [negocioId, negocioOptions, user]);

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <LoadingSkeleton variant="table" rows={5} />
      </div>
    );
  }
  if (!user) return null;
  if (user.rol === 'Externo') return null;

  const handleCreate = () => {
    setSelectedCuenta(null);
    setDialogOpen(true);
  };

  const handleEdit = (cuenta: CuentaBancoListItem) => {
    setSelectedCuenta(cuenta);
    setDialogOpen(true);
  };

  const handleEditSaldo = (cuenta: CuentaBancoListItem) => {
    setSelectedSaldoCuenta(cuenta);
    setSaldoDialogOpen(true);
  };

  const needsInitialSelection = negocioOptions.length > 0 && typeof negocioId !== 'number';

  return (
    <>
      {cuentasTour.shouldShowTour ? (
        <FeatureTour tourId="cuentas-banco" steps={cuentasBancoTourSteps} onComplete={cuentasTour.markTourCompleted} />
      ) : null}

      <div className="container mx-auto space-y-6 py-6">
        <PageHeader
          title="Cuentas Bancarias"
          description="Gestiona cuentas bancarias y saldos por negocio"
          action={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                aria-label="Ver guía de la página"
                onClick={cuentasTour.resetTour}
              >
                <HelpCircle className="h-4 w-4" aria-hidden="true" />
              </Button>
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

              {canManage && (
                <Button variant="default" onClick={handleCreate} disabled={typeof negocioId !== 'number'} data-tour="cuentas-new">
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva cuenta
                </Button>
              )}
            </div>
          }
        />

        {needsInitialSelection ? (
          <LoadingSkeleton variant="table" rows={5} />
        ) : (
          <div data-tour="cuentas-table">
            <CuentasBancoTable negocioId={negocioId} onEdit={handleEdit} onEditSaldo={handleEditSaldo} onCreate={handleCreate} />
          </div>
        )}

        <CuentaBancoDialog open={dialogOpen} onOpenChange={setDialogOpen} cuenta={selectedCuenta} negocioId={negocioId} />

        <SaldoRealDialog
          open={saldoDialogOpen}
          onOpenChange={setSaldoDialogOpen}
          cuenta={selectedSaldoCuenta}
          negocioId={negocioId}
        />
      </div>
    </>
  );
}
