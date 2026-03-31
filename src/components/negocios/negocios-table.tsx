'use client';

import * as React from 'react';
import { Loader2, Pencil, Store, Trash2 } from 'lucide-react';

import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

function formatCurrencyMXN(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(value);
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
        icon={Store}
        title="No hay negocios registrados"
        description="Crea el primer negocio para comenzar."
        action={canManage && onCreate ? { label: 'Nuevo negocio', onClick: onCreate } : undefined}
      />
    );
  }

  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Rubro</TableHead>
              <TableHead>RFC</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Umbrales</TableHead>
              {canManage ? <TableHead className="w-[140px]">Acciones</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {negocios.map((negocio) => {
              const umbralAlerta = parseMoney(negocio.umbralAlerta);
              return (
                <TableRow key={negocio.id}>
                  <TableCell className="font-medium">{negocio.nombre}</TableCell>
                  <TableCell>{negocio.rubro?.trim() ? negocio.rubro : '—'}</TableCell>
                  <TableCell>{negocio.rfc?.trim() ? negocio.rfc : '—'}</TableCell>
                  <TableCell>
                    {negocio.activo ? (
                      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Activo</Badge>
                    ) : (
                      <Badge variant="secondary">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono">{umbralAlerta === null ? '—' : formatCurrencyMXN(umbralAlerta)}</TableCell>
                  {canManage ? (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => onEdit(negocio)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
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
              className="bg-red-600 hover:bg-red-600/90"
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

