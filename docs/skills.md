ONEBUSINESS — TRAE AI SKILLS

Documento de Referencia para Configuración de Agentes

**Proyecto:** OneBusiness | **Repositorio:** https://github.com/nhadadn/OneBusiness
**Entorno:** Windows + PowerShell | **Versión:** 1.0 | **Fecha:** Marzo 2025


⸻


INSTRUCCIONES DE USO

Este documento contiene los skills que deben configurarse en los agentes de Trae AI
para el proyecto OneBusiness. Cada skill es autocontenido y puede copiarse
directamente en la configuración del agente correspondiente.


**Agentes recomendados y sus skills:**


Agente	Skills a asignar
Backend Agent	SK-01, SK-02, SK-03, SK-05, SK-06, SK-07, SK-08, SK-09
Frontend Agent	SK-01, SK-04, SK-05, SK-06, SK-07, SK-08, SK-10
QA Agent	SK-01, SK-06, SK-07, SK-11, SK-12
Orquestador	SK-01, SK-05, SK-07, SK-12, SK-13, SK-14

⸻


ÍNDICE DE SKILLS

ID	Nombre	Agentes	Prioridad
SK-01	OneBusiness Project Context	Todos	CRÍTICA
SK-02	Drizzle ORM & Database Schema	Backend	CRÍTICA
SK-03	API Route Architecture	Backend	CRÍTICA
SK-04	React Query & Custom Hooks	Frontend	CRÍTICA
SK-05	RBAC & Multi-Tenant Security	Backend + Frontend	CRÍTICA
SK-06	TypeScript Strict Enforcer	Todos	ALTA
SK-07	Windows PowerShell Validator	Todos	ALTA
SK-08	Zod Validation Patterns	Backend + Frontend	ALTA
SK-09	Financial Calculations	Backend	ALTA
SK-10	shadcn/ui Component Library	Frontend	ALTA
SK-11	Vitest Testing Patterns	QA	ALTA
SK-12	Git Workflow & Commit Standards	Todos	ALTA
SK-13	UTF-8 BOM & Encoding Guardian	Todos	ALTA
SK-14	Anti-Duplication Auditor	Todos	MEDIA

⸻


═══════════════════════════════════════════════════════════════════════

SK-01: OneBusiness Project Context

**Agentes:** Todos | **Prioridad:** CRÍTICA
═══════════════════════════════════════════════════════════════════════


PROYECTO: OneBusiness
Sistema de gestión corporativa multi-tenant para un holding empresarial.
Reemplaza flujos de Excel con gestión financiera centralizada.
Repositorio: https://github.com/nhadadn/OneBusiness
Branch activo de desarrollo: sprint-1.4

━━━ STACK TECNOLÓGICO ━━━

Frontend:
  - Next.js 14 con App Router (NO Pages Router, NO getServerSideProps)
  - TypeScript strict mode (strict: true en tsconfig.json)
  - Tailwind CSS para estilos
  - shadcn/ui para componentes UI
  - @tanstack/react-query v5 para estado del servidor
  - React Hook Form + Zod + @hookform/resolvers para formularios
  - apiFetch custom en src/lib/api-client.ts
    → Agrega JWT automáticamente desde cookie/localStorage
    → Agrega header X-Negocio-Id automáticamente
    → Hace refresh automático en respuesta 401
  - useToast de @/components/ui/use-toast para notificaciones
    (NO sonner, NO react-hot-toast, NO react-toastify)

Backend:
  - Next.js API Routes (App Router, carpeta src/app/api/)
  - Drizzle ORM con PostgreSQL
  - JWT access + refresh tokens (src/lib/jwt.ts)
  - Zod para validación en TODOS los endpoints sin excepción
  - Resend para emails transaccionales (src/services/email.service.ts)

━━━ ESTRUCTURA DE CARPETAS ━━━

src/
├── app/
│   ├── (auth)/login/          → Página de login
│   ├── (dashboard)/           → Rutas protegidas del dashboard
│   │   ├── dashboard/         → Dashboard principal
│   │   ├── movimientos/       → CRUD movimientos + aprobación
│   │   ├── cotizaciones/      → CRUD cotizaciones
│   │   ├── configuracion/     → Cuentas banco, categorías
│   │   ├── negocios/          → CRUD negocios
│   │   └── usuarios/          → CRUD usuarios
│   └── api/                   → API Routes del backend
├── components/                → Componentes React reutilizables
├── hooks/                     → Custom hooks con React Query
├── services/                  → Lógica de negocio del backend
├── middleware/                → auth-middleware, permissions, tenant
├── types/                     → Tipos TypeScript compartidos
├── lib/                       → api-client, drizzle, jwt, utils
└── contexts/                  → auth-context.tsx

━━━ ROLES DEL SISTEMA ━━━

Dueño:   Acceso total. Ve todos los negocios sin filtro de tenant.
Admin:   Ve y gestiona los negocios que tiene asignados.
Socio:   Ve todos los movimientos de su negocio asignado.
Externo: Ve SOLO los movimientos que él mismo creó (creadoPor = su id).

━━━ REGLAS ABSOLUTAS (nunca romper) ━━━

