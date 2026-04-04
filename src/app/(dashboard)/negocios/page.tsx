'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

import { NegocioDialog } from '@/components/negocios/negocio-dialog';
import { NegociosTable } from '@/components/negocios/negocios-table';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { useNegocios, type NegocioCrudItem } from '@/hooks/use-negocios';

type NegocioOption = { id: number; label: string };

export default function NegociosPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (user.rol === 'Externo') {
      router.push('/movimientos');
    }
  }, [router, user]);

  const isOwner = user?.rol === 'Dueño';

  const negocioOptions = useMemo<NegocioOption[]>(() => {
    if (!user) return [];
    return (user.negocios ?? []).map((id) => ({ id, label: `Negocio ${id}` }));
  }, [user]);

  const [negocioId, setNegocioId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedNegocio, setSelectedNegocio] = useState<NegocioCrudItem | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    if (isOwner) return;
    if (typeof negocioId === 'number') return;
    const first = negocioOptions[0]?.id ?? null;
    setNegocioId(first);
  }, [isOwner, negocioId, negocioOptions, user]);

  const negociosQuery = useNegocios({
    negocioId: isOwner ? undefined : typeof negocioId === 'number' ? negocioId : undefined,
    enabled: Boolean(user) && (isOwner || typeof negocioId === 'number'),
  });

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <LoadingSkeleton variant="table" rows={5} />
      </div>
    );
  }
  if (!user) return null;
  if (user.rol === 'Externo') return null;

  const handleCreate = () => {
    setSelectedNegocio(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (negocio: NegocioCrudItem) => {
    setSelectedNegocio(negocio);
    setDialogOpen(true);
  };

  const negocios = negociosQuery.data?.data ?? [];
  const needsInitialSelection = !isOwner && negocioOptions.length > 0 && typeof negocioId !== 'number';
  const showLoading = negociosQuery.isLoading || needsInitialSelection;

  return (
    <div className="container mx-auto space-y-6 py-6">
      <PageHeader
        title="Negocios"
        description="Gestiona negocios y su configuración"
        action={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {!isOwner && negocioOptions.length > 1 ? (
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
            ) : null}

            {isOwner ? (
              <Button variant="default" onClick={handleCreate} data-tour="negocios-new">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo negocio
              </Button>
            ) : null}
          </div>
        }
      />

      {showLoading ? <LoadingSkeleton variant="table" rows={5} /> : null}
      {!showLoading && negociosQuery.error instanceof Error ? (
        <div className="text-sm text-red-600">{negociosQuery.error.message}</div>
      ) : null}
      {!showLoading && !(negociosQuery.error instanceof Error) ? (
        <div data-tour="negocios-table">
          <NegociosTable negocios={negocios} canManage={isOwner} onEdit={handleEdit} onCreate={handleCreate} />
        </div>
      ) : null}

      <NegocioDialog open={dialogOpen} onOpenChange={setDialogOpen} negocio={selectedNegocio} />
    </div>
  );
}
