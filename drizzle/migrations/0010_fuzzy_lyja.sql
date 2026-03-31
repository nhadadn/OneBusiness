CREATE TABLE "cuenta_negocio" (
	"id" serial PRIMARY KEY NOT NULL,
	"cuenta_id" integer NOT NULL,
	"negocio_id" integer NOT NULL,
	"fecha_asignacion" timestamp DEFAULT now()
);
--> statement-breakpoint
INSERT INTO "cuenta_negocio" ("cuenta_id", "negocio_id")
SELECT "id", "negocio_id" FROM "cuentas_banco" WHERE "negocio_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "cuentas_banco" ALTER COLUMN "negocio_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cuentas_banco" ADD COLUMN "es_global" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cuenta_negocio" ADD CONSTRAINT "cuenta_negocio_cuenta_id_cuentas_banco_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "public"."cuentas_banco"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuenta_negocio" ADD CONSTRAINT "cuenta_negocio_negocio_id_negocios_id_fk" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_cuenta_negocio_cuenta" ON "cuenta_negocio" USING btree ("cuenta_id");--> statement-breakpoint
CREATE INDEX "idx_cuenta_negocio_negocio" ON "cuenta_negocio" USING btree ("negocio_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_cuenta_negocio" ON "cuenta_negocio" USING btree ("cuenta_id","negocio_id");