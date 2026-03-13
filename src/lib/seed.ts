import 'dotenv/config';
import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/lib/db';
import { categorias, centrosCosto, negocios, roles, rolesIniciales, usuarioNegocio, usuarios } from '@/lib/drizzle';
import { hashPassword } from '@/services/auth.service';

type RolNombre = 'Dueño' | 'Socio' | 'Admin' | 'Externo';

function log(message: string) {
  process.stdout.write(`${message}\n`);
}

function logError(message: string) {
  process.stderr.write(`${message}\n`);
}

const negociosData: Array<{
  id: number;
  nombre: string;
  rubro: string;
  modeloIngreso: string;
  tieneSocios: boolean;
  configuracion?: Record<string, unknown>;
}> = [
  { id: 1, nombre: 'Madsa', rubro: 'Construcción', modeloIngreso: 'Proyectos', tieneSocios: true, configuracion: { tieneCentrosCosto: true } },
  { id: 2, nombre: 'Purificadoras', rubro: 'Agua Purificada', modeloIngreso: 'Venta Directa', tieneSocios: true, configuracion: { tieneCentrosCosto: true } },
  { id: 3, nombre: 'Taxis', rubro: 'Transporte', modeloIngreso: 'Servicios', tieneSocios: false, configuracion: { tieneCentrosCosto: true } },
  { id: 4, nombre: 'Food Park', rubro: 'Gastronomía', modeloIngreso: 'Alquiler + Servicios', tieneSocios: true, configuracion: { tieneCentrosCosto: true } },
  { id: 5, nombre: 'Inmobiliaria', rubro: 'Bienes Raíces', modeloIngreso: 'Alquiler', tieneSocios: false, configuracion: { tieneCentrosCosto: false } },
  { id: 6, nombre: 'Gym', rubro: 'Fitness', modeloIngreso: 'Membresías', tieneSocios: false, configuracion: { tieneCentrosCosto: false } },
  { id: 7, nombre: 'Ferretería', rubro: 'Construcción', modeloIngreso: 'Venta Directa', tieneSocios: false, configuracion: { tieneCentrosCosto: false } },
  { id: 8, nombre: 'Cafetería', rubro: 'Gastronomía', modeloIngreso: 'Venta Directa', tieneSocios: false, configuracion: { tieneCentrosCosto: false } },
  { id: 9, nombre: 'Lavandería', rubro: 'Servicios', modeloIngreso: 'Servicios', tieneSocios: false, configuracion: { tieneCentrosCosto: false } },
  { id: 10, nombre: 'Gastos Personales', rubro: 'Administrativo', modeloIngreso: 'N/A', tieneSocios: false, configuracion: { especial: true, aislado: true } },
];

const centrosCostoData: Array<{
  nombre: string;
  codigo: string;
  negocioId: number;
}> = [
  { nombre: 'Showroom Principal', codigo: 'MAD-001', negocioId: 1 },
  { nombre: 'Taller', codigo: 'MAD-002', negocioId: 1 },
  { nombre: 'Bodega', codigo: 'MAD-003', negocioId: 1 },
  { nombre: 'Planta Central', codigo: 'PUR-001', negocioId: 2 },
  { nombre: 'Punto de Venta 1', codigo: 'PUR-002', negocioId: 2 },
  { nombre: 'Punto de Venta 2', codigo: 'PUR-003', negocioId: 2 },
  { nombre: 'Taxi 001', codigo: 'TAX-001', negocioId: 3 },
  { nombre: 'Taxi 002', codigo: 'TAX-002', negocioId: 3 },
  { nombre: 'Taxi 003', codigo: 'TAX-003', negocioId: 3 },
  { nombre: 'Local 1', codigo: 'FP-001', negocioId: 4 },
  { nombre: 'Local 2', codigo: 'FP-002', negocioId: 4 },
  { nombre: 'Local 3', codigo: 'FP-003', negocioId: 4 },
  { nombre: 'Área Común', codigo: 'FP-COM', negocioId: 4 },
];

