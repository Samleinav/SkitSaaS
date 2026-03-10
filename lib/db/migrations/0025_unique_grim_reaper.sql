CREATE TABLE "auth_external_identities" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"provider_id" varchar(80) NOT NULL,
	"provider_subject" varchar(255) NOT NULL,
	"provider_email" varchar(255),
	"provider_account_id" varchar(255),
	"display_name" varchar(255),
	"avatar_url" text,
	"claims" text,
	"metadata" text,
	"linked_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(120) NOT NULL,
	"token_jti" varchar(120) NOT NULL,
	"user_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"revoked_reason" text,
	"last_seen_at" timestamp,
	"last_ip_address" varchar(45),
	"user_agent" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_status_chk" CHECK ("auth_sessions"."status" in ('active', 'revoked', 'expired'))
);
--> statement-breakpoint
CREATE TABLE "checkout_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"checkout_order_id" integer NOT NULL,
	"line_order" integer DEFAULT 0 NOT NULL,
	"item_type" varchar(30) DEFAULT 'one_time_product' NOT NULL,
	"product_id" integer,
	"product_key" varchar(160),
	"name" varchar(160) NOT NULL,
	"description" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_amount" integer NOT NULL,
	"total_amount" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "checkout_order_items_item_type_chk" CHECK ("checkout_order_items"."item_type" in ('one_time_product')),
	CONSTRAINT "checkout_order_items_quantity_chk" CHECK ("checkout_order_items"."quantity" > 0),
	CONSTRAINT "checkout_order_items_unit_amount_chk" CHECK ("checkout_order_items"."unit_amount" >= 0),
	CONSTRAINT "checkout_order_items_total_amount_chk" CHECK ("checkout_order_items"."total_amount" >= 0),
	CONSTRAINT "checkout_order_items_currency_chk" CHECK (char_length("checkout_order_items"."currency") between 3 and 10)
);
--> statement-breakpoint
CREATE TABLE "checkout_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"checkout_token" varchar(80) NOT NULL,
	"idempotency_key" varchar(120),
	"order_type" varchar(20) DEFAULT 'subscription' NOT NULL,
	"status" varchar(30) DEFAULT 'ready' NOT NULL,
	"source" varchar(30) DEFAULT 'pricing' NOT NULL,
	"module_id" varchar(120),
	"team_id" integer,
	"target_type" varchar(20),
	"target_team_id" integer,
	"target_user_id" integer,
	"subscription_template_id" integer,
	"selected_provider" varchar(30),
	"selected_payment_method" varchar(60),
	"provider_session_id" text,
	"provider_reference_id" text,
	"amount" integer,
	"currency" varchar(10),
	"plan_name" varchar(100),
	"metadata" text,
	"expires_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"canceled_at" timestamp,
	"failed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "checkout_orders_order_type_chk" CHECK ("checkout_orders"."order_type" in ('subscription', 'one_time')),
	CONSTRAINT "checkout_orders_status_chk" CHECK ("checkout_orders"."status" in ('draft', 'ready', 'provider_pending', 'completed', 'canceled', 'failed', 'expired')),
	CONSTRAINT "checkout_orders_target_type_chk" CHECK ("checkout_orders"."target_type" is null or "checkout_orders"."target_type" in ('team', 'user')),
	CONSTRAINT "checkout_orders_target_integrity_chk" CHECK ((
        ("checkout_orders"."target_type" is null and "checkout_orders"."target_team_id" is null and "checkout_orders"."target_user_id" is null) or
        ("checkout_orders"."target_type" = 'team' and "checkout_orders"."target_team_id" is not null and "checkout_orders"."target_user_id" is null) or
        ("checkout_orders"."target_type" = 'user' and "checkout_orders"."target_user_id" is not null and "checkout_orders"."target_team_id" is null)
      ))
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sfiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"path" text NOT NULL,
	"folder" varchar(1024) DEFAULT '/' NOT NULL,
	"mime_type" varchar(128) DEFAULT 'application/octet-stream' NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"backend" varchar(16) DEFAULT 'local' NOT NULL,
	"bucket" varchar(255),
	"etag" varchar(255),
	"owner_id" integer,
	"visibility" varchar(32) DEFAULT 'private' NOT NULL,
	"metadata" json,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sfiles_backend_chk" CHECK ("sfiles"."backend" in ('local', 's3')),
	CONSTRAINT "sfiles_visibility_chk" CHECK ("sfiles"."visibility" in ('private', 'users', 'authenticated', 'public', 'admin'))
);
--> statement-breakpoint
CREATE TABLE "sfiles_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
);
--> statement-breakpoint
ALTER TABLE "subscription_templates" ADD COLUMN "category_key" varchar(120) DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_templates" ADD COLUMN "hierarchy_rank" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_templates" ADD COLUMN "paypal_plan_id_no_trial" text;--> statement-breakpoint
ALTER TABLE "subscription_templates" ADD COLUMN "paypal_plan_fingerprint_no_trial" text;--> statement-breakpoint
ALTER TABLE "auth_external_identities" ADD CONSTRAINT "auth_external_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_order_items" ADD CONSTRAINT "checkout_order_items_checkout_order_id_checkout_orders_id_fk" FOREIGN KEY ("checkout_order_id") REFERENCES "public"."checkout_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_orders" ADD CONSTRAINT "checkout_orders_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_orders" ADD CONSTRAINT "checkout_orders_target_team_id_teams_id_fk" FOREIGN KEY ("target_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_orders" ADD CONSTRAINT "checkout_orders_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_orders" ADD CONSTRAINT "checkout_orders_subscription_template_id_subscription_templates_id_fk" FOREIGN KEY ("subscription_template_id") REFERENCES "public"."subscription_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sfiles" ADD CONSTRAINT "sfiles_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sfiles_permissions" ADD CONSTRAINT "sfiles_permissions_file_id_sfiles_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."sfiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sfiles_permissions" ADD CONSTRAINT "sfiles_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_trial_usage" ADD CONSTRAINT "subscription_trial_usage_target_team_id_teams_id_fk" FOREIGN KEY ("target_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_trial_usage" ADD CONSTRAINT "subscription_trial_usage_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_trial_usage" ADD CONSTRAINT "subscription_trial_usage_first_template_id_subscription_templates_id_fk" FOREIGN KEY ("first_template_id") REFERENCES "public"."subscription_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_trial_usage" ADD CONSTRAINT "subscription_trial_usage_first_order_id_payment_orders_id_fk" FOREIGN KEY ("first_order_id") REFERENCES "public"."payment_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_external_identities_provider_subject_idx" ON "auth_external_identities" USING btree ("provider_id","provider_subject");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_external_identities_user_provider_idx" ON "auth_external_identities" USING btree ("user_id","provider_id");--> statement-breakpoint
CREATE INDEX "auth_external_identities_user_idx" ON "auth_external_identities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_external_identities_provider_idx" ON "auth_external_identities" USING btree ("provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_session_id_idx" ON "auth_sessions" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_token_jti_idx" ON "auth_sessions" USING btree ("token_jti");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_status_idx" ON "auth_sessions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "checkout_order_items_checkout_order_idx" ON "checkout_order_items" USING btree ("checkout_order_id");--> statement-breakpoint
CREATE INDEX "checkout_order_items_checkout_order_line_order_idx" ON "checkout_order_items" USING btree ("checkout_order_id","line_order","id");--> statement-breakpoint
CREATE INDEX "checkout_order_items_product_idx" ON "checkout_order_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_orders_checkout_token_idx" ON "checkout_orders" USING btree ("checkout_token");--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_orders_idempotency_key_idx" ON "checkout_orders" USING btree ("idempotency_key") WHERE "checkout_orders"."idempotency_key" is not null;--> statement-breakpoint
CREATE INDEX "checkout_orders_status_expires_idx" ON "checkout_orders" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "checkout_orders_team_id_idx" ON "checkout_orders" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "checkout_orders_target_team_idx" ON "checkout_orders" USING btree ("target_type","target_team_id");--> statement-breakpoint
CREATE INDEX "checkout_orders_target_user_idx" ON "checkout_orders" USING btree ("target_type","target_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_orders_active_subscription_team_scope_idx" ON "checkout_orders" USING btree ("target_team_id","subscription_template_id") WHERE "checkout_orders"."order_type" = 'subscription' and "checkout_orders"."target_type" = 'team' and "checkout_orders"."target_team_id" is not null and "checkout_orders"."subscription_template_id" is not null and "checkout_orders"."status" in ('ready', 'provider_pending');--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_orders_active_subscription_user_scope_idx" ON "checkout_orders" USING btree ("target_user_id","subscription_template_id") WHERE "checkout_orders"."order_type" = 'subscription' and "checkout_orders"."target_type" = 'user' and "checkout_orders"."target_user_id" is not null and "checkout_orders"."subscription_template_id" is not null and "checkout_orders"."status" in ('ready', 'provider_pending');--> statement-breakpoint
CREATE INDEX "checkout_orders_provider_session_idx" ON "checkout_orders" USING btree ("selected_provider","provider_session_id");--> statement-breakpoint
CREATE INDEX "checkout_orders_provider_reference_idx" ON "checkout_orders" USING btree ("selected_provider","provider_reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_idx" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sfiles_folder_idx" ON "sfiles" USING btree ("folder");--> statement-breakpoint
CREATE INDEX "sfiles_name_idx" ON "sfiles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "sfiles_owner_idx" ON "sfiles" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "sfiles_deleted_at_idx" ON "sfiles" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sfiles_permissions_file_user_idx" ON "sfiles_permissions" USING btree ("file_id","user_id");--> statement-breakpoint
CREATE INDEX "sfiles_permissions_user_idx" ON "sfiles_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscription_trial_usage_target_team_idx" ON "subscription_trial_usage" USING btree ("target_type","target_team_id","category_key");--> statement-breakpoint
CREATE INDEX "subscription_trial_usage_target_user_idx" ON "subscription_trial_usage" USING btree ("target_type","target_user_id","category_key");--> statement-breakpoint
CREATE INDEX "subscription_trial_usage_consumed_at_idx" ON "subscription_trial_usage" USING btree ("consumed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_trial_usage_team_category_unique" ON "subscription_trial_usage" USING btree ("target_type","target_team_id","category_key") WHERE "subscription_trial_usage"."target_type" = 'team' and "subscription_trial_usage"."target_team_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_trial_usage_user_category_unique" ON "subscription_trial_usage" USING btree ("target_type","target_user_id","category_key") WHERE "subscription_trial_usage"."target_type" = 'user' and "subscription_trial_usage"."target_user_id" is not null;--> statement-breakpoint
CREATE INDEX "subscription_templates_scope_category_idx" ON "subscription_templates" USING btree ("target_scope","category_key");--> statement-breakpoint
CREATE INDEX "subscription_templates_category_rank_idx" ON "subscription_templates" USING btree ("category_key","hierarchy_rank");--> statement-breakpoint
ALTER TABLE "subscription_templates" ADD CONSTRAINT "subscription_templates_category_key_chk" CHECK (char_length(trim("subscription_templates"."category_key")) > 0);