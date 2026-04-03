'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { buildNavSections, type NavSection } from '@/components/layout/sidebar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { usePendingCount } from '@/hooks/use-pending-count';

export type MobileNavProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const sections: NavSection[] = React.useMemo(() => buildNavSections(user?.rol), [user?.rol]);
  const pendingCountQuery = usePendingCount();
  const pendingCount = pendingCountQuery.data?.count;

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
                      item.showBadge && typeof pendingCount === 'number' && pendingCount > 0 ? (
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
