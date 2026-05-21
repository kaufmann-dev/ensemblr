ALTER TABLE "generation" ADD COLUMN "demo_session_id" text;--> statement-breakpoint
DELETE FROM "generation"
USING "user"
WHERE "generation"."user_id" = "user"."id"
	AND "user"."role" = 'demo';--> statement-breakpoint
CREATE INDEX "generation_user_demo_session_created_idx" ON "generation" USING btree ("user_id","demo_session_id","created_at");
