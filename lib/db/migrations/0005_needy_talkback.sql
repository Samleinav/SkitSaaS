ALTER TABLE "subscription_template_features" ALTER COLUMN "feature_value" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_template_features" ADD COLUMN "feature_label" varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_template_features" ADD COLUMN "value_type" varchar(20) DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_template_features" ADD COLUMN "value_label" text;--> statement-breakpoint
ALTER TABLE "subscription_template_features" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;