'use client';

import { useMemo } from 'react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { useNegocios } from '@/hooks/use-negocios';

export type BusinessSelectorProps = {
  value: number | null;
  onChange: (value: number | null) => void;
  negocioIds?: number[];
};

export function BusinessSelector({ value, onChange, negocioIds }: BusinessSelectorProps) {
  const { user } = useAuth();
  const { data } = useNegocios({ negocioId: undefined, enabled: user?.rol === 'Dueño' && negocioIds === undefined });

  const options = useMemo(() => {
    if (Array.isArray(negocioIds)) {
      return negocioIds.map((id) => ({ id, label: `Negocio ${id}` }));
    }

    const apiItems = data?.data ?? [];
    const fromApi = apiItems.map((n) => ({ id: n.id, label: n.nombre?.trim() ? n.nombre : `Negocio ${n.id}` }));

    if (fromApi.length > 0) return fromApi;

    const ids = user?.negocios ?? [];
    return ids.map((id) => ({ id, label: `Negocio ${id}` }));
  }, [data, negocioIds, user?.negocios]);

  return (
    <Select
      value={value === null ? 'all' : String(value)}
      onValueChange={(val) => onChange(val === 'all' ? null : Number(val))}
    >
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Seleccionar negocio" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos los negocios</SelectItem>
        {options.map((n) => (
          <SelectItem key={n.id} value={String(n.id)}>
            {n.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
