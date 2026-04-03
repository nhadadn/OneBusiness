'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';

import { UsuarioDialog } from '@/components/usuarios/usuario-dialog';
import { UsuariosTable } from '@/components/usuarios/usuarios-table';
import { UsuariosLoader } from '@/components/shared/page-loader';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import type { UsuarioListItem } from '@/types/usuario.types';

export default function UsuariosPage() {
  const { user, isLoading } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<UsuarioListItem | null>(null);

  const negocioId = useMemo(() => {
    if (!user) return undefined;
    if (user.rol === 'Dueño') return undefined;
    return user.negocios[0];
  }, [user]);

  const negociosOptions = useMemo(() => {
    if (!user) return [];
    return user.negocios.map((id) => ({ id, label: `Negocio ${id}` }));
  }, [user]);

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <UsuariosLoader />
      </div>
    );
  }
  if (!user) return null;

  const canCreate = user.rol === 'Dueño' || user.rol === 'Admin';

  const handleCreate = () => {
    setSelectedUsuario(null);
    setDialogOpen(true);
  };

  const handleEdit = (usuario: UsuarioListItem) => {
    setSelectedUsuario(usuario);
    setDialogOpen(true);
  };

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground">Gestiona los usuarios del sistema</p>
        </div>
        {canCreate && (
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Button>
        )}
      </div>

      <UsuariosTable negocioId={negocioId} onEdit={handleEdit} onCreate={canCreate ? handleCreate : undefined} />

      <UsuarioDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        usuario={selectedUsuario}
        negocioId={negocioId}
        negociosOptions={negociosOptions}
      />
    </div>
  );
}
