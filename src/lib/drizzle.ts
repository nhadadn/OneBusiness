import { pgTable, serial, varchar, boolean, timestamp, jsonb, integer, pgEnum, index, uniqueIndex, numeric, date, text, foreignKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==========================================
// NEGOCIOS
// ==========================================
export const negocios = pgTable('negocios', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  rubro: varchar('rubro', { length: 100 }),
  modeloIngreso: varchar('modelo_ingreso', { length: 100 }),
  tieneSocios: boolean('tiene_socios').default(false),
  activo: boolean('activo').default(true),
  umbralAlerta: numeric('umbral_alerta', { precision: 12, scale: 2 }),
  umbralCritico: numeric('umbral_critico', { precision: 12, scale: 2 }),
  configuracion: jsonb('configuracion'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  rfc: varchar('rfc', { length: 20 }),
  direccion: text('direccion'),
  telefono: varchar('telefono', { length: 30 }),
});

export const negociosRelations = relations(negocios, ({ many }) => ({
  centrosCosto: many(centrosCosto),
  categorias: many(categorias),
  usuarios: many(usuarioNegocio),
}));

// ==========================================
// CENTROS DE COSTO
// ==========================================
export const centrosCosto = pgTable('centros_costo', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  codigo: varchar('codigo', { length: 50 }),
  negocioId: integer('negocio_id').notNull().references(() => negocios.id),
  activo: boolean('activo').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    negocioIdIdx: index('idx_centros_costo_negocio_id').on(table.negocioId),
  };
});

export const centrosCostoRelations = relations(centrosCosto, ({ one }) => ({
  negocio: one(negocios, {
    fields: [centrosCosto.negocioId],
    references: [negocios.id],
  }),
}));

// ==========================================
// ROLES
// ==========================================
export const rolEnum = pgEnum('rol_nombre', ['Dueño', 'Socio', 'Admin', 'Externo']);

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  nombre: rolEnum('nombre').notNull().unique(),
  descripcion: varchar('descripcion', { length: 500 }),
  permisos: jsonb('permisos').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Datos iniciales de roles
export const rolesIniciales = [
  { nombre: 'Dueño' as const, descripcion: 'Acceso total al sistema', permisos: { all: true } },
  { nombre: 'Socio' as const, descripcion: 'Acceso a su(s) negocio(s)', permisos: { read: true, export: true } },
  { nombre: 'Admin' as const, descripcion: 'Gestión operativa', permisos: { read: true, write: true, delete: true } },
  { nombre: 'Externo' as const, descripcion: 'Solo lectura', permisos: { read: true } },
];

// ==========================================
// USUARIOS
// ==========================================
export const usuarios = pgTable('usuarios', {
  id: serial('id').primaryKey(),
  nombreCompleto: varchar('nombre_completo', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  rolId: integer('rol_id').notNull().references(() => roles.id),
  tokenVersion: integer('token_version').default(0).notNull(),
  activo: boolean('activo').default(true),
  fechaUltimoAcceso: timestamp('fecha_ultimo_acceso'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  refreshTokenHash: varchar('refresh_token_hash', { length: 64 }),
});

export const usuariosRelations = relations(usuarios, ({ one, many }) => ({
  rol: one(roles, {
    fields: [usuarios.rolId],
    references: [roles.id],
  }),
  negocios: many(usuarioNegocio),
}));

// ==========================================
// USUARIO_NEGOCIO (N:M)
// ==========================================
export const usuarioNegocio = pgTable('usuario_negocio', {
  id: serial('id').primaryKey(),
  usuarioId: integer('usuario_id').notNull().references(() => usuarios.id),
  negocioId: integer('negocio_id').notNull().references(() => negocios.id),
  permisosEspecificos: jsonb('permisos_especificos'),
  fechaAsignacion: timestamp('fecha_asignacion').defaultNow(),
}, (table) => {
  return {
    usuarioIdIdx: index('idx_usuario_negocio_usuario_id').on(table.usuarioId),
    negocioIdIdx: index('idx_usuario_negocio_negocio_id').on(table.negocioId),
  };
});

export const usuarioNegocioRelations = relations(usuarioNegocio, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [usuarioNegocio.usuarioId],
    references: [usuarios.id],
  }),
  negocio: one(negocios, {
    fields: [usuarioNegocio.negocioId],
    references: [negocios.id],
  }),
}));

export const tipoCuentaEnum = pgEnum('tipo_cuenta', ['EFECTIVO', 'BANCARIA', 'CAJA_CHICA']);
export const tipoMovimientoEnum = pgEnum('tipo_movimiento', ['INGRESO', 'EGRESO', 'TRASPASO_SALIDA', 'TRASPASO_ENTRADA']);
export const estadoMovimientoEnum = pgEnum('estado_movimiento', ['PENDIENTE', 'APROBADO', 'RECHAZADO']);
export const tipoCategoriaEnum = pgEnum('tipo_categoria', ['INGRESO', 'EGRESO']);
export const estadoCotizacionEnum = pgEnum('estado_cotizacion', ['BORRADOR', 'ENVIADA', 'APROBADA', 'FACTURADA', 'CANCELADA']);

