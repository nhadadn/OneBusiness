'use client';

import * as React from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export type NegocioOption = { id: number; label: string };

export type NegociosSelectorProps = {
  value: number[];
  onChange: (next: number[]) => void;
  options: NegocioOption[];
  className?: string;
};

export function NegociosSelector({ value, onChange, options, className }: NegociosSelectorProps) {
  const selected = new Set(value);

  return (
    <div className={cn('grid grid-cols-1 gap-2 sm:grid-cols-2', className)}>
      {options.map((opt) => {
        const checked = selected.has(opt.id);
        return (
          <label
            key={opt.id}
            className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 p-3 hover:bg-slate-50"
          >
            <Checkbox
              checked={checked}
              onCheckedChange={(next) => {
                const isChecked = next === true;
                const nextValue = isChecked
                  ? Array.from(new Set([...value, opt.id]))
                  : value.filter((id) => id !== opt.id);
                onChange(nextValue);
              }}
            />
            <span className="text-sm">{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}

