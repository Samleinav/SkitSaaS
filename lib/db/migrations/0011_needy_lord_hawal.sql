CREATE TABLE "payment_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"source" varchar(30) DEFAULT 'system' NOT NULL,
	"team_id" integer,
	"subscription_template_id" integer,
	"payment_method" varchar(60),
	"plan_name" varchar(100),
	"provider_plan_id" text,
	"external_order_id" text,
	"external_payment_id" text,
	"amount" integer,
	"currency" varchar(10),
	"message" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_subscription_template_id_subscription_templates_id_fk" FOREIGN KEY ("subscription_template_id") REFERENCES "public"."subscription_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_orders_created_at_idx" ON "payment_orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payment_orders_status_idx" ON "payment_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_orders_provider_idx" ON "payment_orders" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "payment_orders_team_id_idx" ON "payment_orders" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_orders_provider_external_payment_idx" ON "payment_orders" USING btree ("provider","external_payment_id");