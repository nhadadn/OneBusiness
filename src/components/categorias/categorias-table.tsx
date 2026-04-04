'use client';

import * as React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import type { Categoria } from '@/types/categoria.types';

function toUiTipo(tipo: Categoria['tipo']): 'ingreso' | 'egreso' {
  const lower = String(tipo).toLowerCase();
  return lower === 'ingreso' ? 'ingreso' : 'egreso';
}

function formatTipoLabel(tipo: 'ingreso' | 'egreso') {
  return tipo === 'ingreso' ? 'Ingreso' : 'Egreso';
}

function parseMoney(raw: string | null): number | null {
  if (!raw) return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || Number.isNaN(num)) return null;
  return num;
}

export type CategoriasTableProps = {
  categorias: Categoria[];
  onEditar: (categoria: Categoria) => void;
  onDesactivar: (id: number) => void;
  puedeEditar: boolean;
  rol: string;
};

export function CategoriasTable({ categorias, onEditar, onDesactivar, puedeEditar, rol }: CategoriasTableProps) {
  if (categorias.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        No hay categorías registradas.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Nombre</TableHead>
            <TableHead scope="col">Tipo</TableHead>
            <TableHead scope="col">Ámbito</TableHead>
            <TableHead scope="col">Aprobación</TableHead>
            <TableHead scope="col">Estado</TableHead>
            {puedeEditar ? (
              <TableHead scope="col" className="w-[140px]">
                Acciones
              </TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {categorias.map((categoria) => {
            const tipo = toUiTipo(categoria.tipo);
            const isGlobal = categoria.negocioId === null;
            const isOwner = rol === 'Dueño';
            const canEditThis = puedeEditar && (!isGlobal || isOwner);
            const maxAuto = parseMoney(categoria.montoMaxSinAprobacion);

            return (
              <TableRow key={categoria.id}>
                <TableCell className="font-medium">{categoria.nombre}</TableCell>
                <TableCell>
                  <Badge variant={tipo === 'egreso' ? 'destructive' : 'default'}>{formatTipoLabel(tipo)}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={isGlobal ? 'outline' : 'secondary'}>{isGlobal ? 'Global' : 'Específica'}</Badge>
                </TableCell>
                <TableCell>
                  {categoria.requiereAprobacion === false ? (
                    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Automática</Badge>
                  ) : maxAuto !== null ? (
                    <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">{`Hasta ${formatCurrency(maxAuto)} auto`}</Badge>
                  ) : (
                    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                      Requerida
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={categoria.activa ? 'default' : 'secondary'}>{categoria.activa ? 'Activa' : 'Inactiva'}</Badge>
                </TableCell>
                {puedeEditar ? (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEditar(categoria)}
                        disabled={!canEditThis}
                        aria-label="Editar categoría"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDesactivar(categoria.id)}
                        disabled={!canEditThis}
                        aria-label="Desactivar categoría"
                      >
                        <Trash2 className="h-4 w-4" />
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
  );
}

