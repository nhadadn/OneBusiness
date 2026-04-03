'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

type DashboardContextValue = {
  negocioId: number | null;
  setNegocioId: (next: number | null) => void;
  isNewMovimientoOpen: boolean;
  setIsNewMovimientoOpen: (open: boolean) => void;
  isNewTraspasoOpen: boolean;
  setIsNewTraspasoOpen: (open: boolean) => void;
  openNewMovimiento: () => void;
  openNewTraspaso: () => void;
};

const DashboardContext = React.createContext<DashboardContextValue | null>(null);

export function useDashboardContext(): DashboardContextValue {
  const ctx = React.useContext(DashboardContext);
  if (!ctx) {
    throw new Error('useDashboardContext debe usarse dentro de DashboardProviders');
  }
  return ctx;
}

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  const [negocioId, setNegocioIdState] = React.useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem('lastNegocioId');
    const parsed = raw ? Number(raw) : Number.NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  });

  const setNegocioId = React.useCallback((next: number | null) => {
    setNegocioIdState(next);
    if (typeof window === 'undefined') return;
    if (typeof next === 'number' && Number.isFinite(next) && next > 0) {
      window.localStorage.setItem('lastNegocioId', String(next));
      return;
    }
    window.localStorage.removeItem('lastNegocioId');
  }, []);

  const [isNewMovimientoOpen, setIsNewMovimientoOpen] = React.useState(false);
  const [isNewTraspasoOpen, setIsNewTraspasoOpen] = React.useState(false);

  const openNewMovimiento = React.useCallback(() => setIsNewMovimientoOpen(true), []);
  const openNewTraspaso = React.useCallback(() => setIsNewTraspasoOpen(true), []);

  const dashboardValue = React.useMemo<DashboardContextValue>(
    () => ({
      negocioId,
      setNegocioId,
      isNewMovimientoOpen,
      setIsNewMovimientoOpen,
      isNewTraspasoOpen,
      setIsNewTraspasoOpen,
      openNewMovimiento,
      openNewTraspaso,
    }),
    [isNewMovimientoOpen, isNewTraspasoOpen, negocioId, openNewMovimiento, openNewTraspaso, setNegocioId]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContext.Provider value={dashboardValue}>{children}</DashboardContext.Provider>
    </QueryClientProvider>
  );
}
