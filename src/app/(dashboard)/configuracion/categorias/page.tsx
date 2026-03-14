'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Tags } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { CategoriaForm } from '@/components/categorias/categoria-form';
import { CategoriasTable } from '@/components/categorias/categorias-table';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { ConfigListLoader } from '@/components/shared/page-loader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { useNegocios } from '@/hooks/use-negocios';
import { apiFetch } from '@/lib/api-client';
import type { Categoria } from '@/types/categoria.types';

type TipoFiltro = 'todas' | 'ingreso' | 'egreso';
type ListResponse = { success: boolean; data: Categoria[] };

type NegocioOption = { id: number; label: string };

export default function CategoriasPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (user.rol === 'Externo') {
      router.push('/movimientos');
    }
  }, [router, user]);

  const isOwner = user?.rol === 'Dueño';
  const canManage = user?.rol === 'Dueño' || user?.rol === 'Admin' || user?.rol === 'Socio';

  const negociosQuery = useNegocios({ negocioId: undefined, enabled: Boolean(isOwner) });

  const negocioOptions = useMemo<NegocioOption[]>(() => {
    if (!user) return [];
    if (isOwner) {
      const apiItems = negociosQuery.data?.data ?? [];
      if (apiItems.length > 0) {
        return apiItems.map((n) => ({ id: n.id, label: n.nombre?.trim() ? n.nombre : `Negocio ${n.id}` }));
      }
    }
    return (user.negocios ?? []).map((id) => ({ id, label: `Negocio ${id}` }));
  }, [isOwner, negociosQuery.data?.data, user]);

  const [negocioId, setNegocioId] = useState<number | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<TipoFiltro>('todas');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);

  useEffect(() => {
    if (!user) return;
    if (typeof negocioId === 'number') return;
    const first = negocioOptions[0]?.id ?? null;
    setNegocioId(first);
  }, [negocioId, negocioOptions, user]);

  const tipoQuery = filtroTipo === 'todas' ? undefined : filtroTipo;
  const queryUrl = tipoQuery ? `/api/categorias?tipo=${encodeURIComponent(tipoQuery)}` : '/api/categorias';

  const categoriasQuery = useQuery({
    queryKey: ['categorias', negocioId, tipoQuery],
    enabled: typeof negocioId === 'number',
    queryFn: async () => {
      return apiFetch<ListResponse>(queryUrl, { negocioId: negocioId ?? undefined });
    },
  });

  const desactivarMutation = useMutation({
    mutationFn: async (id: number) => {
      if (typeof negocioId !== 'number') {
        throw new Error('Negocio requerido');
      }
      return apiFetch<{ success: boolean; data: Categoria }>(`/api/categorias/${id}`, { method: 'DELETE', negocioId });
    },
    onSuccess: async () => {
      await categoriasQuery.refetch();
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <ConfigListLoader />
      </div>
    );
  }
  if (!user) return null;
  if (user.rol === 'Externo') return null;

  const categorias = categoriasQuery.data?.data ?? [];

  const handleNueva = () => {
    setCategoriaEditando(null);
    setModalAbierto(true);
  };

  const handleEditar = (categoria: Categoria) => {
    setCategoriaEditando(categoria);
    setModalAbierto(true);
  };

  const handleDesactivar = async (id: number) => {
    if (!canManage) return;
    const ok = window.confirm('¿Deseas desactivar esta categoría?');
    if (!ok) return;
    try {
      await desactivarMutation.mutateAsync(id);
      toast.success('Categoría desactivada', { duration: 2500 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo desactivar la categoría', { duration: 5000 });
    }
  };

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categorías</h1>
          <p className="text-slate-600">Gestiona las categorías de movimientos</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={negocioId ? String(negocioId) : ''} onValueChange={(val) => setNegocioId(Number(val))}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Seleccionar negocio" />
            </SelectTrigger>
            <SelectContent>
              {negocioOptions.map((opt) => (
                <SelectItem key={opt.id} value={String(opt.id)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {user.rol !== 'Externo' && (
            <Button onClick={handleNueva} disabled={typeof negocioId !== 'number'}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Categoría
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={filtroTipo === 'todas' ? 'default' : 'outline'} onClick={() => setFiltroTipo('todas')}>
          Todas
        </Button>
        <Button variant={filtroTipo === 'ingreso' ? 'default' : 'outline'} onClick={() => setFiltroTipo('ingreso')}>
          Ingresos
        </Button>
        <Button variant={filtroTipo === 'egreso' ? 'default' : 'outline'} onClick={() => setFiltroTipo('egreso')}>
          Egresos
        </Button>
      </div>

      {typeof negocioId !== 'number' ? (
        <EmptyState icon={Tags} title="Sin negocio seleccionado" description="Selecciona un negocio para ver sus categorías." />
      ) : categoriasQuery.isLoading ? (
        <ConfigListLoader />
      ) : categoriasQuery.error instanceof Error ? (
        <ErrorState message={categoriasQuery.error.message} onRetry={() => categoriasQuery.refetch()} />
      ) : categorias.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Sin categorías"
          description="Las categorías ayudan a organizar los movimientos."
          action={canManage ? { label: 'Nueva categoría', onClick: handleNueva } : undefined}
        />
      ) : (
        <CategoriasTable
          categorias={categorias}
          onEditar={handleEditar}
          onDesactivar={handleDesactivar}
          puedeEditar={user.rol !== 'Externo'}
          rol={user.rol}
        />
      )}

      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{categoriaEditando ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
            <DialogDescription>
              {categoriaEditando ? 'Actualiza la información de la categoría.' : 'Crea una categoría para este negocio.'}
            </DialogDescription>
          </DialogHeader>

          {typeof negocioId === 'number' ? (
            <CategoriaForm
              categoria={categoriaEditando}
              negocioId={negocioId}
              rol={user.rol}
              onExito={async () => {
                setModalAbierto(false);
                await categoriasQuery.refetch();
              }}
              onCancelar={() => setModalAbierto(false)}
            />
          ) : (
            <div className="text-sm text-slate-600">Selecciona un negocio para continuar.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