R1: NUNCA crear un hook si ya existe uno similar → extender el existente
R2: NUNCA redefinir formatCurrencyMXN, parseMoney, formatDateDMY → importar de src/lib/utils.ts
R3: NUNCA usar parseInt() para montos monetarios → usar parseFloat()
R4: NUNCA usar sonner → usar useToast de @/components/ui/use-toast
R5: NUNCA modificar archivos fuera del scope del prompt recibido
R6: SIEMPRE verificar el nombre exacto de hooks antes de importar
R7: SIEMPRE agregar export const dynamic = 'force-dynamic' en API routes
R8: SIEMPRE usar db.transaction() para operaciones que crean múltiples registros relacionados
R9: NUNCA hardcodear negocioId → siempre viene del header X-Negocio-Id
R10: SIEMPRE validar con Zod antes de procesar cualquier dato en API routes
R11: NUNCA asumir que un archivo existe → verificar con Test-Path antes de modificar
R12: Los montos en BD son string (Decimal de PostgreSQL) → parseFloat() para operar

━━━ HELPERS DISPONIBLES EN src/lib/utils.ts ━━━

formatCurrencyMXN(value: number | string): string
  → Formatea como moneda MXN: $1,234.56

parseMoney(value: string | null | undefined): number
  → Convierte string Decimal de BD a number

formatDateDMY(date: string | Date): string
  → Formatea fecha como dd/mm/yyyy

cn(...classes): string
  → Combina clases de Tailwind (clsx + tailwind-merge)


⸻


═══════════════════════════════════════════════════════════════════════

SK-02: Drizzle ORM & Database Schema

**Agentes:** Backend | **Prioridad:** CRÍTICA
═══════════════════════════════════════════════════════════════════════


ARCHIVO PRINCIPAL: src/lib/drizzle.ts
ARCHIVO DE CONEXIÓN: src/lib/db.ts (importar db desde aquí)

━━━ ENUMS DEFINIDOS ━━━

rolEnum:              'Dueño' | 'Admin' | 'Socio' | 'Externo'
tipoMovimientoEnum:   'INGRESO' | 'EGRESO' | 'TRASPASO_SALIDA' | 'TRASPASO_ENTRADA'
estadoMovimientoEnum: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'
tipoCuentaEnum:       'EFECTIVO' | 'BANCARIA' | 'CAJA_CHICA'
tipoCategoriaEnum:    'INGRESO' | 'EGRESO'
estadoCotizacionEnum: 'BORRADOR' | 'ENVIADA' | 'APROBADA' | 'FACTURADA' | 'CANCELADA'

━━━ TABLAS Y CAMPOS EXACTOS ━━━

usuarios:
  id, nombre, email, passwordHash, rol(rolEnum),
  activo(bool), createdAt, updatedAt

negocios:
  id, nombre, descripcion, activo(bool), createdAt, updatedAt

usuarioNegocio:
  id, usuarioId→usuarios, negocioId→negocios,
  rol(rolEnum), activo(bool)

cuentasBanco:
  id, nombre, tipo(tipoCuentaEnum), bancoInstitucion(nullable),
  titular(nullable), negocioId→negocios,
  saldoInicial(numeric, default '0'), saldoReal(numeric, nullable),
  fechaSaldoReal(timestamp, nullable), activo(bool),
  createdAt, updatedAt

categorias:
  id, nombre, tipo(tipoCategoriaEnum),
  negocioId→negocios(nullable → null = categoría global),
  activa(bool), createdAt, updatedAt

centrosCosto:
  id, nombre, codigo(nullable), negocioId→negocios, activo(bool)

movimientos:
  id, negocioId→negocios, centroCostoId→centrosCosto(nullable),
  tipo(tipoMovimientoEnum), fecha(date), concepto, tercero(nullable),
  monto(numeric), cuentaBancoId→cuentasBanco,
  negocioDestinoId→negocios(nullable),
  cuentaBancoDestinoId→cuentasBanco(nullable),
  traspasoRefId→movimientos(nullable, self-reference),
  estado(estadoMovimientoEnum, default 'PENDIENTE'),
  categoriaId→categorias(nullable),
  creadoPor→usuarios, aprobadoPor→usuarios(nullable),
  fechaAprobacion(timestamp, nullable), motivoRechazo(nullable),
  version(int, default 1), activo(bool), createdAt, updatedAt

cotizaciones:
  id, negocioId→negocios, clienteNombre, clienteEmail(nullable),
  clienteTelefono(nullable), concepto,
  subtotal(numeric), impuesto(numeric), total(numeric),
  estado(estadoCotizacionEnum, default 'BORRADOR'),
  notas(nullable), creadoPor→usuarios,
  fechaVencimiento(timestamp, nullable), createdAt, updatedAt

cotizacionItems:
  id, cotizacionId→cotizaciones, descripcion,
  cantidad(numeric), precioUnitario(numeric), subtotal(numeric)

━━━ IMPORTACIONES CORRECTAS ━━━

import { db } from '@/lib/db';
import {
  usuarios, negocios, usuarioNegocio, cuentasBanco,
  categorias, centrosCosto, movimientos,
  cotizaciones, cotizacionItems
} from '@/lib/drizzle';
import {
  eq, and, or, not, gte, lte, gt, lt,
  like, ilike, inArray, notInArray,
  isNull, isNotNull, desc, asc,
  sql, count, sum, avg, max, min
} from 'drizzle-orm';

━━━ PATRONES DE QUERY ━━━

// SELECT básico:
const items = await db
  .select()
  .from(movimientos)
  .where(and(
    eq(movimientos.negocioId, negocioId),
    eq(movimientos.activo, true)
  ))
  .orderBy(desc(movimientos.createdAt));

// SELECT con campos específicos:
const items = await db
  .select({
    id: movimientos.id,
    concepto: movimientos.concepto,
    monto: movimientos.monto,
  })
  .from(movimientos)
  .where(eq(movimientos.negocioId, negocioId));

