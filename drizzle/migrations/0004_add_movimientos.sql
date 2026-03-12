CREATE TABLE "movimientos" (
	"id" serial PRIMARY KEY NOT NULL,
	"negocio_id" integer NOT NULL,
	"centro_costo_id" integer,
	"tipo" "tipo_movimiento" NOT NULL,
	"fecha" date NOT NULL,
	"concepto" text NOT NULL,
	"tercero" varchar(150),
	"monto" numeric(15, 2) NOT NULL,
	"cuenta_banco_id" integer NOT NULL,
	"traspaso_ref_id" integer,
	"estado" "estado_movimiento" DEFAULT 'PENDIENTE' NOT NULL,
	"creado_por" integer NOT NULL,
	"aprobado_por" integer,
	"fecha_aprobacion" timestamp,
	"motivo_rechazo" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_negocio_id_negocios_id_fk" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_centro_costo_id_centros_costo_id_fk" FOREIGN KEY ("centro_costo_id") REFERENCES "public"."centros_costo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_cuenta_banco_id_cuentas_banco_id_fk" FOREIGN KEY ("cuenta_banco_id") REFERENCES "public"."cuentas_banco"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_aprobado_por_usuarios_id_fk" FOREIGN KEY ("aprobado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_traspaso_ref_id_movimientos_id_fk" FOREIGN KEY ("traspaso_ref_id") REFERENCES "public"."movimientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_movimientos_negocio_id" ON "movimientos" USING btree ("negocio_id");--> statement-breakpoint
CREATE INDEX "idx_movimientos_fecha" ON "movimientos" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "idx_movimientos_tipo" ON "movimientos" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX "idx_movimientos_estado" ON "movimientos" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "idx_movimientos_cuenta_banco" ON "movimientos" USING btree ("cuenta_banco_id");--> statement-breakpoint
CREATE INDEX "idx_movimientos_creado_por" ON "movimientos" USING btree ("creado_por");--> statement-breakpoint
CREATE INDEX "idx_movimientos_aprobado_por" ON "movimientos" USING btree ("aprobado_por");--> statement-breakpoint
CREATE INDEX "idx_movimientos_traspaso_ref" ON "movimientos" USING btree ("traspaso_ref_id");
