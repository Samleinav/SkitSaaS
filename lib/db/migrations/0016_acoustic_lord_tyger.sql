CREATE TABLE "subscription_change_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_type" varchar(20) NOT NULL,
	"target_team_id" integer,
	"target_user_id" integer,
	"current_assignment_id" integer,
	"current_template_id" integer,
	"requested_template_id" integer NOT NULL,
	"requested_provider" varchar(20),
	"requested_payment_method" varchar(60),
	"requested_provider_plan_id" text,
	"requested_plan_name" varchar(100),
	"change_reason" varchar(60),
	"change_mode" varchar(30) DEFAULT 'period_end' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"effective_at" timestamp,
	"source_order_id" integer,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_change_requests_target_integrity_chk" CHECK ((
        ("subscription_change_requests"."target_type" = 'team' and "subscription_change_requests"."target_team_id" is not null and "subscription_change_requests"."target_user_id" is null) or
        ("subscription_change_requests"."target_type" = 'user' and "subscription_change_requests"."target_user_id" is not null and "subscription_change_requests"."target_team_id" is null)
      )),
	CONSTRAINT "subscription_change_requests_status_chk" CHECK ("subscription_change_requests"."status" in ('pending', 'scheduled', 'processing', 'applied', 'canceled', 'failed')),
	CONSTRAINT "subscription_change_requests_change_mode_chk" CHECK ("subscription_change_requests"."change_mode" in ('period_end'))
);
--> statement-breakpoint
ALTER TABLE "subscription_assignments" ADD COLUMN "current_period_start" timestamp;--> statement-breakpoint
ALTER TABLE "subscription_assignments" ADD COLUMN "current_period_end" timestamp;--> statement-breakpoint
ALTER TABLE "subscription_assignments" ADD COLUMN "trial_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscription_assignments" ADD COLUMN "cancel_at_period_end" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_assignments" ADD COLUMN "canceled_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscription_change_requests" ADD CONSTRAINT "subscription_change_requests_target_team_id_teams_id_fk" FOREIGN KEY ("target_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_change_requests" ADD CONSTRAINT "subscription_change_requests_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_change_requests" ADD CONSTRAINT "subscription_change_requests_current_assignment_id_subscription_assignments_id_fk" FOREIGN KEY ("current_assignment_id") REFERENCES "public"."subscription_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_change_requests" ADD CONSTRAINT "subscription_change_requests_current_template_id_subscription_templates_id_fk" FOREIGN KEY ("current_template_id") REFERENCES "public"."subscription_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_change_requests" ADD CONSTRAINT "subscription_change_requests_requested_template_id_subscription_templates_id_fk" FOREIGN KEY ("requested_template_id") REFERENCES "public"."subscription_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_change_requests" ADD CONSTRAINT "subscription_change_requests_source_order_id_payment_orders_id_fk" FOREIGN KEY ("source_order_id") REFERENCES "public"."payment_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_change_requests_target_team_idx" ON "subscription_change_requests" USING btree ("target_type","target_team_id");--> statement-breakpoint
CREATE INDEX "subscription_change_requests_target_user_idx" ON "subscription_change_requests" USING btree ("target_type","target_user_id");--> statement-breakpoint
CREATE INDEX "subscription_change_requests_status_effective_idx" ON "subscription_change_requests" USING btree ("status","effective_at");