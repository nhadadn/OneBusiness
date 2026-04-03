'use client';

import * as React from 'react';
import { Loader2, Pencil, Store, Trash2 } from 'lucide-react';

import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useEliminarNegocio, type NegocioCrudItem } from '@/hooks/use-negocios';

function parseMoney(raw: string | null): number | null {
  if (!raw) return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || Number.isNaN(num)) return null;
  return num;
}

export type NegociosTableProps = {
  negocios: NegocioCrudItem[];
  canManage: boolean;
  onEdit: (negocio: NegocioCrudItem) => void;
  onCreate?: () => void;
};

export function NegociosTable({ negocios, canManage, onEdit, onCreate }: NegociosTableProps) {
  const eliminar = useEliminarNegocio();
  const [eliminarOpen, setEliminarOpen] = React.useState(false);
  const [eliminarTarget, setEliminarTarget] = React.useState<NegocioCrudItem | null>(null);

  if (negocios.length === 0) {
    return (
      <EmptyState
        icon={<Store className="h-12 w-12 text-muted-foreground" />}
        title="No hay negocios registrados"
        description="Crea el primer negocio para comenzar."
        action={canManage && onCreate ? { label: 'Nuevo negocio', onClick: onCreate } : undefined}
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden sm:table-cell">Rubro</TableHead>
              <TableHead className="hidden sm:table-cell">RFC</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden sm:table-cell">Umbrales</TableHead>
              {canManage ? <TableHead className="w-[80px] px-2 sm:px-4">Acciones</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {negocios.map((negocio) => {
              const umbralAlerta = parseMoney(negocio.umbralAlerta);
              return (
                <TableRow key={negocio.id}>
                  <TableCell className="font-medium">{negocio.nombre}</TableCell>
                  <TableCell className="hidden sm:table-cell">{negocio.rubro?.trim() ? negocio.rubro : '—'}</TableCell>
                  <TableCell className="hidden sm:table-cell">{negocio.rfc?.trim() ? negocio.rfc : '—'}</TableCell>
                  <TableCell>
                    {negocio.activo ? (
                      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Activo</Badge>
                    ) : (
                      <Badge variant="secondary">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell font-mono">
                    {umbralAlerta === null ? '—' : formatCurrency(umbralAlerta)}
                  </TableCell>
                  {canManage ? (
                    <TableCell className="px-2 sm:px-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => onEdit(negocio)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setEliminarTarget(negocio);
                            setEliminarOpen(true);
                          }}
                          disabled={eliminar.isPending}
                        >
                          {eliminar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={eliminarOpen} onOpenChange={setEliminarOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar negocio</AlertDialogTitle>
            <AlertDialogDescription>
              {eliminarTarget
                ? `Se marcará como inactivo "${eliminarTarget.nombre}". Esta acción no se puede deshacer.`
                : 'Selecciona un negocio'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setEliminarOpen(false)} disabled={eliminar.isPending}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={eliminar.isPending || !eliminarTarget}
              onClick={async () => {
                if (!eliminarTarget) return;
                await eliminar.mutateAsync(eliminarTarget.id);
                setEliminarOpen(false);
                setEliminarTarget(null);
              }}
            >
              Confirmar eliminación
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

