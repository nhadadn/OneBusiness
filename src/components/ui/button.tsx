'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'default' | 'sm' | 'lg';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  'aria-label'?: string;
};

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

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
        outline: 'border border-border bg-background hover:bg-accent text-foreground',
        ghost: 'hover:bg-accent text-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={buttonVariants({ variant, size, className })}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
