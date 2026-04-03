Checklist de Verificación Post-Despliegue a Producción

Información General

- Proyecto: Sistema de Gestión Financiera Multi-tenant
- Fecha de Despliegue: \[Fecha]
- Versión: v3.1 (Sprint 1.5 completado)
- Plataforma: Vercel + Neon PostgreSQL
- Verificador: \[Nombre]
- URL Producción: \[URL]

1. Verificación Funcional

1.1 Autenticación y Autorización

- <br />
  1. Login Funcional
- Descripción: Verificar que el login funciona correctamente
- Pasos:
- Navegar a /login
- Ingresar credenciales válidas
- Verificar redirección al dashboard
- Resultado Esperado: Login exitoso y redirección a dashboard principal
- Criterio de Éxito: Usuario autenticado y en dashboard
- Prioridad: CRÍTICA
- <br />
  1. Refresh Token Funcional
- Descripción: Verificar que los tokens de refresh funcionan
- Pasos:
- Esperar que el access token expire
- Realizar una acción que requiera autenticación
- Verificar que el sistema renueva el token automáticamente
- Resultado Esperado: Sesión continúa sin necesidad de re-login
- Criterio de Éxito: No se solicita re-login
- Prioridad: ALTA
- <br />
  1. Logout Funcional
- Descripción: Verificar que el cierre de sesión funciona
- Pasos:
- Clic en botón logout
- Verificar redirección a login
- Intentar navegar a rutas protegidas
- Resultado Esperado: Redirección a login y bloqueo de rutas protegidas
- Criterio de Éxito: Sesión cerrada correctamente
- Prioridad: ALTA
- <br />
  1. RBAC: Dueño
- Descripción: Verificar permisos de rol Dueño
- Pasos:
- Login como Dueño
- Verificar acceso a todas las secciones
- Intentar asignar cuentas a negocios
- Verificar acceso a todos los controles
- Resultado Esperado: Acceso completo a todas las funcionalidades
- Criterio de Éxito: Todos los controles accesibles
- Prioridad: CRÍTICA
- <br />
  1. RBAC: Admin
- Descripción: Verificar permisos de rol Admin
- Pasos:
- Login como Admin
- Intentar asignar cuentas compartidas (debe fallar)
- Verificar acceso limitado a controles de Dueño
- Resultado Esperado: Restricciones aplicadas correctamente
- Criterio de Éxito: Acciones prohibidas bloqueadas
- Prioridad: ALTA
- <br />
  1. RBAC: Socio
- Descripción: Verificar permisos de rol Socio
- Pasos:
- Login como Socio
- Verificar acceso solo a cuentas asignadas
- Intentar acciones de administración (deben fallar)
- Resultado Esperado: Solo acceso a cuentas asignadas
- Criterio de Éxito: Acciones bloqueadas según esperado
- Prioridad: ALTA
- <br />
  1. RBAC: Externo
- Descripción: Verificar permisos de rol Externo
- Pasos:
- Login como Externo
- Verificar acceso solo lectura
- Intentar crear/editar movimientos (deben fallar)
- Resultado Esperado: Solo acceso de lectura
- Criterio de Éxito: Ediciones bloqueadas
- Prioridad: ALTA

1.2 Gestión de Negocios

- <br />
  1. Crear Negocio
- Descripción: Verificar creación de nuevos negocios
- Pasos:
- Navegar a /negocios
- Clic en "Crear Negocio"
- Llenar formulario con datos válidos
- Guardar
- Resultado Esperado: Negocio creado y visible en tabla
- Criterio de Éxito: Nuevo negocio aparece en lista
- Prioridad: CRÍTICA
- <br />
  1. Editar Negocio
- Descripción: Verificar edición de negocios existentes
- Pasos:
- Navegar a /negocios
- Clic en editar de un negocio
- Modificar datos
- Guardar
- Resultado Esperado: Negocio actualizado correctamente
- Criterio de Éxito: Cambios reflejados en tabla
- Prioridad: ALTA
- <br />
  1. Eliminar Negocio
- Descripción: Verificar eliminación de negocios
- Pasos:
- Navegar a /negocios
- Clic en eliminar de un negocio
- Confirmar eliminación
- Resultado Esperado: Negocio eliminado y no visible
- Criterio de Éxito: Negocio ya no aparece en lista
- Prioridad: MEDIA
- <br />
  1. Validación de Formulario Negocio
- Descripción: Verificar validaciones del formulario
- Pasos:
- Intentar crear negocio sin nombre
- Intentar crear negocio con RFC inválido
- Dejar campos requeridos vacíos
- Resultado Esperado: Mensajes de error apropiados
- Criterio de Éxito: Validaciones activas y claras
- Prioridad: MEDIA

1.3 Gestión de Cuentas Bancarias

- <br />
  1. Crear Cuenta Global
- Descripción: Crear cuenta bancaria global (visibles para todos)
- Pasos:
- Navegar a /cuentas-banco
- Clic en "Crear Cuenta"
- Marcar "Cuenta Global"
- Llenar datos
- Guardar
- Resultado Esperado: Cuenta creada y visible para todos los roles
- Criterio de Éxito: Cuenta visible en dashboard de todos
- Prioridad: CRÍTICA
- <br />
  1. Crear Cuenta Privada
- Descripción: Crear cuenta bancaria privada
- Pasos:
- Navegar a /cuentas-banco
- Clic en "Crear Cuenta"
- NO marcar "Cuenta Global"
- Llenar datos
- Guardar
- Resultado Esperado: Cuenta creada y solo visible para Dueño/Admin
- Criterio de Éxito: Cuenta no visible para Socios
- Prioridad: CRÍTICA
- <br />
  1. Asignar Cuenta a Negocio (Dueño)
