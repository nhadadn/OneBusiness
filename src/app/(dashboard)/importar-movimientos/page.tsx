'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Loader2, TriangleAlert, Upload, X, XCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useQueryClient } from '@tanstack/react-query';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useApiClient } from '@/hooks/use-api-client';
import { useAuth } from '@/hooks/use-auth';

type Phase = 'subir' | 'previsualizando' | 'resultado';

type ImportErrorItem = { fila: number; campo: string; error: string };
type ErrorSource = 'client' | 'server';

type RowField = 'fecha' | 'tipo' | 'concepto' | 'monto' | 'negocio' | 'cuenta_banco' | 'tercero';

type PreviewRow = {
  excelRow: number;
  fecha: string;
  tipo: string;
  concepto: string;
  monto: string;
  negocio: string;
  cuenta_banco: string;
  tercero: string;
  errors: Partial<Record<RowField, Array<{ source: ErrorSource; message: string }>>>;
  isValid: boolean;
};

type ResultState =
  | { kind: 'success'; total: number; creados: number }
  | { kind: 'error'; message: string; canRetry: boolean };

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatNumberMX(value: number) {
  return new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function excelSerialToISODate(value: number): string {
  const parsed = XLSX.SSF.parse_date_code(value);
  if (!parsed || !parsed.y || !parsed.m || !parsed.d) return '';
  const y = String(parsed.y).padStart(4, '0');
  const m = String(parsed.m).padStart(2, '0');
  const d = String(parsed.d).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function asISODate(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return excelSerialToISODate(value);
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return normalizeCell(value);
}

function isValidISODate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parts = value.split('-');
  if (parts.length !== 3) return false;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  const dt = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return false;
  return dt.toISOString().slice(0, 10) === value;
}

function addError(row: PreviewRow, field: RowField, message: string, source: ErrorSource) {
  const list = row.errors[field] ?? [];
  row.errors[field] = [...list, { source, message }];
}

function hasAnyErrors(row: PreviewRow) {
  return Object.values(row.errors).some((arr) => Array.isArray(arr) && arr.length > 0);
}

function isAllowedFile(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith('.xlsx') || name.endsWith('.xls');
}

export default function ImportarMovimientosPage() {
  const router = useRouter();
  const { user, isLoading, accessToken, refreshSession, logout } = useAuth();
  const { apiFetch } = useApiClient();
  const queryClient = useQueryClient();

  const [phase, setPhase] = React.useState<Phase>('subir');

  const [downloadLoading, setDownloadLoading] = React.useState(false);
  const [downloadError, setDownloadError] = React.useState<string | null>(null);

  const [file, setFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const [parsing, setParsing] = React.useState(false);
  const [previewRows, setPreviewRows] = React.useState<PreviewRow[]>([]);
  const [serverErrors, setServerErrors] = React.useState<ImportErrorItem[]>([]);
  const [serverErrorBanner, setServerErrorBanner] = React.useState<string | null>(null);
  const [tooManyRowsError, setTooManyRowsError] = React.useState<string | null>(null);

  const [importing, setImporting] = React.useState(false);
  const [result, setResult] = React.useState<ResultState | null>(null);

  const canImport = user?.rol === 'Dueño' || user?.rol === 'Socio' || user?.rol === 'Admin';

  const summary = React.useMemo(() => {
    const total = previewRows.length;
    const errorRows = previewRows.filter((r) => !r.isValid).length;
    const validRows = total - errorRows;
    return { total, errorRows, validRows };
  }, [previewRows]);

  const hasBlockingErrors = summary.errorRows > 0 || serverErrors.length > 0 || Boolean(serverErrorBanner) || Boolean(tooManyRowsError);

  const resetAll = React.useCallback(() => {
    setPhase('subir');
    setFile(null);
    setFileError(null);
    setDragActive(false);
    setParsing(false);
    setPreviewRows([]);
    setServerErrors([]);
    setServerErrorBanner(null);
    setTooManyRowsError(null);
    setImporting(false);
    setResult(null);
    setDownloadError(null);
  }, []);

  const clearFileAndBackToUpload = React.useCallback(() => {
    setPhase('subir');
    setFile(null);
    setFileError(null);
    setPreviewRows([]);
    setServerErrors([]);
    setServerErrorBanner(null);
    setTooManyRowsError(null);
    setResult(null);
  }, []);

  const downloadTemplate = React.useCallback(async () => {
    setDownloadError(null);
    setDownloadLoading(true);
    try {
      const res = await apiFetch('/api/movimientos/plantilla', { headers: { 'Cache-Control': 'no-store' } });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Error HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla-movimientos.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'No se pudo descargar la plantilla');
    } finally {
      setDownloadLoading(false);
    }
  }, [apiFetch]);

  const parseFile = React.useCallback(async (selected: File) => {
    setParsing(true);
    setServerErrors([]);
    setServerErrorBanner(null);
    setTooManyRowsError(null);
    try {
      const buffer = await selected.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const sheet = workbook.Sheets['Movimientos'];
      if (!sheet) {
        setFileError('Hoja "Movimientos" no encontrada. Descarga la plantilla nuevamente.');
        setPreviewRows([]);
        setPhase('subir');
        return;
      }

      const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
      const dataRows = raw.slice(1).filter((row) => row.some((cell) => normalizeCell(cell) !== ''));

      if (dataRows.length > 200) {
        setTooManyRowsError('El archivo tiene más de 200 filas. Máximo 200 por importación.');
      }

      const limitedRows = dataRows.slice(0, 200);
      const rows: PreviewRow[] = limitedRows.map((row, index) => {
        const excelRow = index + 2;
        const r: PreviewRow = {
          excelRow,
          fecha: asISODate(row[0]),
          tipo: normalizeCell(row[1]),
          concepto: normalizeCell(row[2]),
          monto: normalizeCell(row[3]),
          negocio: normalizeCell(row[4]),
          cuenta_banco: normalizeCell(row[5]),
          tercero: normalizeCell(row[6]),
          errors: {},
          isValid: true,
        };

        if (!/^\d{4}-\d{2}-\d{2}$/.test(r.fecha) || !isValidISODate(r.fecha)) {
          addError(r, 'fecha', 'Formato YYYY-MM-DD y fecha válida requerida', 'client');
        }
        if (r.tipo !== 'INGRESO' && r.tipo !== 'EGRESO') {
          addError(r, 'tipo', 'Valor inválido. Use INGRESO o EGRESO', 'client');
        }
        if (!r.concepto.trim()) {
          addError(r, 'concepto', 'Concepto requerido', 'client');
        }

        const montoNum = Number.parseFloat(r.monto);
        if (!Number.isFinite(montoNum) || Number.isNaN(montoNum) || montoNum <= 0) {
          addError(r, 'monto', 'Debe ser un número mayor a 0', 'client');
        }
        if (!r.negocio.trim()) {
          addError(r, 'negocio', 'Negocio requerido', 'client');
        }
        if (!r.cuenta_banco.trim()) {
          addError(r, 'cuenta_banco', 'Cuenta requerida', 'client');
        }

        r.isValid = !hasAnyErrors(r);
        return r;
      });

      setPreviewRows(rows);
      setPhase('previsualizando');
    } catch {
      setFileError('No se pudo leer el archivo. Verifica que sea un Excel válido.');
      setPreviewRows([]);
      setPhase('subir');
    } finally {
      setParsing(false);
    }
  }, []);

  const mapServerErrorsToRows = React.useCallback((rows: PreviewRow[], errors: ImportErrorItem[]) => {
    const byRow = new Map<number, PreviewRow>();
    rows.forEach((r) => byRow.set(r.excelRow, r));
    for (const err of errors) {
      const target = byRow.get(err.fila);
      if (!target) continue;
      const field = err.campo as RowField;
      const allowed: RowField[] = ['fecha', 'tipo', 'concepto', 'monto', 'negocio', 'cuenta_banco', 'tercero'];
      const targetField: RowField = allowed.includes(field) ? field : 'concepto';
      addError(target, targetField, err.error, 'server');
      target.isValid = false;
    }
    return [...rows];
  }, []);

  const uploadWithAuth = React.useCallback(
    async (url: string, body: FormData): Promise<Response> => {
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      let res = await fetch(url, { method: 'POST', headers, credentials: 'include', body });

      if (res.status === 401) {
        const nextToken = await refreshSession();
        if (!nextToken) {
          await logout();
          return res;
        }
        res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${nextToken}` }, credentials: 'include', body });
      }

      return res;
    },
    [accessToken, logout, refreshSession]
  );

  const confirmImport = React.useCallback(async () => {
    if (!file) return;
    setImporting(true);
    setServerErrorBanner(null);
    setServerErrors([]);
    try {
      const form = new FormData();
      form.append('archivo', file);

      const res = await uploadWithAuth('/api/movimientos/importar', form);

      if (res.ok) {
        const data = (await res.json()) as { success: boolean; data: { total: number; creados: number } };
        void queryClient.invalidateQueries({ queryKey: ['movimientos'] });
        void queryClient.invalidateQueries({ queryKey: ['movimientos-pendientes'] });
        void queryClient.invalidateQueries({ queryKey: ['pendingCount'] });
        setResult({ kind: 'success', total: data.data.total, creados: data.data.creados });
        setPhase('resultado');
        return;
      }

      if (res.status === 400) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string; data?: { errores?: ImportErrorItem[] } };
        const errs = payload.data?.errores ?? [];
        setServerErrors(errs);
        setServerErrorBanner('El servidor encontró errores adicionales. Corrige el archivo y vuelve a intentar.');
        setPreviewRows((current) => mapServerErrorsToRows(current.map((r) => ({ ...r, errors: { ...r.errors } })), errs));
        setPhase('previsualizando');
        return;
      }

      setResult({ kind: 'error', message: 'Ocurrió un error inesperado. Ningún movimiento fue creado. Intenta de nuevo.', canRetry: true });
      setPhase('resultado');
    } catch {
      setResult({ kind: 'error', message: 'Ocurrió un error inesperado. Ningún movimiento fue creado. Intenta de nuevo.', canRetry: true });
      setPhase('resultado');
    } finally {
      setImporting(false);
    }
  }, [file, mapServerErrorsToRows, queryClient, uploadWithAuth]);

  const handleSelectFile = React.useCallback((next: File | null) => {
    setFileError(null);
    setServerErrors([]);
    setServerErrorBanner(null);
    setTooManyRowsError(null);
    setPreviewRows([]);

    if (!next) {
      setFile(null);
      return;
    }

    if (!isAllowedFile(next)) {
      setFile(null);
      setFileError('Solo se aceptan archivos .xlsx o .xls');
      return;
    }

    setFile(next);
  }, []);

  const onDrop = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragActive(false);
      const dropped = e.dataTransfer.files?.[0] ?? null;
      handleSelectFile(dropped);
    },
    [handleSelectFile]
  );

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-100" />
        <div className="h-40 w-full animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  if (!user) return null;

  if (!canImport) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <Button variant="ghost" className="px-0" onClick={() => router.push('/movimientos')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a movimientos
        </Button>
        <ErrorState message="No tienes permiso para importar movimientos." onRetry={() => router.push('/movimientos')} />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="space-y-2">
        <Button variant="ghost" className="px-0" onClick={() => router.push('/movimientos')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a movimientos
        </Button>
        <h1 className="text-3xl font-bold">Importar movimientos</h1>
      </div>

      {phase === 'subir' ? (
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Descargar plantilla</CardTitle>
              <CardDescription>¿Primera vez? Descarga la plantilla con los catálogos de negocios y cuentas ya incluidos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={downloadTemplate} disabled={downloadLoading}>
                  {downloadLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {downloadLoading ? 'Descargando...' : 'Descargar plantilla'}
                </Button>
              </div>
              {downloadError ? <div className="text-sm text-red-600">{downloadError}</div> : null}
            </CardContent>
          </Card>

          <div className="h-px w-full bg-slate-200" />

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Subir archivo</CardTitle>
              <CardDescription>Sube tu Excel completado para previsualizar antes de importar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    inputRef.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                }}
                onDrop={onDrop}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center ${
                  dragActive ? 'border-border bg-muted' : 'border-border bg-background'
                }`}
                aria-label="Zona para subir archivo Excel"
              >
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
                <div className="text-sm font-medium text-foreground">Arrastra tu archivo aquí</div>
                <div className="text-sm text-muted-foreground">o haz clic para seleccionar</div>
                <div className="text-xs text-muted-foreground">.xlsx o .xls</div>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                aria-label="Seleccionar archivo Excel"
                onChange={(e) => handleSelectFile(e.target.files?.[0] ?? null)}
              />

              {fileError ? <div className="text-sm text-red-600">{fileError}</div> : null}

              {file ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{file.name}</div>
                    <div className="text-xs text-muted-foreground">{formatBytes(file.size)}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleSelectFile(null)} aria-label="Quitar archivo">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => (file ? void parseFile(file) : null)}
                  disabled={!file || parsing}
                  className="w-full"
                >
                  {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {parsing ? 'Leyendo...' : 'Previsualizar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {phase === 'previsualizando' ? (
        <div className="space-y-4">
          {tooManyRowsError ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{tooManyRowsError}</div>
          ) : null}

          {serverErrorBanner ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{serverErrorBanner}</div>
          ) : null}

          {summary.total === 0 ? (
            <EmptyState
              icon={<FileSpreadsheet className="h-12 w-12 text-muted-foreground" />}
              title="Sin filas para previsualizar"
              description="El archivo no tiene datos en la hoja Movimientos."
            />
          ) : (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                hasBlockingErrors ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
            >
              {hasBlockingErrors ? (
                <div className="flex items-center gap-2">
                  <TriangleAlert className="h-4 w-4" aria-hidden="true" />
                  <div>{`${summary.errorRows} filas con error · ${summary.validRows} filas válidas · ${summary.total} filas en total`}</div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <div>{`${summary.total} filas listas para importar`}</div>
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg border border-border bg-card">
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="bg-slate-50">
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Fila</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Fecha</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Tipo</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Concepto</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Monto</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Negocio</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Cuenta</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Tercero</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => {
                    const montoNum = Number.parseFloat(row.monto);
                    const montoLabel = Number.isFinite(montoNum) ? formatNumberMX(montoNum) : row.monto;
                    return (
                      <tr key={row.excelRow} className={`border-b last:border-b-0 ${row.isValid ? 'hover:bg-slate-50/50' : 'bg-red-50 hover:bg-red-50'}`}>
                        <td className="px-4 py-3 align-top font-mono text-xs text-foreground">{row.excelRow}</td>

                        {(
                          [
                            ['fecha', row.fecha],
                            ['tipo', row.tipo],
                            ['concepto', row.concepto],
                            ['monto', montoLabel],
                            ['negocio', row.negocio],
                            ['cuenta_banco', row.cuenta_banco],
                            ['tercero', row.tercero || '—'],
                          ] as Array<[RowField, string]>
                        ).map(([field, value]) => {
                          const errs = row.errors[field] ?? [];
                          const showBadge = field === 'tipo';
                          return (
                            <td key={field} className="px-4 py-3 align-top">
                              {showBadge ? (
                                <Badge
                                  variant="outline"
                                  className={
                                    row.tipo === 'INGRESO'
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                      : row.tipo === 'EGRESO'
                                        ? 'border-red-200 bg-red-50 text-red-700'
                                        : 'border-border bg-card text-foreground'
                                  }
                                >
                                  {value || '—'}
                                </Badge>
                              ) : (
                                <div className="text-foreground">{value || '—'}</div>
                              )}

                              {errs.length > 0 ? (
                                <div className="mt-1 space-y-1">
                                  {errs.map((e, idx) => (
                                    <div key={`${e.source}-${idx}`} className="flex items-start gap-1 text-xs text-red-700">
                                      {e.source === 'server' ? (
                                        <TriangleAlert className="mt-0.5 h-3 w-3" aria-hidden="true" />
                                      ) : (
                                        <XCircle className="mt-0.5 h-3 w-3" aria-hidden="true" />
                                      )}
                                      <div>{e.message}</div>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </td>
                          );
                        })}

                        <td className="px-4 py-3 align-top">
                          {row.isValid ? (
                            <div className="flex items-center gap-2 text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                              <span>✓</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-red-700">
                              <XCircle className="h-4 w-4" aria-hidden="true" />
                              <span>✗</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {hasBlockingErrors ? (
              <Button variant="outline" onClick={clearFileAndBackToUpload}>
                <ArrowLeft className="h-4 w-4" />
                Corregir archivo
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={clearFileAndBackToUpload}>
                  <ArrowLeft className="h-4 w-4" />
                  Cambiar archivo
                </Button>
                <Button onClick={() => void confirmImport()} disabled={importing}>
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {importing ? 'Importando...' : 'Confirmar importación →'}
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}

      {phase === 'resultado' && result ? (
        result.kind === 'success' ? (
          <div className="mx-auto w-full max-w-2xl">
            <EmptyState
              icon={<CheckCircle2 className="h-12 w-12 text-muted-foreground" />}
              title="Importación completada"
              description={`Se crearon ${result.creados} movimientos exitosamente. Todos están en estado Pendiente de aprobación.`}
              className="py-10"
            />
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                onClick={() => {
                  router.push('/movimientos');
                }}
              >
                Ver movimientos
              </Button>
              <Button variant="outline" onClick={resetAll}>
                Importar otro archivo
              </Button>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-2xl space-y-4">
            <ErrorState title="Error al importar" message={result.message} />
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  if (result.canRetry) {
                    setPhase('subir');
                    setResult(null);
                    setServerErrors([]);
                    setServerErrorBanner(null);
                    setTooManyRowsError(null);
                    return;
                  }
                  resetAll();
                }}
              >
                Volver a intentar
              </Button>
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}
