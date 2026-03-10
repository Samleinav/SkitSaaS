CREATE TABLE "system_notification_recipients" (
	"id" serial PRIMARY KEY NOT NULL,
	"notification_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"read_at" timestamp,
	"dismissed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"audience_type" varchar(20) DEFAULT 'global' NOT NULL,
	"area" varchar(20) DEFAULT 'auto' NOT NULL,
	"tone" varchar(20) DEFAULT 'info' NOT NULL,
	"title" varchar(160),
	"message" text NOT NULL,
	"source" varchar(120),
	"metadata" text,
	"starts_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"created_by_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_notifications_audience_chk" CHECK ("system_notifications"."audience_type" in ('global', 'direct')),
	CONSTRAINT "system_notifications_area_chk" CHECK ("system_notifications"."area" in ('auto', 'admin', 'dashboard', 'both')),
	CONSTRAINT "system_notifications_tone_chk" CHECK ("system_notifications"."tone" in ('success', 'error', 'info', 'warning'))
);
--> statement-breakpoint
ALTER TABLE "system_notification_recipients" ADD CONSTRAINT "system_notification_recipients_notification_id_system_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."system_notifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_notification_recipients" ADD CONSTRAINT "system_notification_recipients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_notifications" ADD CONSTRAINT "system_notifications_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "system_notification_recipients_notification_user_idx" ON "system_notification_recipients" USING btree ("notification_id","user_id");--> statement-breakpoint
CREATE INDEX "system_notification_recipients_user_dismissed_idx" ON "system_notification_recipients" USING btree ("user_id","dismissed_at");--> statement-breakpoint
CREATE INDEX "system_notification_recipients_user_read_idx" ON "system_notification_recipients" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "system_notification_recipients_notification_idx" ON "system_notification_recipients" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "system_notifications_audience_idx" ON "system_notifications" USING btree ("audience_type");--> statement-breakpoint
CREATE INDEX "system_notifications_area_created_idx" ON "system_notifications" USING btree ("area","created_at");--> statement-breakpoint
CREATE INDEX "system_notifications_starts_at_idx" ON "system_notifications" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "system_notifications_expires_at_idx" ON "system_notifications" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "system_notifications_created_by_user_idx" ON "system_notifications" USING btree ("created_by_user_id");