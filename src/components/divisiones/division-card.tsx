'use client';

import { GitBranch, Layers, Pencil, Plus, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { CentroCostoListItem, CentroCostoTree } from '@/types/centro_costo.types';

export interface DivisionCardProps {
  division: CentroCostoTree;
  onEditDivision: (item: CentroCostoListItem) => void;
  onAddSubdivision: (parentId: number) => void;
  onEditSubdivision: (item: CentroCostoListItem) => void;
  onDelete: (item: CentroCostoListItem) => void;
}

export function DivisionCard({
  division,
  onEditDivision,
  onAddSubdivision,
  onEditSubdivision,
  onDelete,
}: DivisionCardProps) {
  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">{division.nombre}</span>
            {division.codigo ? (
              <Badge variant="outline" className="text-xs">
                {division.codigo}
              </Badge>
            ) : null}
            <Badge variant="secondary" className="text-xs">
              {division.hijos.length} sub-división{division.hijos.length !== 1 ? 'es' : ''}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAddSubdivision(division.id)}
              aria-label="Agregar sub-división"
            >
              <Plus className="mr-1 h-3 w-3" /> Sub-división
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onEditDivision(division)} aria-label="Editar división">
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(division)}
              aria-label="Eliminar división"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        {division.descripcion ? <p className="mt-1 text-sm text-muted-foreground">{division.descripcion}</p> : null}
      </CardHeader>

      {division.hijos.length > 0 ? (
        <CardContent className="px-4 pb-4 pt-0">
          <div className="ml-4 space-y-2 border-l-2 border-border pl-4">
            {division.hijos.map((hijo) => (
              <div key={hijo.id} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm text-foreground">{hijo.nombre}</span>
                  {hijo.codigo ? (
                    <Badge variant="outline" className="text-xs">
                      {hijo.codigo}
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEditSubdivision(hijo)}
                    aria-label="Editar sub-división"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(hijo)}
                    aria-label="Eliminar sub-división"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}