const usuariosPrueba: Array<{
  nombreCompleto: string;
  email: string;
  password: string;
  rolNombre: RolNombre;
  negocios: number[];
}> = [
  {
    nombreCompleto: 'Juan Dueño',
    email: 'dueno@onebusiness.test',
    password: 'test123456',
    rolNombre: 'Dueño',
    negocios: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  },
  {
    nombreCompleto: 'María Socia',
    email: 'socia@onebusiness.test',
    password: 'test123456',
    rolNombre: 'Socio',
    negocios: [1, 2, 4],
  },
  {
    nombreCompleto: 'Carlos Admin',
    email: 'admin@onebusiness.test',
    password: 'test123456',
    rolNombre: 'Admin',
    negocios: [1, 2],
  },
  {
    nombreCompleto: 'Ana Externo',
    email: 'externo@onebusiness.test',
    password: 'test123456',
    rolNombre: 'Externo',
    negocios: [1],
  },
];

async function getRolIdByNombre(nombre: RolNombre): Promise<number> {
  const rolRecord = await db.select({ id: roles.id }).from(roles).where(eq(roles.nombre, nombre)).limit(1);
  if (!rolRecord[0]) {
    throw new Error(`Rol no encontrado: ${nombre}`);
  }
  return rolRecord[0].id;
}

async function getUsuarioIdByEmail(email: string): Promise<number> {
  const userRecord = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, email)).limit(1);
  if (!userRecord[0]) {
    throw new Error(`Usuario no encontrado: ${email}`);
  }
  return userRecord[0].id;
}

