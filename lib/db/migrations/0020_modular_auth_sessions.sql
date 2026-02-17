CREATE TABLE IF NOT EXISTS "auth_external_identities" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"provider_id" varchar(80) NOT NULL,
	"provider_subject" varchar(255) NOT NULL,
	"provider_email" varchar(255),
	"provider_account_id" varchar(255),
	"display_name" varchar(255),
	"avatar_url" text,
	"claims" text,
	"metadata" text,
	"linked_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(120) NOT NULL,
	"token_jti" varchar(120) NOT NULL,
	"user_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"revoked_reason" text,
	"last_seen_at" timestamp,
	"last_ip_address" varchar(45),
	"user_agent" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_status_chk" CHECK ("auth_sessions"."status" in ('active', 'revoked', 'expired'))
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth_external_identities" ADD CONSTRAINT "auth_external_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "auth_external_identities_provider_subject_idx" ON "auth_external_identities" USING btree ("provider_id","provider_subject");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "auth_external_identities_user_provider_idx" ON "auth_external_identities" USING btree ("user_id","provider_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_external_identities_user_idx" ON "auth_external_identities" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_external_identities_provider_idx" ON "auth_external_identities" USING btree ("provider_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "auth_sessions_session_id_idx" ON "auth_sessions" USING btree ("session_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "auth_sessions_token_jti_idx" ON "auth_sessions" USING btree ("token_jti");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_sessions_user_status_idx" ON "auth_sessions" USING btree ("user_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_sessions_expires_at_idx" ON "auth_sessions" USING btree ("expires_at");
