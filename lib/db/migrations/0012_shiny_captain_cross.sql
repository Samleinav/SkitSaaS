CREATE TABLE "email_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(30) DEFAULT 'smtp' NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"recipient_email" varchar(255) NOT NULL,
	"recipient_user_id" integer,
	"subject" varchar(255),
	"source" varchar(120),
	"external_message_id" text,
	"message" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_logs_created_at_idx" ON "email_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "email_logs_status_idx" ON "email_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_logs_event_type_idx" ON "email_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "email_logs_recipient_email_idx" ON "email_logs" USING btree ("recipient_email");--> statement-breakpoint
CREATE INDEX "email_logs_recipient_user_id_idx" ON "email_logs" USING btree ("recipient_user_id");