async function main() {
  log('Iniciando seed de datos...\n');

  log('Insertando roles...');
  for (const rol of rolesIniciales) {
    await db.insert(roles).values(rol).onConflictDoNothing();
  }
  log('Roles OK\n');

  log('Insertando negocios...');
  for (const negocio of negociosData) {
    await db.insert(negocios).values(negocio).onConflictDoNothing();
  }
  log('Negocios OK\n');

  const negocioRows = await db.select({ id: negocios.id, nombre: negocios.nombre }).from(negocios);
  const negocioIdByNombre = new Map<string, number>(negocioRows.map((row) => [row.nombre, row.id]));

  log('Insertando categorías globales...');
  const categoriasGlobales: Array<{ nombre: string; tipo: 'INGRESO' | 'EGRESO'; negocioId: null }> = [
    { nombre: 'Ventas', tipo: 'INGRESO', negocioId: null },
    { nombre: 'Servicios Prestados', tipo: 'INGRESO', negocioId: null },
    { nombre: 'Otros Ingresos', tipo: 'INGRESO', negocioId: null },
    { nombre: 'Nómina y Sueldos', tipo: 'EGRESO', negocioId: null },
    { nombre: 'Renta', tipo: 'EGRESO', negocioId: null },
    { nombre: 'Servicios Básicos', tipo: 'EGRESO', negocioId: null },
    { nombre: 'Mantenimiento', tipo: 'EGRESO', negocioId: null },
    { nombre: 'Impuestos y Contribuciones', tipo: 'EGRESO', negocioId: null },
    { nombre: 'Compras e Inventario', tipo: 'EGRESO', negocioId: null },
    { nombre: 'Otros Gastos', tipo: 'EGRESO', negocioId: null },
  ];

  const existingGlobal = await db
    .select({ nombre: categorias.nombre, tipo: categorias.tipo })
    .from(categorias)
    .where(isNull(categorias.negocioId));
  const existingGlobalKeys = new Set(existingGlobal.map((row) => `${row.tipo}::${row.nombre}`));
  const missingGlobal = categoriasGlobales.filter((row) => !existingGlobalKeys.has(`${row.tipo}::${row.nombre}`));

  if (missingGlobal.length > 0) {
    await db.insert(categorias).values(missingGlobal).onConflictDoNothing();
  }
  log('Categorías globales OK\n');

  log('Insertando categorías específicas por negocio...');
  const categoriasEspecificasPorNegocio: Array<{ negocioNombre: string; rows: Array<{ nombre: string; tipo: 'INGRESO' | 'EGRESO' }> }> = [
    { negocioNombre: 'Madsa', rows: [{ nombre: 'Renta de Equipos', tipo: 'INGRESO' }, { nombre: 'Gastos de Obra', tipo: 'EGRESO' }] },
    { negocioNombre: 'Purificadoras', rows: [{ nombre: 'Venta de Agua', tipo: 'INGRESO' }, { nombre: 'Insumos de Limpieza', tipo: 'EGRESO' }] },
    { negocioNombre: 'Taxis', rows: [{ nombre: 'Rentas', tipo: 'INGRESO' }, { nombre: 'Gasolina', tipo: 'EGRESO' }] },
    { negocioNombre: 'Food Park', rows: [{ nombre: 'Renta de Locales', tipo: 'INGRESO' }, { nombre: 'Eventos y Promoción', tipo: 'EGRESO' }] },
    { negocioNombre: 'Inmobiliaria', rows: [{ nombre: 'Rentas de Propiedad', tipo: 'INGRESO' }, { nombre: 'Reparaciones', tipo: 'EGRESO' }] },
    { negocioNombre: 'Gym', rows: [{ nombre: 'Membresías', tipo: 'INGRESO' }, { nombre: 'Equipo y Accesorios', tipo: 'EGRESO' }] },
    { negocioNombre: 'Ferretería', rows: [{ nombre: 'Ventas Mostrador', tipo: 'INGRESO' }, { nombre: 'Compra de Mercancía', tipo: 'EGRESO' }] },
    { negocioNombre: 'Cafetería', rows: [{ nombre: 'Bebidas y Alimentos', tipo: 'INGRESO' }, { nombre: 'Insumos', tipo: 'EGRESO' }] },
    { negocioNombre: 'Lavandería', rows: [{ nombre: 'Servicios de Lavado', tipo: 'INGRESO' }, { nombre: 'Detergentes y Químicos', tipo: 'EGRESO' }] },
  ];

  const categoriasEspecificas = categoriasEspecificasPorNegocio.flatMap((entry) => {
    const negocioId = negocioIdByNombre.get(entry.negocioNombre);
    if (!negocioId) return [];
    return entry.rows.map((row) => ({ ...row, negocioId }));
  });

  if (categoriasEspecificas.length > 0) {
    await db.insert(categorias).values(categoriasEspecificas).onConflictDoNothing();
  }
  log('Categorías específicas OK\n');

  log('Insertando centros de costo...');
  for (const centro of centrosCostoData) {
    const exists = await db
      .select({ id: centrosCosto.id })
      .from(centrosCosto)
      .where(and(eq(centrosCosto.negocioId, centro.negocioId), eq(centrosCosto.codigo, centro.codigo)))
      .limit(1);

    if (!exists[0]) {
      await db.insert(centrosCosto).values(centro);
    }
  }
  log('Centros de costo OK\n');

  log('Insertando usuarios de prueba...');
  for (const usuario of usuariosPrueba) {
    const rolId = await getRolIdByNombre(usuario.rolNombre);
    const passwordHash = await hashPassword(usuario.password);

    await db
      .insert(usuarios)
      .values({
        nombreCompleto: usuario.nombreCompleto,
        email: usuario.email,
        passwordHash,
        rolId,
      })
      .onConflictDoNothing();
  }
  log('Usuarios OK\n');

  log('Asignando negocios a usuarios...');
  for (const asignacion of usuariosPrueba) {
    const usuarioId = await getUsuarioIdByEmail(asignacion.email);

    for (const negocioId of asignacion.negocios) {
      const exists = await db
        .select({ id: usuarioNegocio.id })
        .from(usuarioNegocio)
        .where(and(eq(usuarioNegocio.usuarioId, usuarioId), eq(usuarioNegocio.negocioId, negocioId)))
        .limit(1);

      if (!exists[0]) {
        await db.insert(usuarioNegocio).values({ usuarioId, negocioId });
      }
    }
  }
  log('Asignaciones OK\n');

  log('Seed completado exitosamente.\n');
  log('CREDENCIALES DE PRUEBA:');
  log('Dueño:   dueno@onebusiness.test / test123456');
  log('Socio:   socia@onebusiness.test / test123456');
  log('Admin:   admin@onebusiness.test / test123456');
  log('Externo: externo@onebusiness.test / test123456');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    if (error instanceof Error) {
      logError(`Error en seed: ${error.message}`);
      const cause = (error as { cause?: unknown }).cause;
      if (cause) {
        logError(`Cause: ${String(cause)}`);
      }
    } else {
      logError(`Error en seed: ${String(error)}`);
    }
    process.exit(1);
  });
