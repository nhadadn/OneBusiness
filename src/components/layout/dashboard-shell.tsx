'use client';

import * as React from 'react';

import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { MovimientoForm } from '@/components/movimientos/movimiento-form';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useApiClient } from '@/hooks/use-api-client';

export type DashboardShellProps = {
  children: React.ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  const [negocioId, setNegocioId] = React.useState<number | null>(null);
  const [isNewMovimientoOpen, setIsNewMovimientoOpen] = React.useState(false);
  const { apiFetch } = useApiClient();
  const [negocioNombre, setNegocioNombre] = React.useState<string | null>(null);

  React.useEffect(() => {
    const raw = localStorage.getItem('lastNegocioId');
    const parsed = raw ? Number(raw) : Number.NaN;
    if (Number.isFinite(parsed)) {
      setNegocioId(parsed);
    }
  }, []);

  const handleNegocioChange = React.useCallback((nextId: number) => {
    setNegocioId(nextId);
    localStorage.setItem('lastNegocioId', String(nextId));
  }, []);

  const handleNewMovimiento = React.useCallback(() => {
    setIsNewMovimientoOpen(true);
  }, []);

  React.useEffect(() => {
    const handler = () => setIsNewMovimientoOpen(true);
    window.addEventListener('onebusiness:new-movimiento-open', handler as EventListener);
    return () => window.removeEventListener('onebusiness:new-movimiento-open', handler as EventListener);
  }, []);

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
          onNegocioChange={handleNegocioChange}
          onNewMovimiento={handleNewMovimiento}
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
                window.dispatchEvent(new CustomEvent('onebusiness:movimientos-refresh'));
                window.dispatchEvent(new CustomEvent('onebusiness:pending-count-refresh'));
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

