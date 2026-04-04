'use client';

import * as React from 'react';

import { CuentaBancoForm } from '@/components/cuentas-banco/cuenta-banco-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCuentaBancoDetail } from '@/hooks/use-cuentas-banco';
import type { CuentaBancoListItem } from '@/hooks/use-cuentas-banco';

export type CuentaBancoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cuenta: CuentaBancoListItem | null;
  negocioId: number | null;
};

export function CuentaBancoDialog({ open, onOpenChange, cuenta, negocioId }: CuentaBancoDialogProps) {
  const cuentaId = cuenta?.id ?? null;
  const { data, isLoading, error } = useCuentaBancoDetail({ id: cuentaId, negocioId });
  const detail = data?.data ?? null;

  const title = cuenta ? 'Editar cuenta' : 'Nueva cuenta';
  const description = cuenta ? 'Actualiza la información de la cuenta.' : 'Crea una cuenta bancaria para este negocio.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {cuenta && isLoading && <div className="text-sm text-muted-foreground">Cargando cuenta...</div>}
        {cuenta && error instanceof Error && <div className="text-sm text-red-600">{error.message}</div>}

        {!cuenta || detail ? (
          <CuentaBancoForm negocioId={negocioId} cuenta={cuenta ? detail : null} onSuccess={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
