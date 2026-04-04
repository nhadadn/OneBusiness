'use client';

import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type IconComponent = React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

type LegacyEmptyStateAction = {
  label: string;
  onClick: () => void;
};

export type EmptyStateProps = {
  icon: React.ReactNode | LucideIcon | IconComponent;
  title: string;
  description?: string;
  action?: React.ReactNode | LegacyEmptyStateAction;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  const iconNode = React.isValidElement(Icon)
    ? React.cloneElement(Icon, {
        className: cn('h-10 w-10 text-muted-foreground', (Icon.props as { className?: string }).className),
        'aria-hidden': true,
      })
    : typeof Icon === 'function'
      ? React.createElement(Icon as IconComponent, { className: 'h-10 w-10 text-muted-foreground', 'aria-hidden': true })
      : Icon;

  const isLegacyAction =
    action &&
    !React.isValidElement(action) &&
    typeof action === 'object' &&
    'label' in action &&
    'onClick' in action;

  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 py-12 text-center',
        className
      )}
    >
      {iconNode}
      <div className="text-base font-semibold">{title}</div>
      {description ? <div className="max-w-md text-sm text-muted-foreground">{description}</div> : null}
      {action ? (
        <div className="mt-2">
          {isLegacyAction ? (
            <Button onClick={(action as LegacyEmptyStateAction).onClick}>{(action as LegacyEmptyStateAction).label}</Button>
          ) : (
            action
          )}
        </div>
      ) : null}
    </div>
  );
}