- Descripción: Dueño puede asignar cuentas a negocios
- Pasos:
- Login como Dueño
- Navegar a /cuentas-banco
- Clic en "Asignar" de una cuenta
- Seleccionar negocios
- Guardar
- Resultado Esperado: Cuenta asignada a negocios seleccionados
- Criterio de Éxito: Socio puede ver cuenta asignada
- Prioridad: CRÍTICA
- <br />
  1. Asignar Cuenta a Negocio (Admin - Debe Fallar)
- Descripción: Admin NO puede asignar cuentas
- Pasos:
- Login como Admin
- Intentar asignar cuenta a negocio
- Resultado Esperado: Acción rechazada con mensaje apropiado
- Criterio de Éxito: Error 403 o mensaje de permiso denegado
- Prioridad: ALTA
- <br />
  1. Ver Cuentas Compartidas (Socio)
- Descripción: Socio ve solo cuentas asignadas
- Pasos:
- Login como Socio
- Navegar a /cuentas-banco
- Resultado Esperado: Solo muestra cuentas asignadas a su negocio
- Criterio de Éxito: No muestra cuentas privadas ni no asignadas
- Prioridad: CRÍTICA
- <br />
  1. Balance Cuenta Global vs Compartida
- Descripción: Verificar cálculo de balance correcto
- Pasos:
- Crear cuenta global
- Crear movimientos PAGADOS
- Verificar balance en dashboard
- Resultado Esperado: Solo movimientos PAGADOS afectan balance
- Criterio de Éxito: Balance = Σ movimientos PAGADOS
- Prioridad: CRÍTICA

1.4 Gestión de Movimientos

- <br />
  1. Crear Movimiento Pendiente
- Descripción: Crear movimiento en estado PENDIENTE
- Pasos:
- Navegar a /movimientos
- Clic en "Crear Movimiento"
- Llenar datos
- NO marcar "Efectuado"
- Guardar
- Resultado Esperado: Movimiento creado con estado PENDIENTE
- Criterio de Éxito: Estado PENDIENTE visible en tabla
- Prioridad: CRÍTICA
- <br />
  1. Crear Movimiento Efectuado
- Descripción: Crear movimiento efectuado
- Pasos:
- Navegar a /movimientos
- Clic en "Crear Movimiento"
- Llenar datos
- Marcar "Efectuado"
- Guardar
- Resultado Esperado: Movimiento creado con estado APROBADO
- Criterio de Éxito: Estado APROBADO visible en tabla
- Prioridad: CRÍTICA
- <br />
  1. Aprobación Automática por Categoría
- Descripción: Movimientos bajo umbral se aprueban automáticamente
- Pasos:
- Configurar categoría con montoMaxSinAprobación
- Crear movimiento bajo ese monto
- Verificar estado
- Resultado Esperado: Movimiento aprobado automáticamente
- Criterio de Éxito: Estado = APROBADO sin aprobación manual
- Prioridad: CRÍTICA
- <br />
  1. Rechazo de Movimiento
- Descripción: Rechazar un movimiento pendiente
- Pasos:
- Seleccionar movimiento PENDIENTE
- Clic en "Rechazar"
- Confirmar
- Resultado Esperado: Movimiento cambia a RECHAZADO
- Criterio de Éxito: Estado = RECHAZADO y NO afecta balance
- Prioridad: ALTA
- <br />
  1. Marcar Movimiento como Pagado
- Descripción: Marcar movimiento aprobado como pagado
- Pasos:
- Seleccionar movimiento APROBADO
- Clic en "Marcar Pagado"
- Confirmar
- Resultado Esperado: Movimiento cambia a PAGADO y afecta balance
- Criterio de Éxito: Estado = PAGADO y balance actualizado
- Prioridad: CRÍTICA
- <br />
  1. Cancelar Movimiento
- Descripción: Cancelar un movimiento pendiente
- Pasos:
- Seleccionar movimiento PENDIENTE
- Clic en "Cancelar"
- Confirmar
- Resultado Esperado: Movimiento cambia a CANCELADO
- Criterio de Éxito: Estado = CANCELADO y NO afecta balance
- Prioridad: ALTA
- <br />
  1. Filtro por Estado: Pendientes
- Descripción: Verificar filtro de movimientos pendientes
- Pasos:
- Navegar a /movimientos
- Clic en pestaña "Pendientes"
- Resultado Esperado: Solo muestra movimientos PENDIENTE
- Criterio de Éxito: Lista filtrada correctamente
- Prioridad: CRÍTICA
- <br />
  1. Filtro por Estado: Aprobados
- Descripción: Verificar filtro de movimientos aprobados
- Pasos:
- Navegar a /movimientos
- Clic en pestaña "Aprobados"
- Resultado Esperado: Solo muestra movimientos APROBADO
- Criterio de Éxito: Lista filtrada correctamente
- Prioridad: CRÍTICA
- <br />
  1. Filtro por Estado: Pagados
- Descripción: Verificar filtro de movimientos pagados
- Pasos:
- Navegar a /movimientos
- Clic en pestaña "Pagados"
- Resultado Esperado: Solo muestra movimientos PAGADO
- Criterio de Éxito: Lista filtrada correctamente
- Prioridad: CRÍTICA
- <br />
  1. Filtro por Estado: Rechazados
- Descripción: Verificar filtro de movimientos rechazados
- Pasos:
- Navegar a /movimientos
- Clic en pestaña "Rechazados"
- Resultado Esperado: Solo muestra movimientos RECHAZADO
- Criterio de Éxito: Lista filtrada correctamente
- Prioridad: ALTA
- <br />
  1. Filtro por Estado: Cancelados
