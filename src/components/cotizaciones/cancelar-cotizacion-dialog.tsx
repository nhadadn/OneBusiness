'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useApiClient } from '@/hooks/use-api-client';
import { useAuth } from '@/hooks/use-auth';

type CotizacionRef = {
  id: number;
  folio: string;
};

export function CancelarCotizacionDialog({
  open,
  onOpenChange,
  cotizacion,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cotizacion: CotizacionRef | null;
  onSuccess: () => void;
}) {
  const { apiFetch } = useApiClient();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCancel = user?.rol === 'Dueño' || user?.rol === 'Admin';

  const handleConfirm = async () => {
    if (!cotizacion) return;
    if (!canCancel) {
      setError('Solo Dueño y Admin pueden cancelar cotizaciones');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/cotizaciones/${cotizacion.id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: 'CANCELADA' }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'No se pudo cancelar la cotización');
        return;
      }

      onOpenChange(false);
      toast.success('Cotización cancelada');
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cancelar la cotización');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (isSubmitting ? null : onOpenChange(next))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar cotización</DialogTitle>
          <DialogDescription>
            {cotizacion ? `¿Estás seguro de que deseas cancelar la cotización ${cotizacion.folio}? Esta acción no se puede deshacer.` : 'Selecciona una cotización para cancelar.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4" aria-hidden="true" />
          <div>Esta acción cambia el estado a Cancelada.</div>
        </div>

        {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Volver
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || !cotizacion || !canCancel}
            className="bg-red-600 text-white hover:bg-red-600/90"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Cancelar cotización
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

