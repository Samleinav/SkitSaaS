CREATE TABLE "app_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"namespace" varchar(120) NOT NULL,
	"config_key" varchar(120) NOT NULL,
	"config_value" text NOT NULL,
	"is_secret" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"module_id" varchar(120) NOT NULL,
	"version" varchar(50) DEFAULT '0.0.0' NOT NULL,
	"status" varchar(20) DEFAULT 'installed' NOT NULL,
	"install_mode" varchar(20) DEFAULT 'core' NOT NULL,
	"installed_at" timestamp,
	"enabled_at" timestamp,
	"disabled_at" timestamp,
	"uninstalled_at" timestamp,
	"last_error" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_modules_status_chk" CHECK ("app_modules"."status" in ('installed', 'enabled', 'disabled', 'uninstalled')),
	CONSTRAINT "app_modules_install_mode_chk" CHECK ("app_modules"."install_mode" in ('core', 'plugin'))
);
--> statement-breakpoint
CREATE TABLE "app_themes" (
	"id" serial PRIMARY KEY NOT NULL,
	"theme_key" varchar(120) NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"area" varchar(20) NOT NULL,
	"tokens" text NOT NULL,
	"is_builtin" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_themes_area_chk" CHECK ("app_themes"."area" in ('admin', 'dashboard', 'public', 'global'))
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer,
	"provider" varchar(30) NOT NULL,
	"transaction_type" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"amount" integer,
	"currency" varchar(10),
	"external_transaction_id" text,
	"provider_event_id" text,
	"dedupe_key" text,
	"external_invoice_id" text,
	"payload" text,
	"metadata" text,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_transactions_type_chk" CHECK ("payment_transactions"."transaction_type" in ('authorization', 'capture', 'sale', 'refund', 'chargeback', 'fee')),
	CONSTRAINT "payment_transactions_status_chk" CHECK ("payment_transactions"."status" in ('pending', 'succeeded', 'failed', 'reversed'))
);
--> statement-breakpoint
CREATE TABLE "subscription_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_type" varchar(20) NOT NULL,
	"target_team_id" integer,
	"target_user_id" integer,
	"subscription_template_id" integer NOT NULL,
	"payment_provider" varchar(20),
	"provider_reference_id" text,
	"provider_plan_id" text,
	"status" varchar(20) DEFAULT 'free' NOT NULL,
	"plan_name" varchar(100),
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_to" timestamp,
	"source_order_id" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_assignments_target_integrity_chk" CHECK ((
        ("subscription_assignments"."target_type" = 'team' and "subscription_assignments"."target_team_id" is not null and "subscription_assignments"."target_user_id" is null) or
        ("subscription_assignments"."target_type" = 'user' and "subscription_assignments"."target_user_id" is not null and "subscription_assignments"."target_team_id" is null)
      )),
	CONSTRAINT "subscription_assignments_status_chk" CHECK ("subscription_assignments"."status" in ('free', 'trialing', 'active', 'unpaid', 'canceled'))
);
--> statement-breakpoint
CREATE TABLE "user_theme_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"area" varchar(20) NOT NULL,
	"theme_key" varchar(120) NOT NULL,
	"mode" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_theme_preferences_area_chk" CHECK ("user_theme_preferences"."area" in ('admin', 'dashboard', 'global')),
	CONSTRAINT "user_theme_preferences_mode_chk" CHECK ("user_theme_preferences"."mode" is null or "user_theme_preferences"."mode" in ('system', 'light', 'dark'))
);
--> statement-breakpoint
ALTER TABLE "payment_orders" ADD COLUMN "order_type" varchar(20) DEFAULT 'subscription' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD COLUMN "module_id" varchar(120);--> statement-breakpoint
ALTER TABLE "payment_orders" ADD COLUMN "target_type" varchar(20);--> statement-breakpoint
ALTER TABLE "payment_orders" ADD COLUMN "target_team_id" integer;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD COLUMN "target_user_id" integer;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_payment_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."payment_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_assignments" ADD CONSTRAINT "subscription_assignments_target_team_id_teams_id_fk" FOREIGN KEY ("target_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_assignments" ADD CONSTRAINT "subscription_assignments_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_assignments" ADD CONSTRAINT "subscription_assignments_subscription_template_id_subscription_templates_id_fk" FOREIGN KEY ("subscription_template_id") REFERENCES "public"."subscription_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_assignments" ADD CONSTRAINT "subscription_assignments_source_order_id_payment_orders_id_fk" FOREIGN KEY ("source_order_id") REFERENCES "public"."payment_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_theme_preferences" ADD CONSTRAINT "user_theme_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "app_configs_namespace_key_idx" ON "app_configs" USING btree ("namespace","config_key");--> statement-breakpoint
CREATE INDEX "app_configs_namespace_idx" ON "app_configs" USING btree ("namespace");--> statement-breakpoint
CREATE UNIQUE INDEX "app_modules_module_id_idx" ON "app_modules" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "app_modules_status_idx" ON "app_modules" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "app_themes_area_key_idx" ON "app_themes" USING btree ("area","theme_key");--> statement-breakpoint
CREATE UNIQUE INDEX "app_themes_active_area_idx" ON "app_themes" USING btree ("area") WHERE "app_themes"."is_active" = true;--> statement-breakpoint
CREATE INDEX "app_themes_area_active_idx" ON "app_themes" USING btree ("area","is_active");--> statement-breakpoint
CREATE INDEX "payment_transactions_order_id_idx" ON "payment_transactions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payment_transactions_status_occurred_idx" ON "payment_transactions" USING btree ("status","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_transactions_provider_external_tx_idx" ON "payment_transactions" USING btree ("provider","external_transaction_id") WHERE "payment_transactions"."external_transaction_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_transactions_provider_event_idx" ON "payment_transactions" USING btree ("provider","provider_event_id") WHERE "payment_transactions"."provider_event_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_transactions_provider_dedupe_idx" ON "payment_transactions" USING btree ("provider","dedupe_key") WHERE "payment_transactions"."dedupe_key" is not null;--> statement-breakpoint
CREATE INDEX "subscription_assignments_target_team_idx" ON "subscription_assignments" USING btree ("target_type","target_team_id");--> statement-breakpoint
CREATE INDEX "subscription_assignments_target_user_idx" ON "subscription_assignments" USING btree ("target_type","target_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_assignments_active_team_idx" ON "subscription_assignments" USING btree ("target_type","target_team_id") WHERE "subscription_assignments"."target_type" = 'team' and "subscription_assignments"."effective_to" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_assignments_active_user_idx" ON "subscription_assignments" USING btree ("target_type","target_user_id") WHERE "subscription_assignments"."target_type" = 'user' and "subscription_assignments"."effective_to" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "user_theme_preferences_user_area_idx" ON "user_theme_preferences" USING btree ("user_id","area");--> statement-breakpoint
CREATE INDEX "user_theme_preferences_area_theme_idx" ON "user_theme_preferences" USING btree ("area","theme_key");--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_target_team_id_teams_id_fk" FOREIGN KEY ("target_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_orders_target_team_idx" ON "payment_orders" USING btree ("target_type","target_team_id");--> statement-breakpoint
CREATE INDEX "payment_orders_target_user_idx" ON "payment_orders" USING btree ("target_type","target_user_id");--> statement-breakpoint
CREATE INDEX "payment_orders_type_status_created_idx" ON "payment_orders" USING btree ("order_type","status","created_at");--> statement-breakpoint
CREATE INDEX "payment_orders_module_created_at_idx" ON "payment_orders" USING btree ("module_id","created_at");--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_order_type_chk" CHECK ("payment_orders"."order_type" in ('subscription', 'one_time'));--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_target_type_chk" CHECK ("payment_orders"."target_type" is null or "payment_orders"."target_type" in ('team', 'user'));--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_target_integrity_chk" CHECK ((
        ("payment_orders"."target_type" is null and "payment_orders"."target_team_id" is null and "payment_orders"."target_user_id" is null) or
        ("payment_orders"."target_type" = 'team' and "payment_orders"."target_team_id" is not null and "payment_orders"."target_user_id" is null) or
        ("payment_orders"."target_type" = 'user' and "payment_orders"."target_user_id" is not null and "payment_orders"."target_team_id" is null)
      ));