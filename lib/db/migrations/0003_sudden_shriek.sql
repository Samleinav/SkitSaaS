CREATE TABLE "payment_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(30) NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"status" varchar(20) DEFAULT 'info' NOT NULL,
	"team_id" integer,
	"external_id" text,
	"amount" integer,
	"currency" varchar(10),
	"message" text,
	"payload" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;