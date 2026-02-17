CREATE TABLE "sys_activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"event_category" varchar(50) DEFAULT 'system' NOT NULL,
	"action" varchar(20) DEFAULT 'event' NOT NULL,
	"status" varchar(20) DEFAULT 'info' NOT NULL,
	"actor_user_id" integer,
	"actor_email" varchar(255),
	"actor_role" varchar(30),
	"target_user_id" integer,
	"team_id" integer,
	"entity_type" varchar(60),
	"entity_id" varchar(120),
	"source" varchar(120),
	"ip_address" varchar(45),
	"request_id" varchar(100),
	"message" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sys_activity_logs" ADD CONSTRAINT "sys_activity_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_activity_logs" ADD CONSTRAINT "sys_activity_logs_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_activity_logs" ADD CONSTRAINT "sys_activity_logs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sys_activity_logs_created_at_idx" ON "sys_activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sys_activity_logs_event_type_idx" ON "sys_activity_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "sys_activity_logs_actor_user_id_idx" ON "sys_activity_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "sys_activity_logs_team_id_idx" ON "sys_activity_logs" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "sys_activity_logs_entity_idx" ON "sys_activity_logs" USING btree ("entity_type","entity_id");