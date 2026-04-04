'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Banknote,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Landmark,
  Layers,
  Layers2,
  LayoutDashboard,
  LogOut,
  Tags,
  Timer,
  Users,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/use-auth';
import { usePendingCount } from '@/hooks/use-pending-count';

export type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  show?: boolean;
  showBadge?: boolean;
};

export type NavSection = {
  title?: string;
  items: NavItem[];
};

function getInitials(nombre: string) {
  const parts = nombre
    .split(' ')
    .map((p) => p.trim())
    .filter(Boolean);

  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? '';
  return (first + second).toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const [collapsed, setCollapsed] = React.useState(false);
  const pendingCountQuery = usePendingCount();

  const sections = React.useMemo(() => buildNavSections(user?.rol), [user?.rol]);
  const pendingCount = pendingCountQuery.data?.count;

  const widthClassName = collapsed ? 'w-16' : 'w-60';

  return (
    <aside
      className={cn(
        'hidden h-screen flex-col border-r border-border bg-card transition-[width] duration-200 md:flex',
        widthClassName
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-3">
        <div className={cn('flex min-w-0 flex-1 items-center gap-2', collapsed && 'justify-center')}>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="text-sm font-semibold">OB</span>
          </div>
          {!collapsed ? <div className="truncate text-sm font-semibold">OneBusiness</div> : null}
        </div>

        <Button
          variant="ghost"
          size="sm"
          aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          onClick={() => setCollapsed((v) => !v)}
          className={cn('h-9 w-9 p-0', collapsed && 'mx-auto')}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" aria-hidden="true" /> : <ChevronLeft className="h-4 w-4" aria-hidden="true" />}
        </Button>
      </div>

      <TooltipProvider delayDuration={100}>
        <nav className="flex-1 space-y-4 overflow-y-auto p-2" data-tour="dashboard-nav">
          {sections.map((section) => {
            const visibleItems = section.items.filter((item) => item.show !== false);
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title ?? 'general'} className="space-y-2">
                {section.title && !collapsed ? (
                  <div className="px-2 text-xs font-semibold text-muted-foreground">{section.title}</div>
                ) : null}

                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    const badge = item.showBadge && typeof pendingCount === 'number' && pendingCount > 0 ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          'ml-auto border-0 bg-primary px-2 py-0 text-[11px] text-primary-foreground',
                          collapsed && 'absolute -right-1 -top-1 ml-0 h-5 min-w-5 justify-center rounded-full px-1'
                        )}
                      >
                        {pendingCount}
                      </Badge>
                    ) : null;

                    const link = (
                      <Link
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        aria-label={collapsed ? item.label : undefined}
                        className={cn(
                          'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                          collapsed ? 'justify-center px-2' : 'justify-start',
                          isActive
                            ? 'bg-accent text-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {!collapsed ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : null}
                        {badge}
                      </Link>
                    );

                    if (!collapsed) return link;

                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </TooltipProvider>

      <div className="border-t border-border p-3">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
            {user?.nombre ? getInitials(user.nombre) : '?'}
          </div>

          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{user?.nombre ?? 'Usuario'}</div>
              <div className="truncate text-xs text-muted-foreground">{user?.rol ?? ''}</div>
            </div>
          ) : null}

          <Button
            variant="ghost"
            size="sm"
            aria-label="Cerrar sesión"
            className={cn('h-9 w-9 p-0', collapsed && 'hidden')}
            onClick={() => {
              void logout();
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {collapsed ? (
          <Button
            variant="ghost"
            size="sm"
            aria-label="Cerrar sesión"
            className="mt-2 flex h-9 w-full items-center justify-center gap-2"
            onClick={() => {
              void logout();
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </aside>
  );
}

export function buildNavSections(userRole?: string): NavSection[] {
  const canSeeUsuarios = userRole === 'Dueño' || userRole === 'Admin';
  const canSeeArqueo = userRole === 'Dueño' || userRole === 'Admin';
  const canSeeConsolidado = userRole === 'Dueño';

  return [
    {
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Negocios', href: '/negocios', icon: Building2 },
        { label: 'Divisiones', href: '/divisiones', icon: Layers2 },
        { label: 'Consolidado', href: '/consolidado', icon: Layers, show: canSeeConsolidado },
        { label: 'Reportes', href: '/reportes', icon: FileText },
      ],
    },
    {
      title: 'Operaciones',
      items: [
        { label: 'Movimientos', href: '/movimientos', icon: Banknote },
        { label: 'Cotizaciones', href: '/cotizaciones', icon: ClipboardList },
        { label: 'Por aprobar', href: '/movimientos/aprobacion', icon: Timer, showBadge: true },
      ],
    },
    {
      title: 'Configuración',
      items: [
        { label: 'Cuentas bancarias', href: '/configuracion/cuentas-banco', icon: Banknote },
        { label: 'Arqueo', href: '/configuracion/arqueo', icon: Landmark, show: canSeeArqueo },
        { label: 'Categorías', href: '/configuracion/categorias', icon: Tags },
        { label: 'Usuarios', href: '/usuarios', icon: Users, show: canSeeUsuarios },
      ],
    },
  ];
}

