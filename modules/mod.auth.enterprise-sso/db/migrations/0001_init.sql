CREATE TABLE IF NOT EXISTS "mod_auth_enterprise_sso_states" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" varchar(80) NOT NULL,
	"tenant_id" varchar(80) NOT NULL,
	"flow" varchar(20) DEFAULT 'login' NOT NULL,
	"state_token" varchar(180) NOT NULL,
	"state_nonce" varchar(180),
	"pkce_code_verifier" text,
	"relay_request_id" varchar(180),
	"area" varchar(20) DEFAULT 'dashboard' NOT NULL,
	"redirect_to" text,
	"requested_by_user_id" integer,
	"metadata" text,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mod_auth_enterprise_sso_flow_chk" CHECK ("mod_auth_enterprise_sso_states"."flow" in ('login', 'link')),
	CONSTRAINT "mod_auth_enterprise_sso_area_chk" CHECK ("mod_auth_enterprise_sso_states"."area" in ('admin', 'dashboard'))
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mod_auth_enterprise_sso_states" ADD CONSTRAINT "mod_auth_enterprise_sso_states_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mod_auth_enterprise_sso_state_token_idx" ON "mod_auth_enterprise_sso_states" USING btree ("state_token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mod_auth_enterprise_sso_provider_tenant_exp_idx" ON "mod_auth_enterprise_sso_states" USING btree ("provider_id","tenant_id","expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mod_auth_enterprise_sso_requested_by_idx" ON "mod_auth_enterprise_sso_states" USING btree ("requested_by_user_id");
