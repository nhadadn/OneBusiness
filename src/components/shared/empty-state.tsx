'use client';

import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 py-12 text-center', className)}>
      <Icon className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      <div className="text-base font-semibold">{title}</div>
      {description ? <div className="max-w-md text-sm text-muted-foreground">{description}</div> : null}
      {action ? (
        <div className="mt-2">
          <Button onClick={action.onClick}>{action.label}</Button>
        </div>
      ) : null}
    </div>
  );
}

