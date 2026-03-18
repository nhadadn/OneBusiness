'use client';

import { Badge } from '@/components/ui/badge';
import type { EstadoCotizacion } from '@/types/cotizacion.types';

const labelByEstado: Record<EstadoCotizacion, string> = {
  BORRADOR: 'Borrador',
  ENVIADA: 'Enviada',
  APROBADA: 'Aprobada',
  FACTURADA: 'Facturada',
  CANCELADA: 'Cancelada',
};

export function CotizacionEstadoBadge({ estado }: { estado: EstadoCotizacion }) {
  if (estado === 'BORRADOR') {
    return <Badge variant="outline">{labelByEstado[estado]}</Badge>;
  }

  if (estado === 'ENVIADA') {
    return <Badge className="border-amber-200 bg-amber-100 text-amber-800">{labelByEstado[estado]}</Badge>;
  }

  if (estado === 'APROBADA') {
    return <Badge className="border-blue-200 bg-blue-100 text-blue-800">{labelByEstado[estado]}</Badge>;
  }

  if (estado === 'FACTURADA') {
    return <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">{labelByEstado[estado]}</Badge>;
  }

  return <Badge variant="destructive">{labelByEstado[estado]}</Badge>;
}

