-- Migra `observations` de una sola foto (`photo_url TEXT`, `image_hash TEXT`)
-- a 1-3 fotos del mismo árbol (`photo_urls TEXT[]`, `image_hashes TEXT[]`).
--
-- Las observaciones legacy quedan con arrays de longitud 1; el código nuevo
-- debe iterar siempre, sin asumir 1.
--
-- Cross-ref a classification_events sigue funcionando: ahora se hace con
-- `classification_events.image_hash = ANY(observations.image_hashes)`, sobre
-- el nuevo índice GIN.

-- 1) photo_url -> photo_urls
ALTER TABLE "observations"
  ADD COLUMN "photo_urls" text[] NOT NULL DEFAULT ARRAY[]::text[];
--> statement-breakpoint
UPDATE "observations" SET "photo_urls" = ARRAY["photo_url"];
--> statement-breakpoint
ALTER TABLE "observations" ALTER COLUMN "photo_urls" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "observations" DROP COLUMN "photo_url";
--> statement-breakpoint

-- 2) image_hash -> image_hashes (nullable, paralelo 1:1 con photo_urls)
ALTER TABLE "observations" ADD COLUMN "image_hashes" text[];
--> statement-breakpoint
UPDATE "observations"
  SET "image_hashes" = ARRAY["image_hash"]
  WHERE "image_hash" IS NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS "observations_image_hash_idx";
--> statement-breakpoint
ALTER TABLE "observations" DROP COLUMN "image_hash";
--> statement-breakpoint
CREATE INDEX "observations_image_hashes_gin" ON "observations" USING gin ("image_hashes");
