ALTER TABLE "dual_write_replay_queue" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payment_provider_configs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "dual_write_replay_queue" CASCADE;--> statement-breakpoint
DROP TABLE "payment_provider_configs" CASCADE;--> statement-breakpoint
ALTER TABLE "teams" DROP CONSTRAINT "teams_stripe_subscription_id_unique";--> statement-breakpoint
ALTER TABLE "teams" DROP CONSTRAINT "teams_paypal_subscription_id_unique";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "payment_provider";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "provider_plan_id";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "stripe_subscription_id";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "paypal_subscription_id";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "paypal_plan_id";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "subscription_template_id";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "plan_name";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "subscription_status";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "subscription_template_id";