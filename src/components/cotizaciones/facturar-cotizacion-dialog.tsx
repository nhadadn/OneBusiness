'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApiClient } from '@/hooks/use-api-client';
import { useAuth } from '@/hooks/use-auth';

type CotizacionRef = {
  id: number;
  folio: string;
  negocioId: number;
  total: string;
  categoriaId: number | null;
};

type CuentaBancoListItem = {
  id: number;
  nombre: string;
};

type CategoriaListItem = {
  id: number;
  nombre: string;
};

function formatCurrencyMXN(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

function parseMoney(raw: string) {
  const num = Number(raw);
  return Number.isFinite(num) && !Number.isNaN(num) ? num : 0;
}

export function FacturarCotizacionDialog({
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

  const [numeroFactura, setNumeroFactura] = useState('');
  const [cuentaBancoId, setCuentaBancoId] = useState<string>('');
  const [categoriaId, setCategoriaId] = useState<string>('none');
  const [cuentas, setCuentas] = useState<CuentaBancoListItem[]>([]);
  const [categorias, setCategorias] = useState<CategoriaListItem[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canFacturar = user?.rol === 'Dueño' || user?.rol === 'Admin';

  useEffect(() => {
    if (!open) return;
    if (!cotizacion) return;

    setError(null);
    setLoadingOptions(true);

    const load = async () => {
      try {
        const [cuentasRes, categoriasRes] = await Promise.all([
          apiFetch('/api/cuentas-banco', { headers: { 'Cache-Control': 'no-store' }, negocioId: cotizacion.negocioId }),
          apiFetch('/api/categorias?tipo=ingreso', { headers: { 'Cache-Control': 'no-store' }, negocioId: cotizacion.negocioId }),
        ]);

        if (cuentasRes.ok) {
          const data = (await cuentasRes.json()) as { success: boolean; data: CuentaBancoListItem[] };
          setCuentas(Array.isArray(data.data) ? data.data : []);
        } else {
          const data = (await cuentasRes.json().catch(() => ({}))) as { error?: string };
          setError(data.error ?? 'No se pudieron cargar las cuentas bancarias');
        }

        if (categoriasRes.ok) {
          const data = (await categoriasRes.json()) as { success: boolean; data: CategoriaListItem[] };
          setCategorias(Array.isArray(data.data) ? data.data : []);
        } else {
          const data = (await categoriasRes.json().catch(() => ({}))) as { error?: string };
          setError(data.error ?? 'No se pudieron cargar las categorías');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudieron cargar los datos');
      } finally {
        setLoadingOptions(false);
      }
    };

    void load();
  }, [apiFetch, cotizacion, open]);

  useEffect(() => {
    if (!open) {
      setNumeroFactura('');
      setCuentaBancoId('');
      setCategoriaId('none');
      setCuentas([]);
      setCategorias([]);
      setLoadingOptions(false);
      setIsSubmitting(false);
      setError(null);
      return;
    }

    if (cotizacion?.categoriaId) {
      setCategoriaId(String(cotizacion.categoriaId));
    }
  }, [cotizacion?.categoriaId, open]);

  const totalLabel = useMemo(() => {
    if (!cotizacion) return '';
    return formatCurrencyMXN(parseMoney(cotizacion.total));
  }, [cotizacion]);

  const confirmDisabled = useMemo(() => {
    if (!cotizacion) return true;
    if (!canFacturar) return true;
    if (isSubmitting) return true;
    if (!numeroFactura.trim()) return true;
    if (!cuentaBancoId) return true;
    return false;
  }, [canFacturar, cuentaBancoId, cotizacion, isSubmitting, numeroFactura]);

  const handleConfirm = async () => {
    if (!cotizacion) return;
    if (!canFacturar) {
      setError('Solo Dueño y Admin pueden facturar cotizaciones');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        estado: 'FACTURADA',
        numeroFactura: numeroFactura.trim(),
        cuentaBancoId: Number(cuentaBancoId),
      };

      if (categoriaId !== 'none') {
        payload.categoriaId = Number(categoriaId);
      }

      const res = await apiFetch(`/api/cotizaciones/${cotizacion.id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'No se pudo registrar la factura');
        return;
      }

      onOpenChange(false);
      toast.success('Factura registrada. Se creó un movimiento de ingreso pendiente.');
      window.dispatchEvent(new CustomEvent('onebusiness:movimientos-refresh'));
      window.dispatchEvent(new CustomEvent('onebusiness:pending-count-refresh'));
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la factura');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (isSubmitting ? null : onOpenChange(next))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar factura</DialogTitle>
          <DialogDescription>
            {cotizacion ? `Al registrar la factura se generará automáticamente un movimiento de ingreso por ${totalLabel}.` : 'Selecciona una cotización para facturar.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900">Número de factura</label>
            <Input value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} placeholder="F-001" disabled={!canFacturar || isSubmitting} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900">Cuenta bancaria destino</label>
            <Select value={cuentaBancoId} onValueChange={(v) => setCuentaBancoId(v)} disabled={!canFacturar || isSubmitting || loadingOptions}>
              <SelectTrigger>
                <SelectValue placeholder={loadingOptions ? 'Cargando...' : 'Selecciona una cuenta'} />
              </SelectTrigger>
              <SelectContent>
                {cuentas.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900">Categoría (opcional)</label>
            <Select value={categoriaId} onValueChange={(v) => setCategoriaId(v)} disabled={isSubmitting || loadingOptions}>
              <SelectTrigger>
                <SelectValue placeholder={loadingOptions ? 'Cargando...' : 'Sin categoría'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin categoría</SelectItem>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={confirmDisabled}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Registrar factura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

