CREATE TABLE IF NOT EXISTS "mod_auth_passkey_challenges" (
  "id" serial PRIMARY KEY NOT NULL,
  "challenge_id" varchar(120) NOT NULL,
  "flow" varchar(30) NOT NULL,
  "challenge" text NOT NULL,
  "user_id" integer,
  "expected_origin" text NOT NULL,
  "expected_rp_id" varchar(255) NOT NULL,
  "expected_type" varchar(30) NOT NULL,
  "metadata" text,
  "issued_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp NOT NULL,
  "consumed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "mod_auth_passkey_challenges_flow_chk"
    CHECK ("mod_auth_passkey_challenges"."flow" in ('registration', 'authentication')),
  CONSTRAINT "mod_auth_passkey_challenges_expected_type_chk"
    CHECK ("mod_auth_passkey_challenges"."expected_type" in ('webauthn.create', 'webauthn.get'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mod_auth_passkey_credentials" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "credential_id" text NOT NULL,
  "public_key" text NOT NULL,
  "counter" integer DEFAULT 0 NOT NULL,
  "transports" text,
  "device_type" varchar(30) DEFAULT 'single_device' NOT NULL,
  "backed_up" boolean DEFAULT false NOT NULL,
  "aaguid" varchar(64),
  "nickname" varchar(120),
  "last_used_at" timestamp,
  "revoked_at" timestamp,
  "metadata" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "mod_auth_passkey_credentials_counter_chk"
    CHECK ("mod_auth_passkey_credentials"."counter" >= 0),
  CONSTRAINT "mod_auth_passkey_credentials_device_type_chk"
    CHECK ("mod_auth_passkey_credentials"."device_type" in ('single_device', 'multi_device'))
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "mod_auth_passkey_challenges"
    ADD CONSTRAINT "mod_auth_passkey_challenges_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "mod_auth_passkey_credentials"
    ADD CONSTRAINT "mod_auth_passkey_credentials_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mod_auth_passkey_challenge_id_idx"
  ON "mod_auth_passkey_challenges" USING btree ("challenge_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mod_auth_passkey_challenges_flow_expires_idx"
  ON "mod_auth_passkey_challenges" USING btree ("flow", "expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mod_auth_passkey_challenges_user_flow_idx"
  ON "mod_auth_passkey_challenges" USING btree ("user_id", "flow");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mod_auth_passkey_credential_id_idx"
  ON "mod_auth_passkey_credentials" USING btree ("credential_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mod_auth_passkey_credentials_active_user_idx"
  ON "mod_auth_passkey_credentials" USING btree ("user_id", "revoked_at");
