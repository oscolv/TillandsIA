CREATE TABLE "observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"accuracy" double precision,
	"municipality" text,
	"photo_url" text NOT NULL,
	"level" smallint NOT NULL,
	"label" text NOT NULL,
	"confidence" double precision,
	"tree_species" text,
	"tree_species_common" text,
	"ai_notes" text,
	"infestation_active" boolean,
	"branch_dieback" boolean,
	"photo_angle" text,
	"season_window" boolean DEFAULT false NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL,
	"flag_reasons" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"classifier_version" text NOT NULL,
	"model_version" text NOT NULL,
	"ip_hash" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "observations_lat_lng_idx" ON "observations" USING btree ("lat","lng");--> statement-breakpoint
CREATE INDEX "observations_created_at_idx" ON "observations" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "observations_level_idx" ON "observations" USING btree ("level","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "observations_flagged_idx" ON "observations" USING btree ("flagged") WHERE "observations"."flagged" = true;