export const categorias = pgTable('categorias', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  tipo: tipoCategoriaEnum('tipo').notNull(),
  negocioId: integer('negocio_id').references(() => negocios.id, { onDelete: 'cascade' }),
  activa: boolean('activa').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    negocioIdIdx: index('idx_categorias_negocio_id').on(table.negocioId),
    tipoIdx: index('idx_categorias_tipo').on(table.tipo),
    activaIdx: index('idx_categorias_activa').on(table.activa),
    nombreNegocioUq: uniqueIndex('uq_categorias_nombre_negocio').on(table.nombre, table.negocioId),
  };
});

export const cuentasBanco = pgTable('cuentas_banco', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  tipo: tipoCuentaEnum('tipo').notNull(),
  bancoInstitucion: varchar('banco_institucion', { length: 50 }),
  titular: varchar('titular', { length: 100 }),
  negocioId: integer('negocio_id').references(() => negocios.id),
  esGlobal: boolean('es_global').notNull().default(false),
  saldoInicial: numeric('saldo_inicial', { precision: 15, scale: 2 }).notNull().default('0'),
  saldoReal: numeric('saldo_real', { precision: 15, scale: 2 }),
  fechaSaldoReal: timestamp('fecha_saldo_real'),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    negocioIdIdx: index('idx_cuentas_banco_negocio_id').on(table.negocioId),
    tipoIdx: index('idx_cuentas_banco_tipo').on(table.tipo),
    activoIdx: index('idx_cuentas_banco_activo').on(table.activo),
  };
});

export const cuentaNegocio = pgTable('cuenta_negocio', {
  id: serial('id').primaryKey(),
  cuentaId: integer('cuenta_id').notNull().references(() => cuentasBanco.id, { onDelete: 'cascade' }),
  negocioId: integer('negocio_id').notNull().references(() => negocios.id, { onDelete: 'cascade' }),
  fechaAsignacion: timestamp('fecha_asignacion').defaultNow(),
}, (table) => {
  return {
    cuentaIdx: index('idx_cuenta_negocio_cuenta').on(table.cuentaId),
    negocioIdx: index('idx_cuenta_negocio_negocio').on(table.negocioId),
    uniqueCuentaNegocio: uniqueIndex('uq_cuenta_negocio').on(table.cuentaId, table.negocioId),
  };
});

export const movimientos = pgTable('movimientos', {
  id: serial('id').primaryKey(),
  negocioId: integer('negocio_id').notNull().references(() => negocios.id),
  centroCostoId: integer('centro_costo_id').references(() => centrosCosto.id),
  tipo: tipoMovimientoEnum('tipo').notNull(),
  fecha: date('fecha').notNull(),
  concepto: text('concepto').notNull(),
  tercero: varchar('tercero', { length: 150 }),
  monto: numeric('monto', { precision: 15, scale: 2 }).notNull(),
  cuentaBancoId: integer('cuenta_banco_id').notNull().references(() => cuentasBanco.id),
  traspasoRefId: integer('traspaso_id'),
  estado: estadoMovimientoEnum('estado').notNull().default('PENDIENTE'),
  creadoPor: integer('creado_por').notNull().references(() => usuarios.id),
  aprobadoPor: integer('aprobado_por').references(() => usuarios.id),
  fechaAprobacion: timestamp('fecha_aprobacion'),
  motivoRechazo: text('motivo_rechazo'),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  activo: boolean('activo').notNull().default(true),
}, (table) => {
  return {
    negocioIdIdx: index('idx_movimientos_negocio_id').on(table.negocioId),
    fechaIdx: index('idx_movimientos_fecha').on(table.fecha),
    tipoIdx: index('idx_movimientos_tipo').on(table.tipo),
    estadoIdx: index('idx_movimientos_estado').on(table.estado),
    cuentaBancoIdx: index('idx_movimientos_cuenta_banco').on(table.cuentaBancoId),
    creadoPorIdx: index('idx_movimientos_creado_por').on(table.creadoPor),
    aprobadoPorIdx: index('idx_movimientos_aprobado_por').on(table.aprobadoPor),
    traspasoRefIdx: index('idx_movimientos_traspaso_id').on(table.traspasoRefId),
    traspasoRefFk: foreignKey({
      columns: [table.traspasoRefId],
      foreignColumns: [table.id],
    }),
  };
});

