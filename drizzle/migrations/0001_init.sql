CREATE TYPE "public"."rol_nombre" AS ENUM('Dueño', 'Socio', 'Admin', 'Externo');--> statement-breakpoint
CREATE TABLE "centros_costo" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"codigo" varchar(50),
	"negocio_id" integer NOT NULL,
	"activo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "negocios" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"rubro" varchar(100),
	"modelo_ingreso" varchar(100),
	"tiene_socios" boolean DEFAULT false,
	"activo" boolean DEFAULT true,
	"configuracion" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" "rol_nombre" NOT NULL,
	"descripcion" varchar(500),
	"permisos" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "roles_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "usuario_negocio" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"negocio_id" integer NOT NULL,
	"permisos_especificos" jsonb,
	"fecha_asignacion" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre_completo" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"rol_id" integer NOT NULL,
	"activo" boolean DEFAULT true,
	"fecha_ultimo_acceso" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "centros_costo" ADD CONSTRAINT "centros_costo_negocio_id_negocios_id_fk" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_negocio" ADD CONSTRAINT "usuario_negocio_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_negocio" ADD CONSTRAINT "usuario_negocio_negocio_id_negocios_id_fk" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_roles_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_centros_costo_negocio_id" ON "centros_costo" USING btree ("negocio_id");--> statement-breakpoint
CREATE INDEX "idx_usuario_negocio_usuario_id" ON "usuario_negocio" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "idx_usuario_negocio_negocio_id" ON "usuario_negocio" USING btree ("negocio_id");--> statement-breakpoint
INSERT INTO roles (nombre, descripcion, permisos) VALUES
  ('Dueño', 'Acceso total al sistema', '{"all": true}'),
  ('Socio', 'Acceso a su(s) negocio(s)', '{"read": true, "export": true}'),
  ('Admin', 'Gestión operativa', '{"read": true, "write": true, "delete": true}'),
  ('Externo', 'Solo lectura', '{"read": true}');
