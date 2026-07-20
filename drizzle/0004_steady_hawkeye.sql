CREATE TABLE "oidc_login_state" (
	"state_hash" text PRIMARY KEY NOT NULL,
	"id_token_hint" text NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'admin';--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "last_active_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "id_token_hint" text;--> statement-breakpoint
DELETE FROM "session"
USING "user"
WHERE "session"."user_id" = "user"."id"
	AND "user"."role" <> 'demo';--> statement-breakpoint
UPDATE "session"
SET
	"last_active_at" = "updated_at",
	"expires_at" = LEAST(
		"expires_at",
		"updated_at" + interval '24 hours',
		"created_at" + interval '7 days'
	);--> statement-breakpoint
UPDATE "user" SET "role" = 'admin' WHERE "role" <> 'demo';--> statement-breakpoint
DELETE FROM "account" WHERE "provider_id" = 'credential';--> statement-breakpoint
UPDATE "account"
SET
	"access_token" = NULL,
	"refresh_token" = NULL,
	"id_token" = NULL,
	"access_token_expires_at" = NULL,
	"refresh_token_expires_at" = NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_idx" ON "account" USING btree ("provider_id","account_id");
