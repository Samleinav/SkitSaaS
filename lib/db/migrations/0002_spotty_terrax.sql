CREATE TABLE "payment_provider_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(30) NOT NULL,
	"config_key" varchar(120) NOT NULL,
	"config_value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_template_features" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"feature_key" varchar(100) NOT NULL,
	"feature_value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"payment_provider" varchar(30) DEFAULT 'none' NOT NULL,
	"provider_plan_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "provider_plan_id" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "subscription_template_id" integer;--> statement-breakpoint
ALTER TABLE "subscription_template_features" ADD CONSTRAINT "subscription_template_features_template_id_subscription_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."subscription_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_provider_configs_provider_key_idx" ON "payment_provider_configs" USING btree ("provider","config_key");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_template_features_template_key_idx" ON "subscription_template_features" USING btree ("template_id","feature_key");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_templates_name_provider_idx" ON "subscription_templates" USING btree ("name","payment_provider");