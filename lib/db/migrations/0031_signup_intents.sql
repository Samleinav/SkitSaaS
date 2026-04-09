CREATE TABLE "signup_intents" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" varchar(255) NOT NULL,
  "password_hash" text NOT NULL,
  "status" varchar(30) DEFAULT 'pending' NOT NULL,
  "target_scope" varchar(20) NOT NULL,
  "subscription_template_id" integer NOT NULL,
  "checkout_order_id" integer,
  "created_user_id" integer,
  "created_team_id" integer,
  "finalized_at" timestamp,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "signup_intents_status_chk" CHECK ("signup_intents"."status" in ('pending', 'completed', 'failed', 'expired', 'canceled')),
  CONSTRAINT "signup_intents_target_scope_chk" CHECK ("signup_intents"."target_scope" in ('user', 'organization'))
);
--> statement-breakpoint
ALTER TABLE "signup_intents" ADD CONSTRAINT "signup_intents_subscription_template_id_subscription_templates_id_fk"
FOREIGN KEY ("subscription_template_id") REFERENCES "public"."subscription_templates"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "signup_intents" ADD CONSTRAINT "signup_intents_checkout_order_id_checkout_orders_id_fk"
FOREIGN KEY ("checkout_order_id") REFERENCES "public"."checkout_orders"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "signup_intents" ADD CONSTRAINT "signup_intents_created_user_id_users_id_fk"
FOREIGN KEY ("created_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "signup_intents" ADD CONSTRAINT "signup_intents_created_team_id_teams_id_fk"
FOREIGN KEY ("created_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "signup_intents_email_status_idx" ON "signup_intents" USING btree ("email","status");
--> statement-breakpoint
CREATE UNIQUE INDEX "signup_intents_checkout_order_id_idx" ON "signup_intents" USING btree ("checkout_order_id") WHERE "signup_intents"."checkout_order_id" is not null;
--> statement-breakpoint
CREATE INDEX "signup_intents_created_user_id_idx" ON "signup_intents" USING btree ("created_user_id");
--> statement-breakpoint
CREATE INDEX "signup_intents_created_team_id_idx" ON "signup_intents" USING btree ("created_team_id");
--> statement-breakpoint
CREATE INDEX "signup_intents_template_id_idx" ON "signup_intents" USING btree ("subscription_template_id");
--> statement-breakpoint
CREATE INDEX "signup_intents_status_expires_idx" ON "signup_intents" USING btree ("status","expires_at");
