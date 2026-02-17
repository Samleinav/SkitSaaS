ALTER TABLE "subscription_templates"
ADD COLUMN "category_key" varchar(120);--> statement-breakpoint
ALTER TABLE "subscription_templates"
ADD COLUMN "hierarchy_rank" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_templates"
ADD COLUMN "paypal_plan_id_no_trial" text;--> statement-breakpoint
ALTER TABLE "subscription_templates"
ADD COLUMN "paypal_plan_fingerprint_no_trial" text;--> statement-breakpoint
UPDATE "subscription_templates"
SET "category_key" = concat('legacy.template.', "id")
WHERE "category_key" is null OR char_length(trim("category_key")) = 0;--> statement-breakpoint
ALTER TABLE "subscription_templates"
ALTER COLUMN "category_key" SET DEFAULT 'legacy';--> statement-breakpoint
ALTER TABLE "subscription_templates"
ALTER COLUMN "category_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_templates"
ADD CONSTRAINT "subscription_templates_category_key_chk" CHECK (char_length(trim("subscription_templates"."category_key")) > 0);--> statement-breakpoint
CREATE INDEX "subscription_templates_scope_category_idx" ON "subscription_templates" USING btree ("target_scope","category_key");--> statement-breakpoint
CREATE INDEX "subscription_templates_category_rank_idx" ON "subscription_templates" USING btree ("category_key","hierarchy_rank");--> statement-breakpoint
CREATE TABLE "subscription_trial_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_type" varchar(20) NOT NULL,
	"target_team_id" integer,
	"target_user_id" integer,
	"category_key" varchar(120) NOT NULL,
	"first_template_id" integer,
	"first_order_id" integer,
	"consumed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_trial_usage_target_type_chk" CHECK ("subscription_trial_usage"."target_type" in ('team', 'user')),
	CONSTRAINT "subscription_trial_usage_target_integrity_chk" CHECK ((
		("subscription_trial_usage"."target_type" = 'team' and "subscription_trial_usage"."target_team_id" is not null and "subscription_trial_usage"."target_user_id" is null) or
		("subscription_trial_usage"."target_type" = 'user' and "subscription_trial_usage"."target_user_id" is not null and "subscription_trial_usage"."target_team_id" is null)
	)),
	CONSTRAINT "subscription_trial_usage_category_key_chk" CHECK (char_length(trim("subscription_trial_usage"."category_key")) > 0)
);--> statement-breakpoint
ALTER TABLE "subscription_trial_usage" ADD CONSTRAINT "subscription_trial_usage_target_team_id_teams_id_fk" FOREIGN KEY ("target_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_trial_usage" ADD CONSTRAINT "subscription_trial_usage_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_trial_usage" ADD CONSTRAINT "subscription_trial_usage_first_template_id_subscription_templates_id_fk" FOREIGN KEY ("first_template_id") REFERENCES "public"."subscription_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_trial_usage" ADD CONSTRAINT "subscription_trial_usage_first_order_id_payment_orders_id_fk" FOREIGN KEY ("first_order_id") REFERENCES "public"."payment_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_trial_usage_target_team_idx" ON "subscription_trial_usage" USING btree ("target_type","target_team_id","category_key");--> statement-breakpoint
CREATE INDEX "subscription_trial_usage_target_user_idx" ON "subscription_trial_usage" USING btree ("target_type","target_user_id","category_key");--> statement-breakpoint
CREATE INDEX "subscription_trial_usage_consumed_at_idx" ON "subscription_trial_usage" USING btree ("consumed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_trial_usage_team_category_unique" ON "subscription_trial_usage" USING btree ("target_type","target_team_id","category_key") WHERE "subscription_trial_usage"."target_type" = 'team' and "subscription_trial_usage"."target_team_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_trial_usage_user_category_unique" ON "subscription_trial_usage" USING btree ("target_type","target_user_id","category_key") WHERE "subscription_trial_usage"."target_type" = 'user' and "subscription_trial_usage"."target_user_id" is not null;
