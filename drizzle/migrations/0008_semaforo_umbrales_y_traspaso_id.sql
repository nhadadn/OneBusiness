ALTER TABLE "negocios" ADD COLUMN "umbral_alerta" numeric(12, 2);
ALTER TABLE "negocios" ADD COLUMN "umbral_critico" numeric(12, 2);

ALTER TABLE "movimientos" RENAME COLUMN "traspaso_ref_id" TO "traspaso_id";
ALTER INDEX "idx_movimientos_traspaso_ref" RENAME TO "idx_movimientos_traspaso_id";
ALTER TABLE "movimientos" RENAME CONSTRAINT "movimientos_traspaso_ref_id_movimientos_id_fk" TO "movimientos_traspaso_id_movimientos_id_fk";
