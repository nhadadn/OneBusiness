'use client';

import * as React from 'react';
import { Pencil, Power, PowerOff } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { useUpdateUsuario, useUsuarios } from '@/hooks/use-usuarios';
import type { UsuarioListItem } from '@/types/usuario.types';

export type UsuariosTableProps = {
  negocioId?: number;
  onEdit: (usuario: UsuarioListItem) => void;
};

function getRolBadgeVariant(rol: string): 'default' | 'secondary' | 'outline' {
  switch (rol) {
    case 'Dueño':
      return 'default';
    case 'Admin':
      return 'secondary';
    default:
      return 'outline';
  }
}

export function UsuariosTable({ negocioId, onEdit }: UsuariosTableProps) {
  const { user } = useAuth();
  const canEdit = user?.rol === 'Dueño' || user?.rol === 'Admin';

  const { data, isLoading, error } = useUsuarios({ negocioId });
  const updateUsuario = useUpdateUsuario({ negocioId });

  const usuarios = data?.data.usuarios ?? [];

  const handleToggleActivo = React.useCallback(
    async (usuario: UsuarioListItem) => {
      await updateUsuario.mutateAsync({ id: usuario.id, data: { activo: !usuario.activo } });
    },
    [updateUsuario]
  );

  if (isLoading) {
    return <div className="text-sm text-slate-600">Cargando usuarios...</div>;
  }

  if (error instanceof Error) {
    return <div className="text-sm text-red-600">{error.message}</div>;
  }

  if (usuarios.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
        No hay usuarios para mostrar.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Negocios</TableHead>
            <TableHead>Estado</TableHead>
            {canEdit && <TableHead className="w-[120px]">Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {usuarios.map((usuario) => (
            <TableRow key={usuario.id}>
              <TableCell className="font-medium">{usuario.nombreCompleto}</TableCell>
              <TableCell>{usuario.email}</TableCell>
              <TableCell>
                <Badge variant={getRolBadgeVariant(usuario.rol)}>{usuario.rol}</Badge>
              </TableCell>
              <TableCell>{usuario.negocios?.length ?? 0}</TableCell>
              <TableCell>
                <Badge variant={usuario.activo ? 'default' : 'secondary'}>
                  {usuario.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </TableCell>
              {canEdit && (
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => onEdit(usuario)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleActivo(usuario)}
                      disabled={updateUsuario.isPending}
                    >
                      {usuario.activo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