- Descripción: Verificar filtro de movimientos cancelados
- Pasos:
- Navegar a /movimientos
- Clic en pestaña "Cancelados"
- Resultado Esperado: Solo muestra movimientos CANCELADO
- Criterio de Éxito: Lista filtrada correctamente
- Prioridad: ALTA
- <br />
  1. Movimientos RECHAZADOS no afectan Balance
- Descripción: Verificar que rechazados no alteran saldos
- Pasos:
- Crear movimiento APROBADO con monto X
- Ver balance antes
- Rechazar movimiento
- Ver balance después
- Resultado Esperado: Balance no cambia al rechazar
- Criterio de Éxito: Balance antes = Balance después
- Prioridad: CRÍTICA
- <br />
  1. Movimientos CANCELADOS no afectan Balance
- Descripción: Verificar que cancelados no alteran saldos
- Pasos:
- Crear movimiento PENDIENTE con monto X
- Cancelar movimiento
- Verificar balance
- Resultado Esperado: Balance no cambia al cancelar
- Criterio de Éxito: Balance se mantiene igual
- Prioridad: CRÍTICA

1.5 Categorías

- <br />
  1. Crear Categoría
- Descripción: Crear nueva categoría de movimientos
- Pasos:
- Navegar a /categorias
- Clic en "Crear Categoría"
- Llenar datos incluyendo montoMaxSinAprobación
- Guardar
- Resultado Esperado: Categoría creada y visible
- Criterio de Éxito: Categoría aparece en lista
- Prioridad: ALTA
- <br />
  1. Editar Categoría
- Descripción: Editar categoría existente
- Pasos:
- Navegar a /categorias 2.Editar categoría 3.Modificar montoMaxSinAprobación 4.Guardar
- Resultado Esperado: Categoría actualizada
- Criterio de Éxito: Cambios reflejados
- Prioridad: MEDIA
- <br />
  1. Eliminar Categoría sin Uso
- Descripción: Eliminar categoría sin movimientos asociados
- Pasos:
- Crear categoría sin usar
- Eliminar categoría
- Resultado Esperado: Categoría eliminada
- Criterio de Éxito: Ya no aparece en lista
- Prioridad: MEDIA

1.6 Arqueo de Caja

- <br />
  1. Arqueo Muestra Cuentas Globales
- Descripción: Verificar que arqueo incluye cuentas globales
- Pasos:
- Crear cuenta global con movimientos PAGADOS
- Navegar a /arqueo
- Resultado Esperado: Cuenta global aparece en arqueo
- Criterio de Éxito: Arqueo NO muestra "Sin cuentas activas"
- Prioridad: CRÍTICA
- <br />
  1. Arqueo Muestra Cuentas Compartidas
- Descripción: Verificar que arqueo incluye cuentas compartidas
- Pasos:
- Asignar cuenta a negocio
- Login como Socio
- Navegar a /arqueo
- Resultado Esperado: Cuenta compartida aparece en arqueo
- Criterio de Éxito: Arqueo muestra cuentas asignadas
- Prioridad: CRÍTICA
- <br />
  1. Arqueo NO Muestra Cuentas Privadas (Socio)
- Descripción: Socio no ve cuentas privadas en arqueo
- Pasos:
- Login como Socio
- Navegar a /arqueo
- Resultado Esperado: Solo cuentas asignadas y globales
- Criterio de Éxito: Cuentas privadas no visibles
- Prioridad: CRÍTICA
- <br />
  1. Cálculo de Arqueo Correcto
- Descripción: Verificar cálculo de arqueo
- Pasos:
- Crear movimientos PAGADOS conocidos
- Verificar arqueo
- Resultado Esperado: Saldos coinciden con manual
- Criterio de Éxito: Arqueo = Σ movimientos PAGADOS
- Prioridad: CRÍTICA

1.7 Consolidado

- <br />
  1. Consolidado por Cuenta
- Descripción: Verificar consolidado de cuentas
- Pasos:
- Crear múltiples cuentas con movimientos
- Navegar a /consolidado
- Resultado Esperado: Resumen correcto por cuenta
- Criterio de Éxito: Saldos por cuenta correctos
- Prioridad: ALTA
- <br />
  1. Consolidado por Negocio
- Descripción: Verificar consolidado por negocio
- Pasos:
- Crear movimientos para múltiples negocios
- Navegar a /consolidado
- Resultado Esperado: Resumen correcto por negocio
- Criterio de Éxito: Saldos por negocio correctos
- Prioridad: ALTA

1.8 Dashboard

- <br />
  1. Dashboard Muestra Cuentas Activas
- Descripción: Dashboard muestra cuentas correctas según rol
- Pasos:
- Login con diferente rol
- Verificar cuentas en dashboard
- Resultado Esperado: Cuentas filtradas por rol y asignación
- Criterio de Éxito: Debido/Dueño: todas, Socio: asignadas+globales
- Prioridad: CRÍTICA
- <br />
  1. Dashboard Indicadores de Balance
- Descripción: Dashboard muestra balances correctos
- Pasos:
- Verificar saldo total
- Verificar saldos por cuenta
- Resultado Esperado: Balances coinciden con arqueo
- Criterio de Éxito: Dashboard = Arqueo
- Prioridad: CRÍTICA
- <br />
  1. Dashboard Últimos Movimientos
- Descripción: Dashboard muestra últimos movimientos
- Pasos:
- Crear movimiento
- Verificar aparezca en dashboard
- Resultado Esperado: Últimos movimientos visibles
- Criterio de Éxito: Movimientos recientes mostrados
- Prioridad: MEDIA

1. Verificación Técnica

2.1 Base de Datos

- <br />
  1. Conexión a Neon PostgreSQL
