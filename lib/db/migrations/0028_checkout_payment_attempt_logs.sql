CREATE TABLE "checkout_payment_attempt_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"checkout_order_id" integer,
	"checkout_token" varchar(120),
	"payment_method_id" varchar(60) NOT NULL,
	"provider" varchar(30) NOT NULL,
	"owner_type" varchar(20) DEFAULT 'unknown' NOT NULL,
	"module_id" varchar(120),
	"order_type" varchar(20),
	"source" varchar(30) DEFAULT 'system' NOT NULL,
	"event_type" varchar(60) NOT NULL,
	"status" varchar(20) DEFAULT 'info' NOT NULL,
	"team_id" integer,
	"target_type" varchar(20),
	"target_team_id" integer,
	"target_user_id" integer,
	"provider_session_id" text,
	"provider_reference_id" text,
	"external_order_id" text,
	"external_payment_id" text,
	"message" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "checkout_payment_attempt_logs_owner_type_chk" CHECK ("checkout_payment_attempt_logs"."owner_type" in ('core', 'module', 'unknown')),
	CONSTRAINT "checkout_payment_attempt_logs_order_type_chk" CHECK ("checkout_payment_attempt_logs"."order_type" is null or "checkout_payment_attempt_logs"."order_type" in ('subscription', 'one_time')),
	CONSTRAINT "checkout_payment_attempt_logs_target_type_chk" CHECK ("checkout_payment_attempt_logs"."target_type" is null or "checkout_payment_attempt_logs"."target_type" in ('team', 'user')),
	CONSTRAINT "checkout_payment_attempt_logs_target_integrity_chk" CHECK ((
		("checkout_payment_attempt_logs"."target_type" is null and "checkout_payment_attempt_logs"."target_team_id" is null and "checkout_payment_attempt_logs"."target_user_id" is null) or
		("checkout_payment_attempt_logs"."target_type" = 'team' and "checkout_payment_attempt_logs"."target_team_id" is not null and "checkout_payment_attempt_logs"."target_user_id" is null) or
		("checkout_payment_attempt_logs"."target_type" = 'user' and "checkout_payment_attempt_logs"."target_user_id" is not null and "checkout_payment_attempt_logs"."target_team_id" is null)
	))
);
--> statement-breakpoint
ALTER TABLE "checkout_payment_attempt_logs" ADD CONSTRAINT "checkout_payment_attempt_logs_checkout_order_id_checkout_orders_id_fk" FOREIGN KEY ("checkout_order_id") REFERENCES "public"."checkout_orders"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "checkout_payment_attempt_logs" ADD CONSTRAINT "checkout_payment_attempt_logs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "checkout_payment_attempt_logs" ADD CONSTRAINT "checkout_payment_attempt_logs_target_team_id_teams_id_fk" FOREIGN KEY ("target_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "checkout_payment_attempt_logs" ADD CONSTRAINT "checkout_payment_attempt_logs_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "checkout_payment_attempt_logs_checkout_order_idx" ON "checkout_payment_attempt_logs" USING btree ("checkout_order_id");
--> statement-breakpoint
CREATE INDEX "checkout_payment_attempt_logs_method_created_idx" ON "checkout_payment_attempt_logs" USING btree ("payment_method_id","created_at");
--> statement-breakpoint
CREATE INDEX "checkout_payment_attempt_logs_provider_created_idx" ON "checkout_payment_attempt_logs" USING btree ("provider","created_at");
--> statement-breakpoint
CREATE INDEX "checkout_payment_attempt_logs_provider_session_idx" ON "checkout_payment_attempt_logs" USING btree ("provider","provider_session_id");
--> statement-breakpoint
CREATE INDEX "checkout_payment_attempt_logs_external_payment_idx" ON "checkout_payment_attempt_logs" USING btree ("provider","external_payment_id");
