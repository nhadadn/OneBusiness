'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useApiClient } from '@/hooks/use-api-client';

type CotizacionRef = {
  id: number;
  folio: string;
  clienteNombre: string;
};

export function EnviarCotizacionDialog({
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!cotizacion) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/cotizaciones/${cotizacion.id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: 'ENVIADA' }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'No se pudo enviar la cotización');
        return;
      }

      onOpenChange(false);
      toast.success('Cotización enviada');
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar la cotización');
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = cotizacion ? `Enviar cotización ${cotizacion.folio}` : 'Enviar cotización';

  return (
    <Dialog open={open} onOpenChange={(next) => (isSubmitting ? null : onOpenChange(next))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {cotizacion
              ? `¿Confirmas que deseas enviar la cotización ${cotizacion.folio} al cliente ${cotizacion.clienteNombre}? El estado cambiará a Enviada.`
              : 'Selecciona una cotización para enviar.'}
          </DialogDescription>
        </DialogHeader>

        {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting || !cotizacion}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirmar envío
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

