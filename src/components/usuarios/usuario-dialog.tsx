'use client';

import * as React from 'react';

import { UsuarioForm } from '@/components/usuarios/usuario-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUsuarioDetail } from '@/hooks/use-usuarios';
import type { UsuarioListItem } from '@/types/usuario.types';

export type UsuarioDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario: UsuarioListItem | null;
  negocioId?: number;
  negociosOptions: Array<{ id: number; label: string }>;
};

export function UsuarioDialog({ open, onOpenChange, usuario, negocioId, negociosOptions }: UsuarioDialogProps) {
  const usuarioId = usuario?.id ?? null;
  const { data, isLoading, error } = useUsuarioDetail({ id: usuarioId, negocioId });

  const detail = data?.data ?? null;

  const title = usuario ? 'Editar usuario' : 'Nuevo usuario';
  const description = usuario ? 'Actualiza la información del usuario.' : 'Crea un usuario y asígnale negocios.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {usuario && isLoading && <div className="text-sm text-slate-600">Cargando usuario...</div>}
        {usuario && error instanceof Error && <div className="text-sm text-red-600">{error.message}</div>}

        {!usuario || detail ? (
          <UsuarioForm
            negocioId={negocioId}
            usuario={usuario ? detail : null}
            negociosOptions={negociosOptions}
            onSuccess={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

