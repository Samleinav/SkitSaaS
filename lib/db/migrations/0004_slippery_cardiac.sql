DROP INDEX "subscription_templates_name_provider_idx";--> statement-breakpoint
ALTER TABLE "subscription_templates" ADD COLUMN "billing_interval" varchar(20) DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_templates" ADD COLUMN "price_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_templates" ADD COLUMN "compare_at_price_cents" integer;--> statement-breakpoint
ALTER TABLE "subscription_templates" ADD COLUMN "currency" varchar(10) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_templates" ADD COLUMN "trial_period_days" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_templates_name_provider_interval_idx" ON "subscription_templates" USING btree ("name","payment_provider","billing_interval");