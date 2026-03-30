'use client';

import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';
import type { ArqueoCuentaBanco, ArqueoNegocio } from '@/types/cuenta_banco.types';

type ArqueoNegocioResponse = {
  success: boolean;
  data: ArqueoNegocio;
};

type ArqueoCuentaResponse = {
  success: boolean;
  data: ArqueoCuentaBanco;
};

function buildArqueoNegocioUrl(negocioId: number, fechaCorte?: string) {
  const base = `/api/negocios/${negocioId}/arqueo`;
  if (!fechaCorte) return base;
  const params = new URLSearchParams({ fechaCorte });
  return `${base}?${params.toString()}`;
}

function buildArqueoCuentaUrl(cuentaBancoId: number, fechaCorte?: string) {
  const base = `/api/cuentas-banco/${cuentaBancoId}/arqueo`;
  if (!fechaCorte) return base;
  const params = new URLSearchParams({ fechaCorte });
  return `${base}?${params.toString()}`;
}

export function useArqueoNegocio(params: { negocioId: number | null; fechaCorte?: string }) {
  return useQuery({
    queryKey: ['arqueo-negocio', params.negocioId, params.fechaCorte ?? null],
    enabled: typeof params.negocioId === 'number',
    queryFn: async () => {
      if (typeof params.negocioId !== 'number') {
        throw new Error('Negocio requerido');
      }
      const url = buildArqueoNegocioUrl(params.negocioId, params.fechaCorte);
      return apiFetch<ArqueoNegocioResponse>(url, { negocioId: params.negocioId });
    },
  });
}

export function useArqueoCuenta(params: { cuentaBancoId: number | null; fechaCorte?: string }) {
  return useQuery({
    queryKey: ['arqueo-cuenta', params.cuentaBancoId, params.fechaCorte ?? null],
    enabled: typeof params.cuentaBancoId === 'number',
    queryFn: async () => {
      if (typeof params.cuentaBancoId !== 'number') {
        throw new Error('Cuenta requerida');
      }
      const url = buildArqueoCuentaUrl(params.cuentaBancoId, params.fechaCorte);
      return apiFetch<ArqueoCuentaResponse>(url);
    },
  });
}

