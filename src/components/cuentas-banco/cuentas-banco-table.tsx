'use client';

import * as React from 'react';
import { CreditCard, Loader2, Pencil, Trash2, Wallet } from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { ConfigListLoader } from '@/components/shared/page-loader';
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
  onCreate?: () => void;
};

export function CuentasBancoTable({ negocioId, onEdit, onEditSaldo, onCreate }: CuentasBancoTableProps) {
  const { user } = useAuth();
  const canManage = user?.rol === 'Dueño' || user?.rol === 'Admin';

  const query = useCuentasBanco({ negocioId });
  const deleteCuenta = useDeleteCuentaBanco({ negocioId });

  const cuentas = query.data?.data ?? [];

  const handleDelete = React.useCallback(
    async (cuenta: CuentaBancoListItem) => {
      try {
        await deleteCuenta.mutateAsync(cuenta.id);
        toast.success('Cuenta bancaria eliminada', { duration: 2500 });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo eliminar la cuenta', { duration: 5000 });
      }
    },
    [deleteCuenta]
  );

  if (typeof negocioId !== 'number') {
    return <EmptyState icon={CreditCard} title="Sin negocio seleccionado" description="Selecciona un negocio para ver sus cuentas." />;
  }

  if (query.isLoading) {
    return <ConfigListLoader />;
  }

  if (query.error instanceof Error) {
    return <ErrorState message={query.error.message} onRetry={() => query.refetch()} />;
  }

  if (cuentas.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title="Sin cuentas bancarias"
        description="Agrega la primera cuenta bancaria para este negocio."
        action={canManage && onCreate ? { label: 'Nueva cuenta', onClick: onCreate } : undefined}
      />
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
                        {deleteCuenta.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
