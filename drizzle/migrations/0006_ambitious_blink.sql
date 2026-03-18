 DO $$ BEGIN
  CREATE TYPE "public"."estado_cotizacion" AS ENUM ('BORRADOR', 'ENVIADA', 'APROBADA', 'FACTURADA', 'CANCELADA');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "negocios" ADD COLUMN IF NOT EXISTS "rfc" varchar(20);
ALTER TABLE "negocios" ADD COLUMN IF NOT EXISTS "direccion" text;
ALTER TABLE "negocios" ADD COLUMN IF NOT EXISTS "telefono" varchar(30);

CREATE TABLE IF NOT EXISTS "cotizaciones" (
  "id" serial PRIMARY KEY NOT NULL,
  "negocio_id" integer NOT NULL REFERENCES "negocios"("id"),
  "folio" varchar(20) NOT NULL,
  "folio_externo" varchar(30),
  "cliente_nombre" varchar(255) NOT NULL,
  "cliente_rfc" varchar(20),
  "cliente_direccion" text,
  "fecha" date NOT NULL,
  "estado" "estado_cotizacion" DEFAULT 'BORRADOR' NOT NULL,
  "numero_oc" varchar(50),
  "numero_factura" varchar(50),
  "cuenta_banco_id" integer REFERENCES "cuentas_banco"("id"),
  "categoria_id" integer REFERENCES "categorias"("id"),
  "fecha_aprobacion" timestamp,
  "fecha_facturacion" timestamp,
  "movimiento_id" integer REFERENCES "movimientos"("id"),
  "subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
  "iva" numeric(15, 2) DEFAULT '0' NOT NULL,
  "total" numeric(15, 2) DEFAULT '0' NOT NULL,
  "notas" text,
  "creado_por" integer NOT NULL REFERENCES "usuarios"("id"),
  "aprobado_por" integer REFERENCES "usuarios"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "cotizacion_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "cotizacion_id" integer NOT NULL REFERENCES "cotizaciones"("id") ON DELETE cascade,
  "orden" integer NOT NULL,
  "descripcion" text NOT NULL,
  "cantidad" numeric(10, 4),
  "unidad_medida" varchar(50),
  "precio_unitario" numeric(15, 2),
  "importe" numeric(15, 2) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_cotizaciones_folio" ON "cotizaciones" USING btree ("folio");
CREATE INDEX IF NOT EXISTS "idx_cotizaciones_negocio_id" ON "cotizaciones" USING btree ("negocio_id");
CREATE INDEX IF NOT EXISTS "idx_cotizaciones_estado" ON "cotizaciones" USING btree ("estado");
CREATE INDEX IF NOT EXISTS "idx_cotizaciones_fecha" ON "cotizaciones" USING btree ("fecha");
CREATE INDEX IF NOT EXISTS "idx_cotizaciones_creado_por" ON "cotizaciones" USING btree ("creado_por");
CREATE INDEX IF NOT EXISTS "idx_cotizacion_items_cotizacion_id" ON "cotizacion_items" USING btree ("cotizacion_id");
