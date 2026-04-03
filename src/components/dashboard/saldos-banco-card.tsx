 'use client';

import * as React from 'react';
import { Landmark } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { useCuentasBanco } from '@/hooks/use-cuentas-banco';
import { useAuth } from '@/hooks/use-auth';
import type { TipoCuenta } from '@/types/cuenta_banco.types';

interface SaldosBancoCardProps {
  negocioId: number | null;
}

interface CuentaConSaldo {
  id: number;
  nombre: string;
  tipo: TipoCuenta;
  bancoInstitucion: string | null;
  saldoCalculado: number;
  saldoReal: number | null;
  diferencia: number | null;
}

function calcularSaldoCuenta(cuenta: { saldoReal: string | null; saldoInicial: string }): number {
  if (cuenta.saldoReal !== null && cuenta.saldoReal !== undefined) {
    return parseFloat(cuenta.saldoReal);
  }
  return parseFloat(cuenta.saldoInicial || '0');
}

export function SaldosBancoCard({ negocioId }: SaldosBancoCardProps) {
  const { user } = useAuth();
  const { data: cuentasRes, isLoading } = useCuentasBanco({ negocioId });
  const [saldos, setSaldos] = React.useState<CuentaConSaldo[]>([]);

  React.useEffect(() => {
    if (cuentasRes?.data) {
      const cuentasConSaldo = cuentasRes.data.map((cuenta) => ({
        ...cuenta,
        saldoCalculado: calcularSaldoCuenta(cuenta),
        saldoReal: cuenta.saldoReal ? parseFloat(cuenta.saldoReal) : null,
        diferencia: cuenta.saldoReal ? parseFloat(cuenta.saldoReal) - calcularSaldoCuenta(cuenta) : null,
      }));
      setSaldos(cuentasConSaldo);
    } else {
      setSaldos([]);
    }
  }, [cuentasRes]);

  const mostrarSaldos = user?.rol !== 'Externo';

  if (!mostrarSaldos) {
    return null;
  }

  if (!negocioId) {
    return null;
  }

  const totalConsolidado = saldos.reduce((sum, c) => sum + c.saldoCalculado, 0);

  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-foreground">
          <Landmark className="h-5 w-5" />
          Saldos por Cuenta
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-sm text-muted-foreground">Cargando...</div>
        ) : saldos.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No hay cuentas configuradas
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banco/Institución</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saldos.map((cuenta) => (
                  <TableRow key={cuenta.id}>
                    <TableCell>{cuenta.bancoInstitucion || cuenta.tipo}</TableCell>
                    <TableCell>{cuenta.nombre}</TableCell>
                    <TableCell>
                      {cuenta.saldoReal !== null ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                          Cuadrado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50">
                          Sin saldo real
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(cuenta.saldoCalculado)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 font-bold">
                  <TableCell colSpan={3}>Total Consolidado</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totalConsolidado)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
