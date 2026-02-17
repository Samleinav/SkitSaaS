ALTER TABLE "users" ADD COLUMN "account_status" varchar(20) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status_reason" text;