- Descripción: Verificar conectividad con Neon
- Pasos:
- Revisar logs de Vercel
- Verificar queries exitosas
- Resultado Esperado: Sin errores de conexión
- Criterio de Éxito: No timeouts ni connection errors
- Prioridad: CRÍTICA
- <br />
  1. Migraciones Aplicadas
- Descripción: Verificar que todas las migraciones están aplicadas
- Pasos:
- Verificar tabla \_\_drizzle\_migrations
- Contar migraciones (debe ser 12)
- Resultado Esperado: 12 migraciones aplicadas
- Criterio de Éxito: 12 registros en \_\_drizzle\_migrations
- Prioridad: CRÍTICA
- <br />
  1. Tablas Creadas Correctamente
- Descripción: Verificar estructura de tablas
- Pasos:
- Consultar pg\_tables
- Verificar tablas: users, roles, cuentas\_banco, movimientos, categorias, cuentaNegocio, negocios
- Resultado Esperado: Todas las tablas existentes
- Criterio de Éxito: 7 tablas principales creadas
- Prioridad: CRÍTICA
- <br />
  1. Seed Data Cargado
- Descripción: Verificar datos iniciales
- Pasos:
- Verificar roles creados (4 roles)
- Verificar usuario inicial creado
- Resultado Esperado: Roles y usuario inicial presentes
- Criterio de Éxito: 4 roles, 1 usuario inicial
- Prioridad: ALTA
- <br />
  1. Índices y Restricciones
- Descripción: Verificar constraints de DB
- Pasos:
- Verificar foreign keys
- Verificar unique constraints
- Verificar not null constraints
- Resultado Esperado: Todas las restricciones activas
- Criterio de Éxito: Sin violaciones de constraints
- Prioridad: ALTA
- <br />
  1. Performance de Queries
- Descripción: Verificar tiempos de respuesta
- Pasos:
- Monitorear queries lentos
- Verificar explain plan
- Resultado Esperado: Queries responden < 1 segundo
- Criterio de Éxito: Sin queries lentos detectados
- Prioridad: MEDIA

2.2 API Endpoints

- <br />
  1. POST /api/auth/register
- Descripción: Verificar endpoint de registro
- Pasos:
- Enviar POST con datos válidos
- Verificar respuesta
- Resultado Esperado: 201 y usuario creado
- Criterio de Éxito: Código 201, usuario en DB
- Prioridad: CRÍTICA
- <br />
  1. POST /api/auth/login
- Descripción: Verificar endpoint de login
- Pasos:
- Enviar POST con credenciales válidas
- Verificar tokens devueltos
- Resultado Esperado: 200 y tokens válidos
- Criterio de Éxito: access\_token y refresh\_token presentes
- Prioridad: CRÍTICA
- <br />
  1. POST /api/auth/refresh
- Descripción: Verificar endpoint de refresh
- Pasos:
- Enviar refresh\_token válido
- Verificar nuevo access\_token
- Resultado Esperado: 200 y nuevo access\_token
- Criterio de Éxico: Token nuevo válido
- Prioridad: CRÍTICA
- <br />
  1. POST /api/negocios
- Descripción: Verificar endpoint de creación de negocios
- Pasos:
- Login como Dueño
- Enviar POST con datos válidos
- Resultado Esperado: 201 y negocio creado
- Criterio de Éxito: Negocio en DB
- Prioridad: CRÍTICA
- <br />
  1. GET /api/negocios
- Descripción: Verificar endpoint de listado de negocios
- Pasos:
- Login
- Enviar GET
- Resultado Esperado: 200 y lista de negocios
- Criterio de Éxito: Array con todos los negocios
- Prioridad: CRÍTICA
- <br />
  1. PUT /api/negocios/\[id]
- Descripción: Verificar endpoint de actualización
- Pasos:
- Login como Dueño
- Enviar PUT con datos actualizados
- Resultado Esperado: 200 y negocio actualizado
- Criterio de Éxito: Datos reflejados en DB
- Prioridad: ALTA
- <br />
  1. DELETE /api/negocios/\[id]
- Descripción: Verificar endpoint de eliminación
- Pasos:
- Login como Dueño
- Enviar DELETE
- Resultado Esperado: 200 y negocio eliminado
- Criterio de Éxito: Negocio ya no en DB
- Prioridad: MEDIA
- <br />
  1. POST /api/cuentas-banco/\[id]/asignar
- Descripción: Verificar endpoint de asignación
- Pasos:
- Login como Dueño
- Enviar POST con negocioIds
- Resultado Esperado: 200 y cuentas asignadas
- Criterio de Éxito: Registros en cuentaNegocio
- Prioridad: CRÍTICA
- <br />
  1. POST /api/movimientos
- Descripción: Verificar endpoint de creación
- Pasos:
- Login
- Enviar POST con datos válidos
- Resultado Esperado: 201 y movimiento creado
- Criterio de Éxito: Movimiento en DB con estado correcto
- Prioridad: CRÍTICA
- <br />
  1. POST /api/movimientos/\[id]/aprobar
- Descripción: Verificar endpoint de aprobación
- Pasos:
- Login con permisos
- Enviar POST
- Resultado Esperado: 200 y movimiento aprobado
- Criterio de Éxito: Estado = APROBADO
- Prioridad: CRÍTICA
- <br />
  1. POST /api/movimientos/\[id]/rechazar
- Descripción: Verificar endpoint de rechazo
- Pasos:
- Login con permisos
- Enviar POST
- Resultado Esperado: 200 y movimiento rechazado
- Criterio de Éxito: Estado = RECHAZADO
- Prioridad: ALTA
- <br />
  1. POST /api/movimientos/\[id]/pagar
