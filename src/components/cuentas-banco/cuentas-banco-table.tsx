'use client';

import * as React from 'react';
import { Pencil, Trash2, Wallet } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { useCuentasBanco, useDeleteCuentaBanco } from '@/hooks/use-cuentas-banco';
import type { CuentaBancoListItem } from '@/hooks/use-cuentas-banco';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(value);
}

function parseMoney(raw: string | null): number | null {
  if (!raw) return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || Number.isNaN(num)) return null;
  return num;
}

export type CuentasBancoTableProps = {
  negocioId: number | null;
  onEdit: (cuenta: CuentaBancoListItem) => void;
  onEditSaldo: (cuenta: CuentaBancoListItem) => void;
};

export function CuentasBancoTable({ negocioId, onEdit, onEditSaldo }: CuentasBancoTableProps) {
  const { user } = useAuth();
  const canManage = user?.rol === 'Dueño' || user?.rol === 'Admin';

  const { data, isLoading, error } = useCuentasBanco({ negocioId });
  const deleteCuenta = useDeleteCuentaBanco({ negocioId });

  const cuentas = data?.data ?? [];

  const handleDelete = React.useCallback(
    async (cuenta: CuentaBancoListItem) => {
      await deleteCuenta.mutateAsync(cuenta.id);
    },
    [deleteCuenta]
  );

  if (typeof negocioId !== 'number') {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Selecciona un negocio para ver sus cuentas.
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-sm text-slate-600">Cargando cuentas...</div>;
  }

  if (error instanceof Error) {
    return <div className="text-sm text-red-600">{error.message}</div>;
  }

  if (cuentas.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
        No hay cuentas para mostrar.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Banco</TableHead>
            <TableHead>Titular</TableHead>
            <TableHead className="text-right">Saldo inicial</TableHead>
            <TableHead className="text-right">Saldo real</TableHead>
            <TableHead>Estado</TableHead>
            {canManage && <TableHead className="w-[160px]">Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {cuentas.map((cuenta) => {
            const saldoInicial = parseMoney(cuenta.saldoInicial) ?? 0;
            const saldoReal = parseMoney(cuenta.saldoReal);
            return (
              <TableRow key={cuenta.id}>
                <TableCell className="font-medium">{cuenta.nombre}</TableCell>
                <TableCell>
                  <Badge variant="outline">{cuenta.tipo}</Badge>
                </TableCell>
                <TableCell>{cuenta.bancoInstitucion ?? '—'}</TableCell>
                <TableCell>{cuenta.titular ?? '—'}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(saldoInicial)}</TableCell>
                <TableCell className="text-right font-mono">{saldoReal === null ? '—' : formatCurrency(saldoReal)}</TableCell>
                <TableCell>
                  <Badge variant={cuenta.activo ? 'default' : 'secondary'}>{cuenta.activo ? 'Activa' : 'Inactiva'}</Badge>
                </TableCell>
                {canManage && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => onEdit(cuenta)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onEditSaldo(cuenta)}>
                        <Wallet className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(cuenta)}
                        disabled={deleteCuenta.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