// SELECT con JOIN:
const items = await db
  .select({
    movimiento: movimientos,
    cuenta: { nombre: cuentasBanco.nombre },
  })
  .from(movimientos)
  .leftJoin(cuentasBanco, eq(movimientos.cuentaBancoId, cuentasBanco.id))
  .where(eq(movimientos.negocioId, negocioId));

// INSERT con returning:
const [nuevo] = await db
  .insert(movimientos)
  .values({ concepto: 'test', monto: '1000', ... })
  .returning();

// UPDATE con returning:
const [actualizado] = await db
  .update(movimientos)
  .set({ estado: 'APROBADO', updatedAt: new Date() })
  .where(eq(movimientos.id, id))
  .returning();

// TRANSACCIÓN (obligatoria para múltiples inserts relacionados):
const resultado = await db.transaction(async (tx) => {
  const [mov1] = await tx.insert(movimientos).values({...}).returning();
  const [mov2] = await tx.insert(movimientos).values({
    traspasoRefId: mov1.id, ...
  }).returning();
  return { mov1, mov2 };
});

// PAGINACIÓN:
const [items, [{ total }]] = await Promise.all([
  db.select().from(movimientos)
    .where(conditions)
    .orderBy(desc(movimientos.createdAt))
    .limit(limit)
    .offset((page - 1) * limit),
  db.select({ total: count() }).from(movimientos).where(conditions),
]);

━━━ COMANDOS DE MIGRACIÓN (PowerShell) ━━━

npm run db:generate   → genera archivo SQL en /drizzle/migrations/
npm run db:migrate    → aplica migración pendiente a la BD
npm run db:studio     → abre Drizzle Studio en el navegador

━━━ REGLAS DE MIGRACIÓN ━━━

1. NUNCA modificar migraciones ya aplicadas (archivos en /drizzle/migrations/)
2. SIEMPRE hacer nullable los campos nuevos en tablas con datos existentes
3. SIEMPRE agregar índices para campos usados en WHERE frecuentes
4. Flujo obligatorio: modificar drizzle.ts → db:generate → db:migrate → build
5. Verificar que npm run build pasa después de cada migración

━━━ PATRÓN DE ÍNDICES ━━━

(table) => ({
  negocioIdIdx: index('idx_tabla_negocio_id').on(table.negocioId),
  activoIdx:    index('idx_tabla_activo').on(table.activo),
  estadoIdx:    index('idx_tabla_estado').on(table.estado),
  // Un índice por cada campo usado frecuentemente en WHERE
})


⸻


═══════════════════════════════════════════════════════════════════════

SK-03: API Route Architecture

**Agentes:** Backend | **Prioridad:** CRÍTICA
═══════════════════════════════════════════════════════════════════════


UBICACIÓN: src/app/api/[recurso]/route.ts
PATRÓN: Next.js 14 App Router API Routes

━━━ IMPORTS ESTÁNDAR ━━━

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  authenticateRequest,
  unauthorizedResponse,
  handleServiceError
} from '@/middleware/auth-middleware';
import { authorizeRequest, forbiddenResponse } from '@/middleware/permissions';
import { validateTenantAccess } from '@/middleware/tenant-middleware';
import { db } from '@/lib/db';
import { tabla } from '@/lib/drizzle';
import { eq, and } from 'drizzle-orm';

━━━ TEMPLATE COMPLETO GET + POST ━━━

export const dynamic = 'force-dynamic'; // SIEMPRE, en todos los routes

const querySchema = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const createSchema = z.object({
  campo1: z.string().min(1, 'Requerido'),
  campo2: z.number().positive(),
  campoOpcional: z.string().optional(),
});

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.success) return unauthorizedResponse(auth.error);

  const authz = authorizeRequest(auth, 'GET');
  if (!authz.authorized) return forbiddenResponse(authz.error);

  try {
    const tenant = validateTenantAccess(request, auth.user!);
    const { searchParams } = new URL(request.url);
    const { page, limit } = querySchema.parse(
      Object.fromEntries(searchParams)
    );

    const items = await db.select().from(tabla)
      .where(and(
        eq(tabla.negocioId, tenant.negocioId),
        eq(tabla.activo, true)
      ))
      .limit(limit)
      .offset((page - 1) * limit);

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.success) return unauthorizedResponse(auth.error);

  const authz = authorizeRequest(auth, 'POST');
  if (!authz.authorized) return forbiddenResponse(authz.error);

  try {
    const tenant = validateTenantAccess(request, auth.user!);
    const body = await request.json();

    const validacion = createSchema.safeParse(body);
    if (!validacion.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos',
          details: validacion.error.flatten() },
        { status: 400 }
      );
    }

    const [nuevo] = await db
      .insert(tabla)
      .values({ ...validacion.data, negocioId: tenant.negocioId })
      .returning();

    return NextResponse.json(
      { success: true, data: nuevo },
      { status: 201 }
    );
  } catch (error) {
    return handleServiceError(error);
  }
}

━━━ TEMPLATE RUTA CON [id] ━━━

