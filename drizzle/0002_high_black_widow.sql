CREATE TABLE "demo_generation_rate_limit" (
	"scope" text NOT NULL,
	"identifier" text NOT NULL,
	"window_start" timestamp NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "demo_generation_rate_limit_scope_identifier_window_start_pk" PRIMARY KEY("scope","identifier","window_start")
);
--> statement-breakpoint
CREATE INDEX "demo_generation_rate_limit_window_idx" ON "demo_generation_rate_limit" USING btree ("window_start");