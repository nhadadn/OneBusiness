ALTER TABLE "centros_costo" ADD COLUMN "padre_id" integer;--> statement-breakpoint
ALTER TABLE "centros_costo" ADD COLUMN "tipo" varchar(20) DEFAULT 'SUBDIVISION' NOT NULL;--> statement-breakpoint
ALTER TABLE "centros_costo" ADD COLUMN "descripcion" varchar(500);--> statement-breakpoint
ALTER TABLE "centros_costo" ADD CONSTRAINT "centros_costo_padre_id_centros_costo_id_fk" FOREIGN KEY ("padre_id") REFERENCES "public"."centros_costo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_centros_costo_padre_id" ON "centros_costo" USING btree ("padre_id");