const paramsSchema = z.object({
  id: z.coerce.number().int().positive('ID inválido'),
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request);
  if (!auth.success) return unauthorizedResponse(auth.error);

  const authz = authorizeRequest(auth, 'GET');
  if (!authz.authorized) return forbiddenResponse(authz.error);

  try {
    const { id } = paramsSchema.parse(params);
    const tenant = validateTenantAccess(request, auth.user!);

    const [registro] = await db.select().from(tabla)
      .where(and(
        eq(tabla.id, id),
        eq(tabla.negocioId, tenant.negocioId),
        eq(tabla.activo, true)
      ))
      .limit(1);

    if (!registro) {
      return NextResponse.json(
        { success: false, error: 'No encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: registro });
  } catch (error) {
    return handleServiceError(error);
  }
}

━━━ VERIFICACIÓN DE ROL ESPECÍFICO ━━━

// Solo Dueño:
if (auth.user?.rol !== 'Dueño') {
  return NextResponse.json(
    { success: false, error: 'Solo el Dueño puede realizar esta acción' },
    { status: 403 }
  );
}

// Solo Dueño o Admin:
const rolesPermitidos = ['Dueño', 'Admin'];
if (!rolesPermitidos.includes(auth.user?.rol ?? '')) {
  return forbiddenResponse('Sin permisos para esta acción');
}

━━━ RESPUESTAS ESTÁNDAR ━━━

Éxito lista:    { success: true, data: [], total?, page?, limit? }
Éxito item:     { success: true, data: {} }
Éxito creación: { success: true, data: {} } → status 201
Error 400:      { success: false, error: 'Datos inválidos', details?: {} }
Error 401:      { success: false, error: 'No autenticado' }
Error 403:      { success: false, error: 'Sin permisos' }
Error 404:      { success: false, error: 'No encontrado' }
Error 409:      { success: false, error: 'Conflicto: descripción' }
Error 500:      { success: false, error: 'Error interno del servidor' }


⸻


═══════════════════════════════════════════════════════════════════════

SK-04: React Query & Custom Hooks

**Agentes:** Frontend | **Prioridad:** CRÍTICA
═══════════════════════════════════════════════════════════════════════


LIBRERÍA: @tanstack/react-query v5
ARCHIVO DE REFERENCIA: src/hooks/use-cuentas-banco.ts

━━━ HOOKS EXISTENTES (NO duplicar, solo importar) ━━━

use-auth.ts:
  useAuth() → { user, isLoading, login, logout }
  user shape: { id, nombre, email, rol, negocioId? }

use-negocios.ts:
  useNegocios()
  useNegocio(id)
  useCreateNegocio()
  useUpdateNegocio()
  useDeleteNegocio()

use-movimientos.ts:
  useMovimientos(filters)
  useMovimiento(id)
  useCreateMovimiento()
  useUpdateMovimiento()
  useDeleteMovimiento()
  useAprobarMovimiento()
  useRechazarMovimiento()
  useReenviarMovimiento()
  useMovimientosPendientes()

use-cuentas-banco.ts:
  useCuentasBanco(params: { negocioId: number | null })
  useCuentaBanco(id: number | null)
  useCreateCuentaBanco()
  useUpdateCuentaBanco()
  useDeleteCuentaBanco()
  useUpdateSaldoReal()

use-categorias.ts:
  useCategorias(params: { negocioId: number | null })
  useCreateCategoria()
  useUpdateCategoria()
  useDeleteCategoria()

use-cotizaciones.ts:
  useCotizaciones(params)
  useCotizacion(id: number | null)
  useCreateCotizacion()
  useUpdateCotizacion()
  useDeleteCotizacion()
  useActualizarEstadoCotizacion()   ← NOMBRE EXACTO

use-usuarios.ts:
  useUsuarios()
  useUsuario(id)
  useCreateUsuario()
  useUpdateUsuario()
  useDeleteUsuario()

━━━ PATRÓN DE HOOK (seguir exactamente) ━━━

'use client';
import { useMutation, useQuery, useQueryClient }
  from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { TipoRespuesta } from '@/types/xxx.types';

// QUERY (lectura):
export function useXxx(params: { negocioId: number | null }) {
  return useQuery({
    queryKey: ['xxx', params.negocioId],
    enabled: typeof params.negocioId === 'number', // NO: !!negocioId
    queryFn: async () => {
      return apiFetch<TipoRespuesta[]>('/api/xxx', {
        negocioId: params.negocioId ?? undefined,
      });
    },
  });
}

// MUTATION (escritura):
export function useCreateXxx() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateXxxInput) => {
      return apiFetch<TipoRespuesta>('/api/xxx', {
        method: 'POST',
        negocioId: payload.negocioId,
        body: payload,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['xxx'] });
    },
  });
}

// MUTATION con ID:
export function useUpdateXxx() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<Input>) => {
      return apiFetch<TipoRespuesta>(`/api/xxx/${id}`, {
        method: 'PATCH',
        body: data,
      });
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['xxx'] });
      await queryClient.invalidateQueries({ queryKey: ['xxx', variables.id] });
    },
  });
}

━━━ FIRMA EXACTA DE apiFetch ━━━

apiFetch<T>(
  url: string,
  options?: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
    negocioId?: number;
    body?: unknown;
  }
): Promise<T>

// El JWT se agrega automáticamente
// X-Negocio-Id se agrega si negocioId está presente
// En 401: intenta refresh automáticamente

━━━ QUERY KEYS CONVENCIÓN ━━━

Lista:   ['recurso', negocioId]
Detalle: ['recurso', id]
Filtros: ['recurso', negocioId, { filtro1, filtro2 }]
Global:  ['recurso'] → invalida todo el recurso

━━━ REGLAS DE HOOKS ━━━

1. SIEMPRE 'use client' al inicio del archivo
2. SIEMPRE enabled: typeof negocioId === 'number'
3. SIEMPRE invalidar queryKey padre en onSuccess
4. NUNCA usar fetch() directamente → siempre apiFetch
5. Un archivo de hook por recurso
6. Exportar cada hook individualmente (no default export)
7. VERIFICAR nombre exacto del hook en el archivo antes de importar


⸻


═══════════════════════════════════════════════════════════════════════

SK-05: RBAC & Multi-Tenant Security

**Agentes:** Backend + Frontend | **Prioridad:** CRÍTICA
═══════════════════════════════════════════════════════════════════════


