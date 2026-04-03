'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { buildNavSections, type NavSection } from '@/components/layout/sidebar';
import { cn } from '@/lib/utils';
import { useApiClient } from '@/hooks/use-api-client';
import { useAuth } from '@/hooks/use-auth';

type PendingCountResponse = {
  success: boolean;
  count: number;
};

export type MobileNavProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { apiFetch } = useApiClient();
  const sections: NavSection[] = React.useMemo(() => buildNavSections(user?.rol), [user?.rol]);

  const [pendingCount, setPendingCount] = React.useState<number | null>(null);
  const [refreshTick, setRefreshTick] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch('/api/movimientos/pendientes/count');
        if (!res.ok) {
          if (active) setPendingCount(null);
          return;
        }
        const data = (await res.json()) as PendingCountResponse;
        if (!active) return;
        setPendingCount(typeof data.count === 'number' ? data.count : null);
      } catch {
        if (!active) return;
        setPendingCount(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [apiFetch, pathname, refreshTick]);

  React.useEffect(() => {
    const handler = () => setRefreshTick((v) => v + 1);
    window.addEventListener('onebusiness:pending-count-refresh', handler as EventListener);
    return () => window.removeEventListener('onebusiness:pending-count-refresh', handler as EventListener);
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-xs p-0">
        <div className="flex h-14 items-center gap-2 border-b border-border px-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <span className="text-sm font-semibold">OB</span>
            </div>
            <div className="truncate text-sm font-semibold">OneBusiness</div>
          </div>
        </div>

        <nav className="space-y-4 overflow-y-auto p-2">
          {sections.map((section) => {
            const visibleItems = section.items.filter((item) => item.show !== false);
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title ?? 'general'} className="space-y-2">
                {section.title ? <div className="px-2 text-xs font-semibold text-muted-foreground">{section.title}</div> : null}

                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    const badge =
                      item.showBadge && pendingCount && pendingCount > 0 ? (
                        <Badge variant="outline" className="ml-auto border-0 bg-primary px-2 py-0 text-[11px] text-primary-foreground">
                          {pendingCount}
                        </Badge>
                      ) : null;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'relative flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                          isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        )}
                        onClick={() => onOpenChange(false)}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {badge}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-3">
          <Button variant="ghost" className="h-11 w-full" onClick={() => onOpenChange(false)} aria-label="Cerrar menú">
            Cerrar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
