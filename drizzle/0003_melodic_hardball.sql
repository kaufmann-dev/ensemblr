ALTER TABLE "app_setting" ADD COLUMN "demo_rate_limit_window_minutes" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "app_setting" ADD COLUMN "demo_rate_limit_per_ip" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "app_setting" ADD COLUMN "demo_rate_limit_global" integer DEFAULT 25 NOT NULL;