- Descripción: Verificar endpoint de pago
- Pasos:
- Login con permisos
- Enviar POST
- Resultado Esperado: 200 y movimiento pagado
- Criterio de Éxito: Estado = PAGADO
- Prioridad: CRÍTICA
- <br />
  1. POST /api/movimientos/\[id]/cancelar
- Descripción: Verificar endpoint de cancelación
- Pasos:
- Login con permisos
- Enviar POST
- Resultado Esperado: 200 y movimiento cancelado
- Criterio de Éxito: Estado = CANCELADO
- Prioridad: ALTA
- <br />
  1. GET /api/cuentas-banco
- Descripción: Verificar endpoint de listado de cuentas
- Pasos:
- Login
- Enviar GET
- Resultado Esperado: 200 y lista filtrada por rol
- Criterio de Éxito: Solo cuentas permitidas según rol
- Prioridad: CRÍTICA
- <br />
  1. Manejo de Errores 404
- Descripción: Verificar respuestas 404
- Pasos:
- Solicitar recurso inexistente
- Resultado Esperado: 404 con mensaje claro
- Criterio de Éxito: Código 404 y body JSON
- Prioridad: MEDIA
- <br />
  1. Manejo de Errores 401
- Descripción: Verificar respuestas 401
- Pasos:
- Solicitar recurso sin auth
- Resultado Esperado: 401 con mensaje claro
- Criterio de Éxito: Código 401 y body JSON
- Prioridad: MEDIA
- <br />
  1. Manejo de Errores 403
- Descripción: Verificar respuestas 403
- Pasos:
- Solicitar recurso sin permisos
- Resultado Esperado: 403 con mensaje claro
- Criterio de Éxito: Código 403 y body JSON
- Prioridad: MEDIA
- <br />
  1. Rate Limiting
- Descripción: Verificar límites de rate
- Pasos:
- Enviar múltiples requests rápidas
- Resultado Esperado: 429 después de límite
- Criterio de Éxito: Código 429 aplicado
- Prioridad: MEDIA

2.3 Frontend

- <br />
  1. Carga de Página Principal
- Descripción: Verificar tiempo de carga inicial
- Pasos:
- Limpiar cache
- Navegar a home
- Medir tiempo de carga
- Resultado Esperado: Carga < 3 segundos
- Criterio de Éxito: TTI (Time to Interactive) < 3s
- Prioridad: ALTA
- <br />
  1. Navegación entre Rutas
- Descripción: Verificar navegación SPA
- Pasos:
- Navegar entre secciones
- Verificar sin recargas completas
- Resultado Esperado: Navegación fluida sin recarga
- Criterio de Éxito: Navegación client-side
- Prioridad: ALTA
- <br />
  1. Responsive Design: Desktop
- Descripción: Verificar diseño en escritorio
- Pasos:
- Abrir en pantalla > 1024px
- Verificar layout
- Resultado Esperado: Diseño correcto
- Criterio de Éxito: Sin overflow o elements rotos
- Prioridad: ALTA
- <br />
  1. Responsive Design: Tablet
- Descripción: Verificar diseño en tablet
- Pasos:
- Abrir en 768px - 1024px
- Verificar layout
- Resultado Esperado: Diseño adaptable
- Criterio de Éxito: Menú y contenido adaptados
- Prioridad: MEDIA
- <br />
  1. Responsive Design: Mobile
- Descripción: Verificar diseño en móvil
- Pasos:
- Abrir en < 768px
- Verificar layout
- Resultado Esperado: Diseño mobile-first
- Criterio de Éxito: Menú hamburguesa funcionando
- Prioridad: MEDIA
- <br />
  1. Notificaciones Toast
- Descripción: Verificar sistema de notificaciones
- Pasos:
- Realizar acción exitosa
- Realizar acción fallida
- Resultado Esperado: Toasts apropiados
- Criterio de Éxito: Toasts success y error funcionan
- Prioridad: MEDIA
- <br />
  1. Loading States
- Descripción: Verificar estados de carga
- Pasos:
- Realizar acción lenta
- Verificar spinners/loaders
- Resultado Esperado: Indicadores de carga visibles
- Criterio de Éxito: Sin UI congelada
- Prioridad: MEDIA

2.4 Vercel Deployment

- <br />
  1. Deployment Exitoso
- Descripción: Verificar despliegue en Vercel
- Pasos:
- Revisar dashboard de Vercel
- Verificar status "Ready"
- Resultado Esperado: Despliegue completado sin errores
- Criterio de Éxito: Status = Ready
- Prioridad: CRÍTICA
- <br />
  1. Environment Variables Configuradas
- Descripción: Verificar variables de entorno
- Pasos:
- Verificar DATABASE\_URL
- Verificar JWT\_SECRET
- Verificar REFRESH\_SECRET
- Verificar NODE\_ENV=production
- Resultado Esperado: Todas las variables presentes
- Criterio de Éxito: 4 variables configuradas
- Prioridad: CRÍTICA
- <br />
  1. Logs sin Errores Críticos
- Descripción: Revisar logs de aplicación
- Pasos:
- Acceder a logs de Vercel
- Buscar errores FATAL o CRITICAL
- Resultado Esperado: Sin errores críticos
- Criterio de Éxito: Solo warnings o info
- Prioridad: ALTA
- <br />
  1. Build Time Aceptable
- Descripción: Verificar tiempo de build
- Pasos:
- Revisar tiempo de build en Vercel
- Resultado Esperado: Build < 3 minutos
- Criterio de Éxito: Tiempo de build aceptable
- Prioridad: MEDIA
- <br />
  1. Cache de Vercel Funcionando
- Descripción: Verificar caché de assets
- Pasos:
- Inspeccionar headers de respuesta
- Verificar Cache-Control
- Resultado Esperado: Headers de cache presentes
- Criterio de Éxito: Assets cacheados correctamente
- Prioridad: MEDIA

