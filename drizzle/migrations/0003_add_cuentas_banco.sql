CREATE TYPE "public"."estado_movimiento" AS ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO');--> statement-breakpoint
CREATE TYPE "public"."tipo_cuenta" AS ENUM('EFECTIVO', 'BANCARIA', 'CAJA_CHICA');--> statement-breakpoint
CREATE TYPE "public"."tipo_movimiento" AS ENUM('INGRESO', 'EGRESO', 'TRASPASO_SALIDA', 'TRASPASO_ENTRADA');--> statement-breakpoint
CREATE TABLE "cuentas_banco" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"tipo" "tipo_cuenta" NOT NULL,
	"banco_institucion" varchar(50),
	"titular" varchar(100),
	"negocio_id" integer NOT NULL,
	"saldo_inicial" numeric(15, 2) DEFAULT '0' NOT NULL,
	"saldo_real" numeric(15, 2),
	"fecha_saldo_real" timestamp,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cuentas_banco" ADD CONSTRAINT "cuentas_banco_negocio_id_negocios_id_fk" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_cuentas_banco_negocio_id" ON "cuentas_banco" USING btree ("negocio_id");--> statement-breakpoint
CREATE INDEX "idx_cuentas_banco_tipo" ON "cuentas_banco" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX "idx_cuentas_banco_activo" ON "cuentas_banco" USING btree ("activo");
