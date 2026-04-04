'use client';

import * as React from 'react';

import { NegocioForm } from '@/components/negocios/negocio-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNegocioDetail, type NegocioCrudItem } from '@/hooks/use-negocios';

export type NegocioDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  negocio?: NegocioCrudItem;
};

export function NegocioDialog({ open, onOpenChange, negocio }: NegocioDialogProps) {
  const negocioId = negocio?.id ?? null;
  const { data, isLoading, error } = useNegocioDetail({ id: negocioId, enabled: Boolean(negocioId) });
  const detail = data?.data;

  const title = negocio ? 'Editar negocio' : 'Nuevo negocio';
  const description = negocio ? 'Actualiza la información del negocio.' : 'Crea un negocio para comenzar a registrar movimientos.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {negocio && isLoading ? <div className="text-sm text-muted-foreground">Cargando negocio...</div> : null}
        {negocio && error instanceof Error ? <div className="text-sm text-red-600">{error.message}</div> : null}

        {!negocio || detail ? (
          <NegocioForm negocio={negocio ? (detail ?? undefined) : undefined} onSuccess={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