━━━ SISTEMA DE ROLES ━━━

Dueño:   Acceso total. Sin filtro de negocio. Ve todo el holding.
Admin:   Ve y gestiona los negocios que tiene asignados en usuarioNegocio.
Socio:   Ve todos los movimientos de su negocio asignado.
Externo: Ve SOLO los movimientos donde creadoPor = su propio id.

━━━ MULTI-TENANCY ━━━

- Header X-Negocio-Id en cada request (apiFetch lo agrega automáticamente)
- validateTenantAccess() extrae y valida el negocioId del header
- NUNCA confiar en negocioId del body → siempre del header
- SIEMPRE filtrar por negocioId en queries de BD

Filtro especial para Externo (backend):
  if (auth.user.rol === 'Externo') {
    conditions.push(eq(movimientos.creadoPor, auth.user.id));
  }

━━━ MATRIZ DE ACCESO COMPLETA ━━━

Ruta                          Dueño  Admin  Socio  Externo
/dashboard                    ✅     ✅     ✅     ✅
/movimientos                  ✅     ✅     ✅     ✅(solo propios)
/movimientos/nuevo            ✅     ✅     ✅     ✅
/movimientos/aprobacion       ✅     ✅     ❌→/movimientos  ❌→/movimientos
/movimientos/:id              ✅     ✅     ✅     ✅(solo propios)
/configuracion/cuentas-banco  ✅     ✅     ✅     ❌→/movimientos
/configuracion/categorias     ✅     ✅     ✅(R)  ❌→/movimientos
/configuracion/arqueo         ✅     ✅     ❌→/movimientos  ❌→/movimientos
/cotizaciones                 ✅     ✅     ✅     ✅
/consolidado                  ✅     ❌→/dashboard  ❌→/dashboard  ❌→/dashboard
/usuarios                     ✅     ✅     ❌→/dashboard  ❌→/dashboard
/negocios                     ✅     ✅     ❌→/dashboard  ❌→/dashboard

━━━ PATRÓN FRONTEND ━━━

const { user } = useAuth();

// Verificaciones de rol:
const esDueño    = user?.rol === 'Dueño';
const esAdmin    = user?.rol === 'Admin';
const puedeGestionar = esDueño || esAdmin;
const puedeEliminar  = esDueño || esAdmin;
const puedeExportar  = esDueño || esAdmin;

// En JSX:
{puedeGestionar && <Button>Acción de gestión</Button>}
{esDueño && <Button>Solo para Dueño</Button>}

// Redirect en página protegida:
useEffect(() => {
  if (user && user.rol !== 'Dueño') {
    router.push('/dashboard');
  }
}, [user, router]);

━━━ PATRÓN BACKEND ━━━

// Solo Dueño:
if (auth.user?.rol !== 'Dueño') {
  return NextResponse.json(
    { success: false, error: 'Solo el Dueño puede realizar esta acción' },
    { status: 403 }
  );
}

// Dueño o Admin:
const rolesPermitidos = ['Dueño', 'Admin'];
if (!rolesPermitidos.includes(auth.user?.rol ?? '')) {
  return forbiddenResponse('Sin permisos para esta acción');
}


⸻


═══════════════════════════════════════════════════════════════════════

SK-06: TypeScript Strict Enforcer

**Agentes:** Todos | **Prioridad:** ALTA
═══════════════════════════════════════════════════════════════════════


CONFIGURACIÓN: strict: true en tsconfig.json
VERIFICACIÓN: npx tsc --noEmit antes de cada commit

━━━ ERRORES COMUNES Y SOLUCIONES ━━━

1. Object is possibly undefined:
   ❌ const nombre = usuario.nombre.toUpperCase();
   ✅ const nombre = usuario?.nombre?.toUpperCase() ?? '';

2. Decimal de BD es string en runtime:
   ❌ const total = cuenta.saldoInicial + movimiento.monto; // "1000500"
   ✅ const total = parseFloat(cuenta.saldoInicial) + parseFloat(movimiento.monto);

3. Array destructuring con posible undefined:
   ❌ const [registro] = await db.select()...; registro.id; // Error
   ✅ const [registro] = await db.select()...;
      if (!registro) return notFoundResponse();
      registro.id; // TypeScript sabe que existe

4. Tipos de respuesta de apiFetch:
   ❌ const data = await apiFetch('/api/movimientos');
   ✅ const data = await apiFetch<MovimientoListItem[]>('/api/movimientos');

5. Props de componentes sin interface:
   ❌ export function MiComp({ negocioId, onSuccess }) {}
   ✅ interface MiCompProps { negocioId: number | null; onSuccess?: () => void; }
      export function MiComp({ negocioId, onSuccess }: MiCompProps) {}

6. Enums sin tipo:
   ❌ const tipo = 'INGRESO';
   ✅ const tipo: TipoMovimiento = 'INGRESO';
      import type { TipoMovimiento } from '@/types/movimiento.types';

━━━ IMPORTS CORRECTOS ━━━

// Tipos puros → import type:
import type { MovimientoListItem } from '@/types/movimiento.types';
import type { CuentaBanco } from '@/types/cuenta_banco.types';

// Valores → import normal:
import { formatCurrencyMXN, parseMoney } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

━━━ VERIFICACIÓN ANTES DE COMMIT ━━━

npx tsc --noEmit    → verificar tipos sin compilar
npm run build       → verificar build completo de Next.js
npm run lint        → verificar reglas de ESLint


⸻


═══════════════════════════════════════════════════════════════════════

SK-07: Windows PowerShell Validator

