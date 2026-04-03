'use client';

import * as React from 'react';
import { Loader2, Pencil, Power, PowerOff, UserRound } from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { UsuariosLoader } from '@/components/shared/page-loader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { useUpdateUsuario, useUsuarios } from '@/hooks/use-usuarios';
import type { UsuarioListItem } from '@/types/usuario.types';

export type UsuariosTableProps = {
  negocioId?: number;
  onEdit: (usuario: UsuarioListItem) => void;
  onCreate?: () => void;
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

export function UsuariosTable({ negocioId, onEdit, onCreate }: UsuariosTableProps) {
  const { user } = useAuth();
  const canEdit = user?.rol === 'Dueño' || user?.rol === 'Admin';

  const query = useUsuarios({ negocioId });
  const updateUsuario = useUpdateUsuario({ negocioId });

  const usuarios = query.data?.data.usuarios ?? [];

  const handleToggleActivo = React.useCallback(
    async (usuario: UsuarioListItem) => {
      try {
        await updateUsuario.mutateAsync({ id: usuario.id, data: { activo: !usuario.activo } });
        toast.success(usuario.activo ? 'Usuario desactivado' : 'Usuario activado', { duration: 2500 });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el usuario', { duration: 5000 });
      }
    },
    [updateUsuario]
  );

  if (query.isLoading) {
    return <UsuariosLoader />;
  }

  if (query.error instanceof Error) {
    return <ErrorState message={query.error.message} onRetry={() => query.refetch()} />;
  }

  if (usuarios.length === 0) {
    return (
      <EmptyState
        icon={<UserRound className="h-12 w-12 text-muted-foreground" />}
        title="Sin usuarios"
        description="Agrega el primer usuario para este negocio."
        action={canEdit && onCreate ? { label: 'Nuevo usuario', onClick: onCreate } : undefined}
      />
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
                      {updateUsuario.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : usuario.activo ? (
                        <PowerOff className="h-4 w-4" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
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
