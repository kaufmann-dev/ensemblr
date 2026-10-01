DROP TABLE "oidc_login_state" CASCADE;--> statement-breakpoint
ALTER TABLE "session" DROP COLUMN "id_token_hint";