export const cotizaciones = pgTable('cotizaciones', {
  id: serial('id').primaryKey(),
  negocioId: integer('negocio_id').notNull().references(() => negocios.id),
  folio: varchar('folio', { length: 20 }).notNull(),
  folioExterno: varchar('folio_externo', { length: 30 }),
  clienteNombre: varchar('cliente_nombre', { length: 255 }).notNull(),
  clienteRfc: varchar('cliente_rfc', { length: 20 }),
  clienteDireccion: text('cliente_direccion'),
  fecha: date('fecha').notNull(),
  estado: estadoCotizacionEnum('estado').notNull().default('BORRADOR'),
  numeroOc: varchar('numero_oc', { length: 50 }),
  numeroFactura: varchar('numero_factura', { length: 50 }),
  cuentaBancoId: integer('cuenta_banco_id').references(() => cuentasBanco.id),
  categoriaId: integer('categoria_id').references(() => categorias.id),
  fechaAprobacion: timestamp('fecha_aprobacion'),
  fechaFacturacion: timestamp('fecha_facturacion'),
  movimientoId: integer('movimiento_id').references(() => movimientos.id),
  subtotal: numeric('subtotal', { precision: 15, scale: 2 }).notNull().default('0'),
  iva: numeric('iva', { precision: 15, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 15, scale: 2 }).notNull().default('0'),
  notas: text('notas'),
  creadoPor: integer('creado_por').notNull().references(() => usuarios.id),
  aprobadoPor: integer('aprobado_por').references(() => usuarios.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    folioUq: uniqueIndex('uq_cotizaciones_folio').on(table.folio),
    negocioIdIdx: index('idx_cotizaciones_negocio_id').on(table.negocioId),
    estadoIdx: index('idx_cotizaciones_estado').on(table.estado),
    fechaIdx: index('idx_cotizaciones_fecha').on(table.fecha),
    creadoPorIdx: index('idx_cotizaciones_creado_por').on(table.creadoPor),
  };
});

export const cotizacionItems = pgTable('cotizacion_items', {
  id: serial('id').primaryKey(),
  cotizacionId: integer('cotizacion_id').notNull().references(() => cotizaciones.id, { onDelete: 'cascade' }),
  orden: integer('orden').notNull(),
  descripcion: text('descripcion').notNull(),
  cantidad: numeric('cantidad', { precision: 10, scale: 4 }),
  unidadMedida: varchar('unidad_medida', { length: 50 }),
  precioUnitario: numeric('precio_unitario', { precision: 15, scale: 2 }),
  importe: numeric('importe', { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => {
  return {
    cotizacionIdIdx: index('idx_cotizacion_items_cotizacion_id').on(table.cotizacionId),
  };
});

export const cuentasBancoRelations = relations(cuentasBanco, ({ one, many }) => ({
  negocio: one(negocios, {
    fields: [cuentasBanco.negocioId],
    references: [negocios.id],
  }),
  negociosCompartidos: many(cuentaNegocio),
  movimientos: many(movimientos),
}));

export const cuentaNegocioRelations = relations(cuentaNegocio, ({ one }) => ({
  cuenta: one(cuentasBanco, {
    fields: [cuentaNegocio.cuentaId],
    references: [cuentasBanco.id],
  }),
  negocio: one(negocios, {
    fields: [cuentaNegocio.negocioId],
    references: [negocios.id],
  }),
}));

export const movimientosRelations = relations(movimientos, ({ one }) => ({
  negocio: one(negocios, {
    fields: [movimientos.negocioId],
    references: [negocios.id],
  }),
  centroCosto: one(centrosCosto, {
    fields: [movimientos.centroCostoId],
    references: [centrosCosto.id],
  }),
  cuentaBanco: one(cuentasBanco, {
    fields: [movimientos.cuentaBancoId],
    references: [cuentasBanco.id],
  }),
  creadoPorUsuario: one(usuarios, {
    fields: [movimientos.creadoPor],
    references: [usuarios.id],
    relationName: 'movimientos_creados',
  }),
  aprobadoPorUsuario: one(usuarios, {
    fields: [movimientos.aprobadoPor],
    references: [usuarios.id],
    relationName: 'movimientos_aprobados',
  }),
  traspasoRef: one(movimientos, {
    fields: [movimientos.traspasoRefId],
    references: [movimientos.id],
    relationName: 'traspaso_espejo',
  }),
}));

export const categoriasRelations = relations(categorias, ({ one }) => ({
  negocio: one(negocios, {
    fields: [categorias.negocioId],
    references: [negocios.id],
  }),
}));

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  negocioId: integer('negocio_id'),
  evento: varchar('evento', { length: 60 }).notNull(),
  recurso: varchar('recurso', { length: 100 }),
  recursoId: varchar('recurso_id', { length: 50 }),
  exitoso: boolean('exitoso').notNull(),
  detalles: text('detalles'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 300 }),
  requestId: varchar('request_id', { length: 36 }),
  creadoEn: timestamp('creado_en').defaultNow().notNull(),
});