2.5 Integraciones

- <br />
  1. bcryptjs Funcionando
- Descripción: Verificar hashing de passwords
- Pasos:
- Registrar usuario
- Login con ese usuario
- Resultado Esperado: Autenticación exitosa
- Criterio de Éxito: Password correcto
- Prioridad: CRÍTICA

1. Verificación de Seguridad

3.1 Autenticación

- <br />
  1. Passwords Hasheados Correctamente
- Descripción: Verificar que no hay passwords en texto plano
- Pasos:
- Consultar tabla users
- Verificar campos password
- Resultado Esperado: Passwords hasheados con bcryptjs
- Criterio de Éxito: No passwords en texto plano
- Prioridad: CRÍTICA
- JWT Tokens Firmados Correctamente
- Descripción: Verificar firma de tokens
- Pasos:
- Decodificar access\_token
- Verificar firma
- Resultado Esperado: Firma válida con JWT\_SECRET
- Criterio de Éxito: Token no modificable
- Prioridad: CRÍTICA
- Refresh Tokens Seguros
- Descripción: Verificar manejo de refresh tokens
- Pasos:
- Usar refresh token válido
- Intentar reusarlo
- Resultado Esperado: Token rotación implementada
- Criterio de Éxito: No reuso de tokens
- Prioridad: CRÍTICA
- Tokens Expiran Correctamente
- Descripción: Verificar expiración de tokens
- Pasos:
- Esperar expiración de access\_token
- Intentar usar token expirado
- Resultado Esperado: Token rechazado
- Criterio de Éxito: Error 401 o 403
- Prioridad: CRÍTICA

3.2 Autorización

- <br />
  1. RBAC: Dueño No Accede a Recursos de Otro Dueño
- Descripción: Verificar aislamiento entre dueños
- Pasos:
- Crear dos dueños diferentes
- Verificar que no ven datos del otro
- Resultado Esperado: Aislamiento de datos
- Criterio de Éxito: Cada dueño ve solo sus datos
- Prioridad: CRÍTICA
- <br />
  1. RBAC: Admin No Puede Crear/Editar Dueño
- Descripción: Verificar restricciones de Admin
- Pasos:
- Login como Admin
- Intentar crear usuario Dueño
- Resultado Esperado: Acción bloqueada
- Criterio de Éxito: Error 403
- Prioridad: CRÍTICA
- <br />
  1. RBAC: Socio No Puede Ver Cuentas No Asignadas
- Descripción: Verificar filtrado de cuentas
- Pasos:
- Login como Socio
- Intentar acceder a cuenta no asignada
- Resultado Esperado: Acceso denegado
- Criterio de Éxito: Error 403 o datos no visibles
- Prioridad: CRÍTICA
- <br />
  1. RBAC: Externo Solo Lectura
- Descripción: Verificar solo lectura para Externo
- Pasos:
- Login como Externo
- Intentar crear/editar movimiento
- Resultado Esperado: Acción bloqueada
- Criterio de Éxito: Error 403
- Prioridad: CRÍTICA
- <br />
  1. API Endpoints Protegidos
- Descripción: Verificar que todos los endpoints protegidos
- Pasos:
- Intentar acceder a endpoints sin auth
- Intentar acceder con rol incorrecto
- Resultado Esperado: Todos los endpoints protegidos
- Criterio de Éxito: 401 sin auth, 403 sin permisos
- Prioridad: CRÍTICA

3.3 Datos

- <br />
  1. SQL Injection Prevenido
- Descripción: Verificar protección contra SQLi
- Pasos:
- Intentar inyección SQL en inputs
- Verificar sanitización
- Resultado Esperado: Inputs sanitizados
- Criterio de Éxito: No ejecución de SQL malicioso
- Prioridad: CRÍTICA
- <br />
  1. XSS Prevenido
- Descripción: Verificar protección contra XSS
- Pasos:
- Intentar inyectar scripts en campos
- Verificar escaping
- Resultado Esperado: Scripts no ejecutados
- Criterio de Éxito: HTML/JS escacpeado
- Prioridad: CRÍTICA
- <br />
  1. CSRF Prevenido
- Descripción: Verificar protección contra CSRF
- Pasos:
- Revisar headers de requests
- Verificar tokens CSRF
- Resultado Esperado: Protección CSRF activa
- Criterio de Éxito: Tokens CSRF presentes
- Prioridad: MEDIA
- <br />
  1. Validación de Input
- Descripción: Verificar validación en backend
- Pasos:
- Enviar datos inválidos
- Verificar rechazo
- Resultado Esperado: Datos inválidos rechazados
- Criterio de Éxito: Error 400 con mensaje claro
- Prioridad: ALTA

3.4 Configuración

- <br />
  1. Environment Variables No Exponidas
- Descripción: Verificar que secrets no en código
- Pasos:
- Revisar código en producción
- Verificar que no hay secrets hardcodeados
- Resultado Esperado: Ningún secret en código
- Criterio de Éxito: Secrets solo en env vars
- Prioridad: CRÍTICA
- <br />
  1. NODE\_ENV=production
- Descripción: Verificar modo producción
- Pasos:
- Verificar environment variables
- Verificar comportamiento
- Resultado Esperado: App en modo producción
- Criterio de Éxito: Dev tools deshabilitadas, logs optimizados
- Prioridad: ALTA
- <br />
  1. HTTPS Forzado
- Descripción: Verificar uso de HTTPS
- Pasos:
- Intentar acceder vía HTTP
- Verificar redirección
- Resultado Esperado: Redirección a HTTPS
- Criterio de Éxito: Solo HTTPS accesible
- Prioridad: CRÍTICA
- <br />
  1. Headers de Seguridad