**Agentes:** Todos | **Prioridad:** ALTA
═══════════════════════════════════════════════════════════════════════


ENTORNO: Windows + PowerShell (no bash, no sh, no cmd)
NOTA: Los paréntesis () y corchetes [] en rutas necesitan escape con \

━━━ COMANDOS DE VERIFICACIÓN DE ARCHIVOS ━━━

# Leer archivo (rutas con caracteres especiales):
Get-Content src/app/\(dashboard\)/cotizaciones/\[id\]/page.tsx
Get-Content src/app/\(dashboard\)/movimientos/\[id\]/page.tsx

# Verificar si archivo existe (ANTES de modificar):
Test-Path src/components/cotizaciones/cotizacion-detalle.tsx

# Listar archivos de una carpeta:
Get-ChildItem src/components/cotizaciones/
Get-ChildItem -Recurse src/hooks/

# Buscar texto en archivos TypeScript:
Get-ChildItem -Recurse -Include "*.ts","*.tsx" -Path src |
  Select-String -Pattern "useActualizarEstado"

# Buscar exports de hooks:
Get-ChildItem -Recurse -Filter "*.ts" -Path src/hooks |
  Select-String -Pattern "^export function use"

━━━ VERIFICACIÓN DE ENCODING UTF-8 BOM ━━━

# Verificar BOM de un archivo (debe mostrar: EF BB BF):
Get-Content src/components/nuevo.tsx -Encoding Byte -TotalCount 3 |
  ForEach-Object { '{0:X2}' -f $_ }

# Verificar múltiples archivos:
Get-ChildItem -Recurse -Filter "*.tsx" -Path src/components/nuevo-modulo |
  ForEach-Object {
    $bytes = Get-Content $_.FullName -Encoding Byte -TotalCount 3
    "$($_.Name): $($bytes | ForEach-Object { '{0:X2}' -f $_ })"
  }

━━━ BARRIDO MOJIBAKE (OBLIGATORIO antes de cada commit) ━━━

# Detectar caracteres corruptos en .tsx:
Get-ChildItem -Recurse -Filter "*.tsx" -Path src |
  Select-String -Pattern 'DueÃ±o|Ã±|Ã³|Ã¡|Ã©|Ã­|Ãº' |
  Select-Object Path, LineNumber, Line

# Detectar en .ts también:
Get-ChildItem -Recurse -Filter "*.ts" -Path src |
  Select-String -Pattern 'DueÃ±o|Ã±|Ã³|Ã¡|Ã©|Ã­|Ãº' |
  Select-Object Path, LineNumber, Line

# Resultado esperado: SIN resultados (pantalla vacía)

━━━ COMANDOS DE BUILD Y TEST ━━━

npm run build          → build de producción (sin errores = OK)
npm run dev            → servidor de desarrollo local
npm test               → ejecutar todos los tests con Vitest
npm run test:watch     → tests en modo watch
npm run lint           → verificar ESLint
npx tsc --noEmit       → verificar tipos TypeScript

━━━ COMANDOS DE BASE DE DATOS ━━━

npm run db:generate    → generar migración Drizzle
npm run db:migrate     → aplicar migración pendiente
npm run db:studio      → abrir Drizzle Studio en navegador

━━━ COMANDOS GIT ━━━

git branch                           → ver branch actual
git status                           → ver archivos modificados
git diff src/archivo.tsx             → ver cambios en archivo
git add .                            → agregar todos los cambios
git add src/ruta/archivo.tsx         → agregar archivo específico
git commit -m "feat(1.4.A): mensaje" → commit con convención
git push origin sprint-1.4           → push al branch del sprint
git log --oneline -5                 → últimos 5 commits
git stash                            → guardar cambios temporalmente
git stash pop                        → recuperar cambios guardados


⸻


═══════════════════════════════════════════════════════════════════════

SK-08: Zod Validation Patterns

**Agentes:** Backend + Frontend | **Prioridad:** ALTA
═══════════════════════════════════════════════════════════════════════


LIBRERÍA: zod (ya instalada en el proyecto)
USO: Validación en API routes (backend) y formularios (frontend)

━━━ ZOD EN API ROUTES ━━━

import { z } from 'zod';

// Query params:
const querySchema = z.object({
  page:       z.coerce.number().int().positive().default(1),
  limit:      z.coerce.number().int().positive().max(100).default(20),
  estado:     z.enum(['PENDIENTE', 'APROBADO', 'RECHAZADO']).optional(),
  fechaDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fechaHasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  negocioId:  z.coerce.number().int().positive().optional(),
});

// Body POST/PATCH:
const createSchema = z.object({
  tipo:         z.enum(['INGRESO', 'EGRESO', 'TRASPASO_SALIDA', 'TRASPASO_ENTRADA']),
  fecha:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  concepto:     z.string().min(1, 'El concepto es requerido').max(255),
  monto:        z.number().positive('El monto debe ser mayor a 0'),
  cuentaBancoId: z.number().int().positive(),
  categoriaId:  z.number().int().positive().optional(),
  tercero:      z.string().max(100).optional(),
});

// Params [id]:
const paramsSchema = z.object({
  id: z.coerce.number().int().positive('ID inválido'),
});

// Uso con safeParse (NO .parse() en routes → no lanza excepción):
const validacion = createSchema.safeParse(body);
if (!validacion.success) {
  return NextResponse.json(
    { success: false, error: 'Datos inválidos',
      details: validacion.error.flatten() },
    { status: 400 }
  );
}
const data = validacion.data; // Tipado automáticamente

