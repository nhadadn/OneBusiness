'use client';

import * as React from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { MovimientoForm } from '@/components/movimientos/movimiento-form';
import { TraspasoForm } from '@/components/movimientos/traspaso-form';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useDashboardContext } from '@/app/(dashboard)/providers';
import { useApiClient } from '@/hooks/use-api-client';

export type DashboardShellProps = {
  children: React.ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  const { negocioId, setNegocioId, isNewMovimientoOpen, setIsNewMovimientoOpen, isNewTraspasoOpen, setIsNewTraspasoOpen, openNewMovimiento, openNewTraspaso } =
    useDashboardContext();
  const { apiFetch } = useApiClient();
  const queryClient = useQueryClient();
  const [negocioNombre, setNegocioNombre] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof negocioId !== 'number') return;
    let active = true;

    (async () => {
      try {
        const res = await apiFetch('/api/negocios', { headers: { 'Cache-Control': 'no-store' } });
        if (!res.ok) return;
        const data = (await res.json()) as { success: boolean; data: Array<{ id: number; nombre: string | null }> };
        if (!active) return;
        const current = data.data.find((n) => n.id === negocioId);
        setNegocioNombre(current?.nombre?.trim() ? current.nombre : null);
      } catch {
        if (!active) return;
        setNegocioNombre(null);
      }
    })();

    return () => {
      active = false;
    };
  }, [apiFetch, negocioId]);

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          negocioId={negocioId}
            onNegocioChange={(nextId) => setNegocioId(nextId)}
            onNewMovimiento={openNewMovimiento}
            onNewTraspaso={openNewTraspaso}
          isNewMovimientoOpen={isNewMovimientoOpen}
          onNewMovimientoOpenChange={setIsNewMovimientoOpen}
        />

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      <Sheet open={isNewMovimientoOpen} onOpenChange={setIsNewMovimientoOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Nuevo movimiento</SheetTitle>
            {typeof negocioId === 'number' ? (
              <SheetDescription>{negocioNombre ? `Negocio: ${negocioNombre}` : `Negocio: ${negocioId}`}</SheetDescription>
            ) : null}
          </SheetHeader>

          <div className="mt-6">
            <MovimientoForm
              negocioId={negocioId}
              onSuccess={() => {
                setIsNewMovimientoOpen(false);
                void queryClient.invalidateQueries({ queryKey: ['movimientos'] });
                void queryClient.invalidateQueries({ queryKey: ['movimientos-pendientes'] });
                void queryClient.invalidateQueries({ queryKey: ['pendingCount'] });
              }}
              onSuccessAndNew={() => {
                void queryClient.invalidateQueries({ queryKey: ['movimientos'] });
                void queryClient.invalidateQueries({ queryKey: ['movimientos-pendientes'] });
                void queryClient.invalidateQueries({ queryKey: ['pendingCount'] });
                toast.success('Movimiento guardado. Agrega el siguiente.', { duration: 2500 });
              }}
              onCancel={() => setIsNewMovimientoOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isNewTraspasoOpen} onOpenChange={setIsNewTraspasoOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Nuevo traspaso</SheetTitle>
            {typeof negocioId === 'number' ? (
              <SheetDescription>{negocioNombre ? `Negocio: ${negocioNombre}` : `Negocio: ${negocioId}`}</SheetDescription>
            ) : null}
          </SheetHeader>

          <div className="mt-6">
            <TraspasoForm
              negocioId={negocioId}
              onSuccess={() => {
                setIsNewTraspasoOpen(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

