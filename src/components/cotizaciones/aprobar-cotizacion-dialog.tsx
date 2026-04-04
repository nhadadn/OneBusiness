'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useApiClient } from '@/hooks/use-api-client';
import { useAuth } from '@/hooks/use-auth';

type CotizacionRef = {
  id: number;
  folio: string;
  clienteNombre: string;
};

export function AprobarCotizacionDialog({
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
  const [numeroOc, setNumeroOc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canApprove = user?.rol === 'Dueño' || user?.rol === 'Admin';

  useEffect(() => {
    if (!open) {
      setNumeroOc('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  const disabled = useMemo(() => {
    if (!cotizacion) return true;
    if (!canApprove) return true;
    return numeroOc.trim().length === 0 || isSubmitting;
  }, [canApprove, cotizacion, isSubmitting, numeroOc]);

  const handleConfirm = async () => {
    if (!cotizacion) return;
    if (!canApprove) {
      setError('Solo Dueño y Admin pueden aprobar cotizaciones');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/cotizaciones/${cotizacion.id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: 'APROBADA', numeroOc: numeroOc.trim() }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'No se pudo aprobar la cotización');
        return;
      }

      onOpenChange(false);
      toast.success('Cotización aprobada');
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo aprobar la cotización');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (isSubmitting ? null : onOpenChange(next))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aprobar cotización</DialogTitle>
          <DialogDescription>
            {cotizacion ? `Ingresa el número de Orden de Compra para aprobar la cotización ${cotizacion.folio}.` : 'Selecciona una cotización para aprobar.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Número de OC</label>
          <Input value={numeroOc} onChange={(e) => setNumeroOc(e.target.value)} placeholder="OC-001" disabled={!canApprove || isSubmitting} />
        </div>

        {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={disabled}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Aprobar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