━━━ ZOD EN FORMULARIOS (React Hook Form) ━━━

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const formSchema = z.object({
  concepto:     z.string().min(1, 'El concepto es requerido'),
  monto:        z.coerce.number().positive('El monto debe ser mayor a 0'),
  fecha:        z.string().min(1, 'La fecha es requerida'),
  cuentaBancoId: z.coerce.number().int().positive('Selecciona una cuenta'),
  categoriaId:  z.coerce.number().int().positive().optional(),
  notas:        z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const form = useForm<FormValues>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    concepto: '',
    monto: 0,
    fecha: new Date().toISOString().split('T')[0], // Hoy por defecto
    cuentaBancoId: 0,
  },
});

// Reset al cambiar negocioId (limpiar campos dependientes):
useEffect(() => {
  form.reset({ ...form.getValues(), cuentaBancoId: 0, categoriaId: undefined });
}, [negocioId]);

// Submit (limpiar strings vacíos antes de enviar):
const onSubmit = async (values: FormValues) => {
  const payload = {
    ...values,
    notas: values.notas || undefined,
    categoriaId: values.categoriaId || undefined,
  };
  await createMutation.mutateAsync(payload);
};

━━━ PATRONES COMUNES ━━━

// Número que viene como string del form:
monto: z.coerce.number().positive()

// Campo opcional que puede ser string vacío:
campo: z.string().optional().transform(v => v || undefined)

// Fecha YYYY-MM-DD:
fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

// ID nullable:
negocioId: z.number().int().positive().nullable()

// Enum de la BD:
tipo: z.enum(['INGRESO', 'EGRESO', 'TRASPASO_SALIDA', 'TRASPASO_ENTRADA'])


⸻


═══════════════════════════════════════════════════════════════════════

SK-09: Financial Calculations

**Agentes:** Backend | **Prioridad:** ALTA
═══════════════════════════════════════════════════════════════════════


REGLA FUNDAMENTAL:
Los montos en PostgreSQL son tipo NUMERIC.
Drizzle los retorna como STRING en JavaScript.
SIEMPRE usar parseFloat() para operar. NUNCA parseInt().

━━━ FÓRMULA DE SALDO CALCULADO ━━━

saldoCalculado =
  parseFloat(cuenta.saldoInicial)
  + SUM(parseFloat(m.monto) WHERE m.tipo = 'INGRESO'          AND m.estado = 'APROBADO')
  + SUM(parseFloat(m.monto) WHERE m.tipo = 'TRASPASO_ENTRADA' AND m.estado = 'APROBADO')
  - SUM(parseFloat(m.monto) WHERE m.tipo = 'EGRESO'           AND m.estado = 'APROBADO')
  - SUM(parseFloat(m.monto) WHERE m.tipo = 'TRASPASO_SALIDA'  AND m.estado = 'APROBADO')

CRÍTICO: Solo movimientos con estado = 'APROBADO' afectan el saldo.
PENDIENTE y RECHAZADO NO afectan el saldo.

━━━ IMPLEMENTACIÓN CORRECTA ━━━

function calcularSaldo(
  saldoInicial: string,
  movs: { tipo: TipoMovimiento; monto: string; estado: EstadoMovimiento }[]
): number {
  const aprobados = movs.filter(m => m.estado === 'APROBADO');

  const entradas = aprobados
    .filter(m => m.tipo === 'INGRESO' || m.tipo === 'TRASPASO_ENTRADA')
    .reduce((sum, m) => sum + parseFloat(m.monto), 0);

  const salidas = aprobados
    .filter(m => m.tipo === 'EGRESO' || m.tipo === 'TRASPASO_SALIDA')
    .reduce((sum, m) => sum + parseFloat(m.monto), 0);

  return parseFloat(saldoInicial) + entradas - salidas;
}

━━━ ESTADO DE ARQUEO ━━━

function determinarEstadoArqueo(
  saldoCalculado: number,
  saldoReal: string | null
): 'CUADRADO' | 'SOBRANTE' | 'FALTANTE' | 'SIN_SALDO_REAL' {
  if (saldoReal === null) return 'SIN_SALDO_REAL';
  const diferencia = parseFloat(saldoReal) - saldoCalculado;
  const tolerancia = 0.01;
  if (Math.abs(diferencia) <= tolerancia) return 'CUADRADO';
  return diferencia > 0 ? 'SOBRANTE' : 'FALTANTE';
}

━━━ TRASPASOS (movimientos espejo) ━━━

Al crear un traspaso se crean DOS movimientos en una transacción:
  1. TRASPASO_SALIDA  → negocio/cuenta ORIGEN
  2. TRASPASO_ENTRADA → negocio/cuenta DESTINO
Ambos tienen traspasoRefId apuntando al otro.
SIEMPRE usar db.transaction() para esto.

━━━ ACUMULACIÓN CORRECTA ━━━

❌ Incorrecto (concatena strings):
  cuentas.reduce((sum, c) => sum + c.saldoInicial, 0)

✅ Correcto:
  cuentas.reduce((sum, c) => sum + parseFloat(c.saldoInicial), 0)

━━━ FORMATO DE MONTOS ━━━

Para mostrar en UI:
  import { formatCurrencyMXN } from '@/lib/utils';
  formatCurrencyMXN(1234.56) → "$1,234.56"

Para guardar en BD:
  monto: valor.toString()  // Drizzle acepta string para NUMERIC


⸻


═══════════════════════════════════════════════════════════════════════

SK-10: shadcn/ui Component Library

**Agentes:** Frontend | **Prioridad:** ALTA
═══════════════════════════════════════════════════════════════════════


COMPONENTES DISPONIBLES EN src/components/ui/:
  alert-dialog, badge, button, card, collapsible,
  dialog, form, input, label, select, sheet,
  table, textarea, toast, use-toast

