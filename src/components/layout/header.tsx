'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { ArrowLeftRight, Menu, Plus } from 'lucide-react';
import { MobileNav } from '@/components/layout/mobile-nav';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApiClient } from '@/hooks/use-api-client';
import { useAuth } from '@/hooks/use-auth';

type NegocioListItem = {
  id: number;
  nombre: string | null;
};

type NegociosApiResponse = {
  success: boolean;
  data: NegocioListItem[];
};

export type HeaderProps = {
  negocioId: number | null;
  onNegocioChange: (negocioId: number) => void;
  onNewMovimiento: () => void;
  onNewTraspaso: () => void;
  isNewMovimientoOpen: boolean;
  onNewMovimientoOpenChange: (open: boolean) => void;
};

const titleByPath: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/movimientos': 'Movimientos',
  '/movimientos/aprobacion': 'Por aprobar',
  '/movimientos/nuevo': 'Nuevo movimiento',
  '/configuracion/cuentas-banco': 'Cuentas bancarias',
  '/configuracion/categorias': 'Categorías',
  '/usuarios': 'Usuarios',
  '/negocios': 'Negocios',
  '/reportes': 'Reportes',
};

function getPageTitle(pathname: string) {
  const exact = titleByPath[pathname];
  if (exact) return exact;

  if (/^\/movimientos\/\d+$/.test(pathname)) {
    return 'Detalle de movimiento';
  }

  return 'OneBusiness';
}

export function Header({ negocioId, onNegocioChange, onNewMovimiento, onNewTraspaso }: HeaderProps) {
  const pathname = usePathname();
  const { apiFetch } = useApiClient();
  const { user } = useAuth();

  const [negocios, setNegocios] = React.useState<NegocioListItem[]>([]);
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    (async () => {
      try {
        const res = await apiFetch('/api/negocios');
        if (!res.ok) return;
        const data = (await res.json()) as NegociosApiResponse;
        if (!active) return;
        setNegocios(data.data ?? []);
      } catch {
        if (!active) return;
        setNegocios([]);
      }
    })();

    return () => {
      active = false;
    };
  }, [apiFetch]);

  React.useEffect(() => {
    if (negocios.length === 0) return;

    const fromStorageRaw = localStorage.getItem('lastNegocioId');
    const fromStorage = fromStorageRaw ? Number(fromStorageRaw) : Number.NaN;
    const desired = typeof negocioId === 'number' ? negocioId : Number.isFinite(fromStorage) ? fromStorage : null;

    const desiredExists = typeof desired === 'number' && negocios.some((n) => n.id === desired);
    const nextId = desiredExists ? (desired as number) : negocios[0]!.id;

    if (negocioId !== nextId) {
      onNegocioChange(nextId);
    }
  }, [negocios, negocioId, onNegocioChange]);

  const showNewMovimiento = pathname === '/dashboard' || pathname === '/movimientos';
  const canWrite = user?.rol !== 'Externo';

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-3 sm:px-6">
      <button
        type="button"
        className="flex h-11 w-11 items-center justify-center rounded-md text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:hidden"
        aria-label="Abrir menú"
        onClick={() => setIsMobileNavOpen(true)}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{getPageTitle(pathname)}</div>
      </div>

      {negocios.length > 0 ? (
        <div className="w-[220px]">
          <Select
            value={typeof negocioId === 'number' ? String(negocioId) : undefined}
            onValueChange={(value) => {
              const nextId = Number(value);
              if (!Number.isFinite(nextId)) return;
              onNegocioChange(nextId);
            }}
          >
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder="Selecciona negocio" />
            </SelectTrigger>
            <SelectContent>
              {negocios.map((n) => (
                <SelectItem key={n.id} value={String(n.id)}>
                  {n.nombre?.trim() ? n.nombre : `Negocio ${n.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {showNewMovimiento && canWrite ? (
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onNewTraspaso}>
            <ArrowLeftRight className="mr-2 h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Nuevo traspaso</span>
            <span className="sm:hidden">Traspaso</span>
          </Button>

          <Button
            variant="default"
            onClick={onNewMovimiento}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Nuevo movimiento</span>
            <span className="sm:hidden">Movimiento</span>
          </Button>
        </div>
      ) : null}
      <MobileNav open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen} />
    </header>
  );
}

