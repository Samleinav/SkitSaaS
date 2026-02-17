CREATE TABLE IF NOT EXISTS "mod_commerce_onetime_intents" (
  "id" serial PRIMARY KEY NOT NULL,
  "intent_key" varchar(120) NOT NULL,
  "product_id" integer NOT NULL,
  "provider" varchar(30) DEFAULT 'stripe' NOT NULL,
  "status" varchar(30) DEFAULT 'pending' NOT NULL,
  "target_type" varchar(20) DEFAULT 'user' NOT NULL,
  "target_user_id" integer,
  "target_team_id" integer,
  "amount" integer NOT NULL,
  "currency" varchar(10) DEFAULT 'USD' NOT NULL,
  "session_id" text,
  "provider_intent_id" text,
  "checkout_url" text,
  "idempotency_key" varchar(160),
  "product_snapshot" text NOT NULL,
  "metadata" text,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "mod_commerce_onetime_intents_amount_chk" CHECK ("amount" >= 0),
  CONSTRAINT "mod_commerce_onetime_intents_currency_chk" CHECK (char_length("currency") between 3 and 10),
  CONSTRAINT "mod_commerce_onetime_intents_target_type_chk" CHECK ("target_type" in ('team', 'user')),
  CONSTRAINT "mod_commerce_onetime_intents_target_integrity_chk" CHECK ((
    ("target_type" = 'team' and "target_team_id" is not null and "target_user_id" is null) or
    ("target_type" = 'user' and "target_user_id" is not null and "target_team_id" is null)
  )),
  CONSTRAINT "mod_commerce_onetime_intents_status_chk" CHECK ("status" in ('pending', 'session_created', 'paid', 'failed', 'canceled', 'refunded'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mod_commerce_onetime_fulfillments" (
  "id" serial PRIMARY KEY NOT NULL,
  "intent_id" integer NOT NULL,
  "order_id" integer,
  "status" varchar(30) DEFAULT 'pending' NOT NULL,
  "provider_event_id" text,
  "external_payment_id" text,
  "amount" integer,
  "currency" varchar(10),
  "payload" text,
  "metadata" text,
  "processed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "mod_commerce_onetime_fulfillments_amount_chk" CHECK ("amount" is null or "amount" >= 0),
  CONSTRAINT "mod_commerce_onetime_fulfillments_currency_chk" CHECK ("currency" is null or char_length("currency") between 3 and 10),
  CONSTRAINT "mod_commerce_onetime_fulfillments_status_chk" CHECK ("status" in ('pending', 'paid', 'failed', 'canceled', 'refunded'))
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'mod_commerce_onetime_intents_target_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "mod_commerce_onetime_intents"
    ADD CONSTRAINT "mod_commerce_onetime_intents_target_user_id_users_id_fk"
    FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id")
    ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'mod_commerce_onetime_intents_target_team_id_teams_id_fk'
  ) THEN
    ALTER TABLE "mod_commerce_onetime_intents"
    ADD CONSTRAINT "mod_commerce_onetime_intents_target_team_id_teams_id_fk"
    FOREIGN KEY ("target_team_id") REFERENCES "public"."teams"("id")
    ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'mod_commerce_onetime_fulfillments_intent_id_mod_commerce_onetime_intents_id_fk'
  ) THEN
    ALTER TABLE "mod_commerce_onetime_fulfillments"
    ADD CONSTRAINT "mod_commerce_onetime_fulfillments_intent_id_mod_commerce_onetime_intents_id_fk"
    FOREIGN KEY ("intent_id") REFERENCES "public"."mod_commerce_onetime_intents"("id")
    ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'mod_commerce_onetime_fulfillments_order_id_payment_orders_id_fk'
  ) THEN
    ALTER TABLE "mod_commerce_onetime_fulfillments"
    ADD CONSTRAINT "mod_commerce_onetime_fulfillments_order_id_payment_orders_id_fk"
    FOREIGN KEY ("order_id") REFERENCES "public"."payment_orders"("id")
    ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mod_commerce_onetime_intents_key_idx"
ON "mod_commerce_onetime_intents" USING btree ("intent_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mod_commerce_onetime_intents_provider_intent_idx"
ON "mod_commerce_onetime_intents" USING btree ("provider", "provider_intent_id")
WHERE "provider_intent_id" is not null;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mod_commerce_onetime_intents_provider_session_idx"
ON "mod_commerce_onetime_intents" USING btree ("provider", "session_id")
WHERE "session_id" is not null;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mod_commerce_onetime_intents_idempotency_idx"
ON "mod_commerce_onetime_intents" USING btree ("idempotency_key")
WHERE "idempotency_key" is not null;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mod_commerce_onetime_intents_product_idx"
ON "mod_commerce_onetime_intents" USING btree ("product_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mod_commerce_onetime_intents_status_idx"
ON "mod_commerce_onetime_intents" USING btree ("status", "updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mod_commerce_onetime_intents_target_user_idx"
ON "mod_commerce_onetime_intents" USING btree ("target_type", "target_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mod_commerce_onetime_intents_target_team_idx"
ON "mod_commerce_onetime_intents" USING btree ("target_type", "target_team_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mod_commerce_onetime_fulfillments_intent_idx"
ON "mod_commerce_onetime_fulfillments" USING btree ("intent_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mod_commerce_onetime_fulfillments_provider_event_idx"
ON "mod_commerce_onetime_fulfillments" USING btree ("provider_event_id")
WHERE "provider_event_id" is not null;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mod_commerce_onetime_fulfillments_order_idx"
ON "mod_commerce_onetime_fulfillments" USING btree ("order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mod_commerce_onetime_fulfillments_status_idx"
ON "mod_commerce_onetime_fulfillments" USING btree ("status", "updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mod_commerce_onetime_fulfillments_external_payment_idx"
ON "mod_commerce_onetime_fulfillments" USING btree ("external_payment_id");
