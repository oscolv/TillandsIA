ALTER TABLE "observations" ADD COLUMN "image_hash" text;--> statement-breakpoint
ALTER TABLE "observations" ADD COLUMN "human_review_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "observations" ADD COLUMN "human_level" smallint;--> statement-breakpoint
ALTER TABLE "observations" ADD COLUMN "reviewer_notes" text;--> statement-breakpoint
ALTER TABLE "observations" ADD COLUMN "training_split" text;--> statement-breakpoint
CREATE INDEX "observations_image_hash_idx" ON "observations" USING btree ("image_hash");--> statement-breakpoint
CREATE INDEX "observations_review_idx" ON "observations" USING btree ("human_review_status","created_at" DESC NULLS LAST);
