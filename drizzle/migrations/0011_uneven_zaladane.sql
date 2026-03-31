-- IMPORTANTE:
-- ALTER TYPE ... ADD VALUE debe ejecutarse fuera de una transacción explícita (BEGIN/COMMIT)
-- en entornos donde PostgreSQL lo requiera. Mantener estos statements al inicio.
ALTER TYPE "public"."estado_movimiento" ADD VALUE IF NOT EXISTS 'PAGADO';--> statement-breakpoint
ALTER TYPE "public"."estado_movimiento" ADD VALUE IF NOT EXISTS 'CANCELADO';--> statement-breakpoint
ALTER TABLE "movimientos" ADD COLUMN "efectuado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "movimientos" ADD COLUMN "fecha_pago" timestamp;--> statement-breakpoint
ALTER TABLE "movimientos" ADD COLUMN "pagado_por" integer;--> statement-breakpoint
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_pagado_por_usuarios_id_fk" FOREIGN KEY ("pagado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_movimientos_pagado_por" ON "movimientos" USING btree ("pagado_por");
