import * as React from 'react';
import { cn } from '@/lib/utils';

type CvaConfig = {
  variants: Record<string, Record<string, string>>;
  defaultVariants?: Record<string, string>;
};

function cva(base: string, config: CvaConfig) {
  return (options?: Record<string, unknown>) => {
    const classNames: Array<string | undefined> = [base];
    const variants = config.variants;
    const defaultVariants = config.defaultVariants ?? {};

    for (const variantKey of Object.keys(variants)) {
      const variantValue = (options?.[variantKey] ?? defaultVariants[variantKey]) as string | undefined;
      if (!variantValue) continue;
      const variantMap = variants[variantKey];
      const variantClassName = variantMap?.[variantValue];
      if (variantClassName) classNames.push(variantClassName);
    }

    classNames.push(options?.className as string | undefined);

    return cn(...classNames);
  };
}

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | 'default'
    | 'secondary'
    | 'outline'
    | 'destructive'
    | 'pendiente'
    | 'aprobado'
    | 'pagado'
    | 'rechazado'
    | 'cancelado';
}

const badgeVariants = cva('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      default: 'border-transparent bg-primary text-primary-foreground',
      secondary: 'border-transparent bg-secondary text-secondary-foreground',
      outline: 'border-border bg-background text-foreground',
      destructive: 'border-transparent bg-destructive text-destructive-foreground',
      pendiente: 'border-transparent bg-warning text-warning-foreground',
      aprobado: 'border-transparent bg-info text-info-foreground',
      pagado: 'border-transparent bg-success text-success-foreground',
      rechazado: 'border-transparent bg-destructive text-destructive-foreground',
      cancelado: 'border-border bg-muted text-muted-foreground',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={badgeVariants({ variant, className })}
      {...props}
    />
  );
}
