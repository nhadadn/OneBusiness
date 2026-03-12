'use client';

import * as React from 'react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRoles } from '@/hooks/use-usuarios';

export type RolSelectorProps = {
  value: number | null;
  onChange: (next: number) => void;
  negocioId?: number;
  disabled?: boolean;
};

export function RolSelector({ value, onChange, negocioId, disabled }: RolSelectorProps) {
  const { data, isLoading } = useRoles({ negocioId });

  const roles = data?.data ?? [];

  return (
    <Select
      value={value ? String(value) : ''}
      onValueChange={(val) => onChange(Number.parseInt(val, 10))}
      disabled={disabled || isLoading}
    >
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? 'Cargando roles...' : 'Seleccionar rol'} />
      </SelectTrigger>
      <SelectContent>
        {roles.map((rol) => (
          <SelectItem key={rol.id} value={String(rol.id)}>
            {rol.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