━━━ SISTEMA DE NOTIFICACIONES (CRÍTICO) ━━━

✅ CORRECTO:
  import { useToast } from '@/components/ui/use-toast';
  const { toast } = useToast();
  toast({ title: 'Éxito', description: 'Operación completada' });
  toast({ title: 'Error', description: 'Algo salió mal', variant: 'destructive' });

❌ INCORRECTO (no existe en el proyecto):
  import { toast } from 'sonner';
  import toast from 'react-hot-toast';

━━━ PATRÓN DE TABLA ━━━

// Estados obligatorios en este orden:
// 1. Sin negocio → "Selecciona un negocio"
// 2. Loading → skeleton/spinner
// 3. Error → mensaje + retry
// 4. Vacío → "No hay registros"
// 5. Con datos → tabla + paginación

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Columna</TableHead>
      <TableHead className="text-right">Monto</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map((item) => (
      <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50">
        <TableCell>{item.nombre}</TableCell>
        <TableCell className="text-right font-medium">
          {formatCurrencyMXN(item.monto)}
        </TableCell>
      </TableRow>
    ))}
    {items.length === 0 && (
      <TableRow>
        <TableCell colSpan={N} className="text-center text-muted-foreground py-8">
          No hay registros
        </TableCell>
      </TableRow>
    )}
  </TableBody>
</Table>

━━━ PATRÓN ALERT DIALOG (confirmación destructiva) ━━━

<AlertDialog open={open} onOpenChange={setOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
      <AlertDialogDescription>
        Esta acción no se puede deshacer.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleConfirm}
        disabled={isPending}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {isPending ? 'Procesando...' : 'Confirmar'}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

━━━ PATRÓN BADGE DE ESTADO ━━━

const ESTADO_STYLES: Record<string, string> = {
  PENDIENTE:  'bg-yellow-100 text-yellow-800 border-yellow-200',
  APROBADO:   'bg-green-100 text-green-800 border-green-200',
  RECHAZADO:  'bg-red-100 text-red-800 border-red-200',
  CANCELADA:  'bg-gray-100 text-gray-800 border-gray-200',
  FACTURADA:  'bg-blue-100 text-blue-800 border-blue-200',
  BORRADOR:   'bg-slate-100 text-slate-800 border-slate-200',
  ENVIADA:    'bg-purple-100 text-purple-800 border-purple-200',
};
<Badge className={ESTADO_STYLES[estado] ?? ''}>{estado}</Badge>

━━━ PAGINACIÓN ESTÁNDAR ━━━

<div className="flex items-center justify-between mt-4">
  <span className="text-sm text-muted-foreground">
    Página {page} de {Math.ceil(total / limit)}
  </span>
  <div className="flex gap-2">
    <Button variant="outline" size="sm"
      onClick={() => setPage(p => p - 1)} disabled={page === 1}>
      Anterior
    </Button>
    <Button variant="outline" size="sm"
      onClick={() => setPage(p => p + 1)}
      disabled={page >= Math.ceil(total / limit)}>
      Siguiente
    </Button>
  </div>
</div>


⸻


═══════════════════════════════════════════════════════════════════════

SK-11: Vitest Testing Patterns

**Agentes:** QA | **Prioridad:** ALTA
═══════════════════════════════════════════════════════════════════════


FRAMEWORK: Vitest
CONFIG: vitest.config.ts en la raíz del proyecto
SCRIPTS: npm test | npm run test:watch

━━━ ESTRUCTURA DE TESTS ━━━

tests/
├── setup.ts              → configuración global, mocks
├── helpers/
│   ├── db-helpers.ts     → crear datos de prueba
│   └── auth-helpers.ts   → generar tokens por rol
├── unit/                 → tests de funciones puras
└── integration/          → tests de API routes

━━━ TEMPLATE DE TEST DE API ROUTE ━━━

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('PATCH /api/cotizaciones/:id/estado', () => {
  let tokenDuenio: string;
  let tokenAdmin: string;
  let tokenSocio: string;
  let tokenExterno: string;
  let cotizacionId: number;

  beforeEach(async () => {
    // Setup: crear datos de prueba
    tokenDuenio  = await getTokenForRole('Dueño');
    tokenAdmin   = await getTokenForRole('Admin');
    tokenSocio   = await getTokenForRole('Socio');
    tokenExterno = await getTokenForRole('Externo');
    cotizacionId = await createTestCotizacion({ estado: 'BORRADOR' });
  });

  afterEach(async () => {
    await cleanupTest();
  });

  it('Dueño puede cancelar cotización en BORRADOR', async () => {
    const res = await fetch(`/api/cotizaciones/${cotizacionId}/estado`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${tokenDuenio}`,
                 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'CANCELADA' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.estado).toBe('CANCELADA');
  });

  it('Sin token retorna 401', async () => {
    const res = await fetch(`/api/cotizaciones/${cotizacionId}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: 'CANCELADA' }),
    });
    expect(res.status).toBe(401);
  });

  it('Socio no puede cancelar → 403', async () => {
    const res = await fetch(`/api/cotizaciones/${cotizacionId}/estado`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${tokenSocio}` },
      body: JSON.stringify({ estado: 'CANCELADA' }),
    });
    expect(res.status).toBe(403);
  });
});

━━━ CASOS EDGE OBLIGATORIOS EN CADA TEST ━━━

1. Sin token → 401
2. Token inválido → 401
3. Rol sin permiso → 403
4. Recurso no encontrado → 404
5. Datos inválidos → 400
6. Operación exitosa → 200/201