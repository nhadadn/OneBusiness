CREATE TYPE "public"."tipo_categoria" AS ENUM('INGRESO', 'EGRESO');--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"tipo" "tipo_categoria" NOT NULL,
	"negocio_id" integer,
	"activa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_negocio_id_negocios_id_fk" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_categorias_negocio_id" ON "categorias" USING btree ("negocio_id");--> statement-breakpoint
CREATE INDEX "idx_categorias_tipo" ON "categorias" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX "idx_categorias_activa" ON "categorias" USING btree ("activa");