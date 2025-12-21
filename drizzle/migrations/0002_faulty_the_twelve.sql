ALTER TABLE "change_logs" ADD COLUMN "user_ip" varchar(100);--> statement-breakpoint
ALTER TABLE "change_logs" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "change_logs" ADD COLUMN "referer" text;