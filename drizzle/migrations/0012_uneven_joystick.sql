ALTER TABLE "categorias" ADD COLUMN "requiere_aprobacion" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "categorias" ADD COLUMN "monto_max_sin_aprobacion" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "movimientos" ADD COLUMN "categoria_id" integer;--> statement-breakpoint
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE no action ON UPDATE no action;