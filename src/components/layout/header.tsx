'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApiClient } from '@/hooks/use-api-client';

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

export function Header({ negocioId, onNegocioChange, onNewMovimiento }: HeaderProps) {
  const pathname = usePathname();
  const { apiFetch } = useApiClient();

  const [negocios, setNegocios] = React.useState<NegocioListItem[]>([]);

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

    localStorage.setItem('lastNegocioId', String(nextId));
  }, [negocios, negocioId, onNegocioChange]);

  const showNewMovimiento = pathname === '/dashboard' || pathname === '/movimientos';

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-6">
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
              localStorage.setItem('lastNegocioId', String(nextId));
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

      {showNewMovimiento ? (
        <Button
          variant="ghost"
          onClick={onNewMovimiento}
          className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Nuevo movimiento</span>
          <span className="sm:hidden">Nuevo</span>
        </Button>
      ) : null}
    </header>
  );
}

