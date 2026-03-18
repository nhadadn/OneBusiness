'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil } from 'lucide-react';

import { CotizacionForm, type CotizacionConItems } from '@/components/cotizaciones/cotizacion-form';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient } from '@/hooks/use-api-client';

type CotizacionResponse = {
  success: boolean;
  data?: CotizacionConItems;
  error?: string;
};

function CotizacionFormSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-2 h-10 w-full" />
        </div>
        <div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-2 h-10 w-full" />
        </div>
        <div>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-10 w-full" />
        </div>
        <div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-2 h-10 w-full" />
        </div>
        <div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-2 h-10 w-full" />
        </div>
        <div className="md:col-span-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-2 h-24 w-full" />
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <Skeleton className="h-5 w-40" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function EditarCotizacionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { apiFetch } = useApiClient();

  const [data, setData] = React.useState<CotizacionConItems | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notEditable, setNotEditable] = React.useState(false);

  const fetchCotizacion = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotEditable(false);
    try {
      const res = await apiFetch(`/api/cotizaciones/${params.id}`, { headers: { 'Cache-Control': 'no-store' } });
      const json = (await res.json().catch(() => ({}))) as CotizacionResponse;

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error ?? 'No se pudo cargar la cotización');
      }

      if (json.data.estado === 'APROBADA' || json.data.estado === 'FACTURADA' || json.data.estado === 'CANCELADA') {
        setNotEditable(true);
        setData(json.data);
        return;
      }

      setData(json.data);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'No se pudo cargar la cotización');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, params.id]);

  React.useEffect(() => {
    void fetchCotizacion();
  }, [fetchCotizacion]);

  React.useEffect(() => {
    if (!notEditable || !data) return;
    const t = window.setTimeout(() => router.replace(`/cotizaciones/${data.id}`), 1200);
    return () => window.clearTimeout(t);
  }, [data, notEditable, router]);

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push(data ? `/cotizaciones/${data.id}` : '/cotizaciones')}>
            <ArrowLeft className="h-4 w-4" />
            {data ? 'Detalle' : 'Cotizaciones'}
          </Button>
          <h1 className="text-2xl font-bold">Editar cotización</h1>
        </div>
      </div>

      {loading ? (
        <CotizacionFormSkeleton />
      ) : error ? (
        <div className="space-y-3">
          <ErrorState message={error} onRetry={() => fetchCotizacion()} />
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => router.push('/cotizaciones')}>
              Volver a cotizaciones
            </Button>
          </div>
        </div>
      ) : notEditable && data ? (
        <div className="space-y-3">
          <ErrorState
            title="No se puede editar"
            message="Solo se pueden editar cotizaciones en estado BORRADOR o ENVIADA."
            icon={Pencil}
          />
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => router.push(`/cotizaciones/${data.id}`)}>
              Ir al detalle
            </Button>
          </div>
        </div>
      ) : data ? (
        <CotizacionForm modo="editar" cotizacionInicial={data} onSuccess={() => router.push('/cotizaciones')} />
      ) : (
        <ErrorState message="Cotización no encontrada" />
      )}
    </div>
  );
}

