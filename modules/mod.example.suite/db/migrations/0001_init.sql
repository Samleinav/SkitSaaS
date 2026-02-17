CREATE TABLE IF NOT EXISTS "mod_example_suite_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" varchar(120) NOT NULL,
  "description" text,
  "status" varchar(20) DEFAULT 'draft' NOT NULL,
  "priority" integer DEFAULT 3 NOT NULL,
  "is_public" boolean DEFAULT false NOT NULL,
  "owner_user_id" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "mod_example_suite_items_status_chk" CHECK ("status" in ('draft', 'active', 'archived')),
  CONSTRAINT "mod_example_suite_items_priority_chk" CHECK ("priority" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mod_example_suite_settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "setting_key" varchar(100) NOT NULL,
  "setting_value" text NOT NULL,
  "updated_by_user_id" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'mod_example_suite_items_owner_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "mod_example_suite_items"
    ADD CONSTRAINT "mod_example_suite_items_owner_user_id_users_id_fk"
    FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id")
    ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'mod_example_suite_settings_updated_by_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "mod_example_suite_settings"
    ADD CONSTRAINT "mod_example_suite_settings_updated_by_user_id_users_id_fk"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id")
    ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mod_example_suite_items_owner_user_id_idx"
ON "mod_example_suite_items" USING btree ("owner_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mod_example_suite_items_status_idx"
ON "mod_example_suite_items" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mod_example_suite_items_public_idx"
ON "mod_example_suite_items" USING btree ("is_public");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mod_example_suite_settings_key_idx"
ON "mod_example_suite_settings" USING btree ("setting_key");
