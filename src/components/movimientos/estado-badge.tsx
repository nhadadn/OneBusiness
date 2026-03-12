'use client';

import { Badge } from '@/components/ui/badge';
import type { EstadoMovimiento } from '@/types/movimiento.types';

export type EstadoBadgeProps = {
  estado: EstadoMovimiento;
};

export function EstadoBadge({ estado }: EstadoBadgeProps) {
  if (estado === 'APROBADO') {
    return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Aprobado</Badge>;
  }
  if (estado === 'RECHAZADO') {
    return <Badge className="border-red-200 bg-red-50 text-red-700">Rechazado</Badge>;
  }
  return <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">Pendiente</Badge>;
}

