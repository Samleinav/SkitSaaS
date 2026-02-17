DROP INDEX "subscription_templates_name_provider_interval_idx";--> statement-breakpoint
CREATE INDEX "subscription_templates_name_interval_idx" ON "subscription_templates" USING btree ("name","billing_interval");--> statement-breakpoint
ALTER TABLE "subscription_templates" DROP COLUMN "payment_provider";--> statement-breakpoint
ALTER TABLE "subscription_templates" DROP COLUMN "provider_plan_id";