- Descripción: Verificar headers de seguridad
- Pasos:
- Inspeccionar headers de respuesta
- Verificar: X-Frame-Options, X-Content-Type-Options, etc.
- Resultado Esperado: Headers de seguridad presentes
- Criterio de Éxito: Headers correctos configurados
- Prioridad: MEDIA

1. Verificación de Rendimiento

4.1 Carga

- <br />
  1. Tiempo de Carga Inicial < 3s
- Descripción: Medir TTI
- Pasos:
- Limpiar cache
- Navegar a home
- Medir con DevTools
- Resultado Esperado: TTI < 3 segundos
- Criterio de Éxito: Performance score > 90
- Prioridad: ALTA
- <br />
  1. First Contentful Paint < 1.5s
- Descripción: Medir FCP
- Pasos:
- Medir con Lighthouse
- Resultado Esperado: FCP < 1.5s
- Criterio de Éxito: Score > 90
- Prioridad: ALTA
- <br />
  1. Time to Interactive < 3s
- Descripción: Medir TTI
- Pasos:
- Medir con Lighthouse
- Resultado Esperado: TTI < 3s
- Criterio de Éxito: Score > 90
- Prioridad: ALTA

4.2 API

- <br />
  1. API Response Time < 200ms
- Descripción: Medir tiempo de respuesta de API
- Pasos:
- Medir endpoints principales
- Verificar promedio
- Resultado Esperado: Promedio < 200ms
- Criterio de Éxito: 95% de requests < 200ms
- Prioridad: ALTA
- <br />
  1. Queries Database < 100ms
- Descripción: Medir tiempo de queries
- Pasos:
- Monitorear queries a Neon
- Verificar tiempos
- Resultado Esperado: Queries < 100ms
- Criterio de Éxito: Sin queries lentas
- Prioridad: ALTA

4.3 Optimizaciones

- <br />
  1. Imágenes Optimizadas
- Descripción: Verificar optimización de imágenes
- Pasos:
- Revisar formato de imágenes
- Verificar tamaño
- Resultado Esperado: Imágenes en WebP/AVIF, < 100KB
- Criterio de Éxito: Imágenes optimizadas
- Prioridad: MEDIA
- <br />
  1. Code Splitting Funcionando
- Descripción: Verificar división de código
- Pasos:
- Revisar Network tab
- Verificar chunks
- Resultado Esperado: Código dividido en chunks
- Criterio de Éxito: Solo carga código necesario
- Prioridad: MEDIA
- <br />
  1. Tree Shaking Funcionando
- Descripción: Verificar eliminación de código muerto
- Pasos:
- Revisar bundle
- Verificar tamaño
- Resultado Esperado: Sin código no usado
- Criterio de Éxito: Bundle optimizado
- Prioridad: MEDIA

1. Verificación de UX/UI

5.1 Diseño

- <br />
  1. Consistencia de UI
- Descripción: Verificar consistencia visual
- Pasos:
- Navegar por todas las páginas
- Verificar colores, fuentes, espaciados
- Resultado Esperado: Diseño consistente
- Criterio de Éxito: Sin variaciones arbitrarias
- Prioridad: MEDIA
- <br />
  1. Tipografía Legible
- Descripción: Verificar legibilidad de texto
- Pasos:
- Verificar tamaño de fuentes
- Verificar contraste
- Resultado Esperado: Texto legible
- Criterio de Éxito: WCAG AA compliant
- Prioridad: ALTA
- <br />
  1. Accesibilidad: Teclado
- Descripción: Verificar navegación por teclado
- Pasos:
- Navegar solo con Tab
- Verificar focus visible
- Resultado Esperado: Toda la UI accesible por teclado
- Criterio de Éxito: Focus visible en todos los elementos
- Prioridad: ALTA
- <br />
  1. Accesibilidad: Screen Reader
- Descripción: Verificar compatibilidad con screen reader
- Pasos:
- Navegar con NVDA/VoiceOver
- Verificar labels y announcements
- Resultado Esperado: Todo accesible
- Criterio de Éxito: Estructura ARIA correcta
- Prioridad: MEDIA
- <br />
  1. States de Interacción
- Descripción: Verificar estados visuales
- Pasos:
- Hover en botones
- Focus en inputs
- Active en links
- Resultado Esperado: Estados visibles
- Criterio de Éxito: Feedback visual en todas las interacciones
- Prioridad: MEDIA

5.2 Usabilidad

- <br />
  1. Mensajes de Error Claros
- Descripción: Verificar claridad de errores
- Pasos:
- Provocar errores
- Leer mensajes
- Resultado Esperado: Errores entendibles
- Criterio de Éxito: Usuario sabe qué hacer
- Prioridad: ALTA
- <br />
  1. Confirmaciones de Acciones Críticas
- Descripción: Verificar confirmaciones
- Pasos:
- Intentar eliminar negocio
- Attempt to reject movement
- Resultado Esperado: Diálogos de confirmación
- Criterio de Éxito: Confirmación antes de acciones destructivas
- Prioridad: ALTA
- <br />
  1. Feedback de Acciones
- Descripción: Verificar feedback visual
- Pasos:
- Realizar acción exitosa
- Verificar toast/notificación
- Resultado Esperado: Feedback inmediato
- Criterio de Éxito: Usuario nota que acción completó
- Prioridad: MEDIA
- <br />
  1. Navegación Intuitiva
- Descripción: Verificar navegación
- Pasos:
- Navegar sin instrucciones
- Resultado Esperado: Navegación natural
- Criterio de Éxito: Usuario encuentra lo que busca
- Prioridad: ALTA

1. Verificación de Pruebas

6.1 Tests Unitarios

- <br />
  1. Tests Unitarios Pasando
