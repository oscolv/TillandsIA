CREATE TABLE "classification_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"outcome" text NOT NULL,
	"confidence" double precision,
	"ip_hash" text NOT NULL,
	"image_hash" text,
	"classifier_version" text NOT NULL,
	"model_version" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "classification_events_created_at_idx" ON "classification_events" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "classification_events_outcome_idx" ON "classification_events" USING btree ("outcome","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "classification_events_image_hash_idx" ON "classification_events" USING btree ("image_hash");