CREATE TABLE "dual_write_replay_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" varchar(80) NOT NULL,
	"replay_key" varchar(255) NOT NULL,
	"payload" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 10 NOT NULL,
	"next_attempt_at" timestamp DEFAULT now() NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dual_write_replay_queue_status_chk" CHECK ("dual_write_replay_queue"."status" in ('pending', 'processing', 'failed')),
	CONSTRAINT "dual_write_replay_queue_attempts_chk" CHECK ("dual_write_replay_queue"."attempts" >= 0 and "dual_write_replay_queue"."max_attempts" > 0 and "dual_write_replay_queue"."attempts" <= "dual_write_replay_queue"."max_attempts")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "dual_write_replay_queue_domain_key_idx" ON "dual_write_replay_queue" USING btree ("domain","replay_key");--> statement-breakpoint
CREATE INDEX "dual_write_replay_queue_status_next_attempt_idx" ON "dual_write_replay_queue" USING btree ("status","next_attempt_at");