- Descripción: Verificar que todos los tests pasan
- Pasos:
- Ejecutar npm test
- Resultado Esperado: Todos los tests pasan
- Criterio de Éxito: 0 failures
- Prioridad: CRÍTICA
- <br />
  1. Coverage de Tests > 80%
- Descripción: Verificar coverage
- Pasos:
- Ejecutar tests con coverage
- Revisar reporte
- Resultado Esperado: Coverage > 80%
- Criterio de Éxito: Metric达标
- Prioridad: MEDIA

6.2 Tests de Integración

- <br />
  1. Tests de Integración Pasando
- Descripción: Verificar tests de integración
- Pasos:
- Ejecutar tests de integración
- Resultado Esperado: Todos pasan
- Criterio de Éxito: 0 failures
- Prioridad: CRÍTICA
- <br />
  1. Tests de E2E Pasando
- Descripción: Verificar tests E2E
- Pasos:
- Ejecutar tests E2E
- Resultado Esperado: Todos pasan
- Criterio de Éxito: 0 failures
- Prioridad: CRÍTICA

1. Verificación de Documentación

- <br />
  1. Documentación de API Actualizada
- Descripción: Verificar que la API doc esté actualizada
- Pasos:
- Revisar documentación de endpoints
- Comparar con implementación
- Resultado Esperado: Documentación actualizada
- Criterio de Éxito: Todos los endpoints documentados
- Prioridad: MEDIA
- <br />
  1. README Actualizado
- Descripción: Verificar README del proyecto
- Pasos:
- Revisar README.md
- Verificar info de instalación y uso
- Resultado Esperado: README completo y claro
- Criterio de Éxito: Proyecto puede ser clonado y ejecutado
- Prioridad: MEDIA
- <br />
  1. Changelog Actualizado
- Descripción: Verificar changelog 3.1
- Pasos:
- Revisar CHANGELOG.md
- Verificar cambios de Sprint 1.5
- Resultado Esperado: Cambios documentados
- Criterio de Éxito: Todos los cambios listados
- Prioridad: BAJA

1. Verificación de Monitoreo

- <br />
  1. Monitoreo de Errores Configurado
- Descripción: Verificar integración con herramienta de monitoreo
- Pasos:
- Revisar integración (Sentry, LogRocket, etc.)
- Verificar que errores son capturados
- Resultado Esperado: Monitoreo activo
- Criterio de Éxito: Errores reportados automáticamente
- Prioridad: ALTA
- <br />
  1. Logs de Backend Configurados
- Descripción: Verificar logging estructurado
- Pasos:
- Verificar logs de Vercel
- Verificar estructura de logs
- Resultado Esperado: Logs estructurados
- Criterio de Éxito: Logs útiles para debugging
- Prioridad: ALTA
- <br />
  1. Alertas Configuradas
- Descripción: Verificar alertas automáticas
- Pasos:
- Verificar alertas de Vercel/Neon
- Verificar canales de notificación
- Resultado Esperado: Alertas configuradas
- Criterio de Éxito: Notificaciones en tiempo real
- Prioridad: MEDIA

1. Verificación de Backup y Recovery

- <br />
  1. Backups Automáticos de Neon
- Descripción: Verificar backups de base de datos
- Pasos:
- Revisar configuración de Neon
- Verificar backups programados
- Resultado Esperado: Backups automáticos activos
- Criterio de Éxito: Backups diarios/semanales
- Prioridad: CRÍTICA
- <br />
  1. Proceso de Restore Probado
- Descripción: Verificar restauración de backups
- Pasos:
- Restaurar backup de prueba
- Verificar integridad
- Resultado Esperado: Restore funcional
- Criterio de Éxito: Datos restaurados correctamente
- Prioridad: ALTA

1. Verificación de Compliance

- <br />
  1. GDPR Compliance
- Descripción: Verificar cumplimiento de GDPR
- Pasos:
- Verificar política de privacidad
- Verificar derecho al olvido
- Verificar exportación de datos
- Resultado Esperado: GDPR compliant
- Criterio de Éxito: Todos los requisitos cumplidos
- Prioridad: ALTA
- <br />
  1. Data Retention Policy
- Descripción: Verificar política de retención de datos
- Pasos:
- Revisar policy documentada
- Verificar implementación
- Resultado Esperado: Política implementada
- Criterio de Éxito: Datos eliminados según policy
- Prioridad: MEDIA

Resumen de Checklist

Total de Items: 124

Por Categoría:

- Funcional: 42 items
- Técnica: 37 items
- Seguridad: 14 items
- Rendimiento: 8 items
- UX/UI: 9 items
- Pruebas: 4 items
- Documentación: 3 items
- Monitoreo: 3 items
- Backup: 2 items
- Compliance: 2 items

Por Prioridad:

- CRÍTICA: 58 items
- ALTA: 38 items
- MEDIA: 27 items
- BAJA: 1 item

Criterio de Aprobación:

- Mínimo: Todos los items CRÍTICOS deben pasar (58/58)
- Recomendado: 100% de items CRÍTICOS y 95% de items ALTA
- Ideal: 100% de items CRÍTICAS y ALTA, 90% de items MEDIA

Notas y Observaciones

\[Ingrese notas observaciones durante verificación]

Reporte Final

Fecha de Verificación: \[Fecha] Verificador: \[Nombre] URL Producción: \[URL]

Resultado General:

- Items Verificados: \[X]/124
- Items Pasados: \[X]/124
- Items Fallidos: \[X]/124
- Pasó Checklist: \[SÍ/NO]

Próximos Pasos: \[Ingrese pasos a seguir]

Aprobado Por: \[Nombre/Firma] Fecha de Aprobación: \[Fecha]

Este checklist debe ser completado antes de considerar el despliegue como exitoso y listo para uso en producción.
