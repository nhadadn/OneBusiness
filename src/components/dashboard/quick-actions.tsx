'use client';

import { useRouter } from 'next/navigation';
import { Download, FileText, Plus, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';

export type QuickActionsProps = {
  rol: string;
};

export function QuickActions({ rol }: QuickActionsProps) {
  const router = useRouter();
  if (rol === 'Externo') return null;

  if (rol === 'Socio') {
    return (
      <Button variant="outline" onClick={() => router.push('/reportes')}>
        <Download className="mr-2 h-4 w-4" />
        Exportar Reporte
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => router.push('/movimientos/nuevo')}>
        <Plus className="mr-2 h-4 w-4" />
        Nuevo Movimiento
      </Button>

      {(rol === 'Dueño' || rol === 'Admin') && (
        <Button variant="outline" onClick={() => router.push('/usuarios')}>
          <Users className="mr-2 h-4 w-4" />
          Gestionar Usuarios
        </Button>
      )}

      {rol === 'Dueño' && (
        <Button variant="outline" onClick={() => router.push('/reportes')}>
          <FileText className="mr-2 h-4 w-4" />
          Generar Reporte
        </Button>
      )}
    </div>
  );
}

