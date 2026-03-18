'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { CotizacionForm } from '@/components/cotizaciones/cotizacion-form';
import { Button } from '@/components/ui/button';

export default function NuevaCotizacionPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/cotizaciones')}>
            <ArrowLeft className="h-4 w-4" />
            Cotizaciones
          </Button>
          <h1 className="text-2xl font-bold">Nueva cotización</h1>
        </div>
      </div>

      <CotizacionForm modo="crear" onSuccess={() => router.push('/cotizaciones')} />
    </div>
  );
}

