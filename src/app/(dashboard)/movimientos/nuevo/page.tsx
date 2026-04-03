'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { MovimientoForm } from '@/components/movimientos/movimiento-form';
import { Button } from '@/components/ui/button';

export default function NuevoMovimientoPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Button variant="ghost" className="px-0" onClick={() => router.push('/movimientos')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <h1 className="text-3xl font-bold">Nuevo movimiento</h1>
        </div>
      </div>

      <div className="max-w-xl rounded-lg border border-border bg-card p-6">
        <MovimientoForm onSuccess={() => router.push('/movimientos')} />
      </div>
    </div>
  );
}
