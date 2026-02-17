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
ALTER TABLE "checkout_orders" ADD CONSTRAINT "checkout_orders_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_orders" ADD CONSTRAINT "checkout_orders_target_team_id_teams_id_fk" FOREIGN KEY ("target_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_orders" ADD CONSTRAINT "checkout_orders_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_orders" ADD CONSTRAINT "checkout_orders_subscription_template_id_subscription_templates_id_fk" FOREIGN KEY ("subscription_template_id") REFERENCES "public"."subscription_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_orders_checkout_token_idx" ON "checkout_orders" USING btree ("checkout_token");--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_orders_idempotency_key_idx" ON "checkout_orders" USING btree ("idempotency_key") WHERE "checkout_orders"."idempotency_key" is not null;--> statement-breakpoint
CREATE INDEX "checkout_orders_status_expires_idx" ON "checkout_orders" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "checkout_orders_team_id_idx" ON "checkout_orders" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "checkout_orders_target_team_idx" ON "checkout_orders" USING btree ("target_type","target_team_id");--> statement-breakpoint
CREATE INDEX "checkout_orders_target_user_idx" ON "checkout_orders" USING btree ("target_type","target_user_id");--> statement-breakpoint
CREATE INDEX "checkout_orders_provider_session_idx" ON "checkout_orders" USING btree ("selected_provider","provider_session_id");--> statement-breakpoint
CREATE INDEX "checkout_orders_provider_reference_idx" ON "checkout_orders" USING btree ("selected_provider","provider_reference_id");
