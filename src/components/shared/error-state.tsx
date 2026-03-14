'use client';

import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  icon?: LucideIcon;
  className?: string;
};

export function ErrorState({
  title = 'Ocurrió un error',
  message,
  onRetry,
  icon: Icon = TriangleAlert,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 py-12 text-center', className)}>
      <Icon className="h-10 w-10 text-destructive" aria-hidden="true" />
      <div className="text-base font-semibold">{title}</div>
      <div className="max-w-md text-sm text-muted-foreground">{message}</div>
      {onRetry ? (
        <div className="mt-2">
          <Button variant="outline" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      ) : null}
    </div>
  );
}

