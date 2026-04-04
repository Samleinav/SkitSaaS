CREATE TABLE IF NOT EXISTS "mod_contact_submissions" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(120) NOT NULL,
  "email" varchar(255) NOT NULL,
  "subject" varchar(180),
  "message" text NOT NULL,
  "source_path" varchar(255),
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mod_contact_submissions_created_at_idx"
ON "mod_contact_submissions" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mod_contact_submissions_email_idx"
ON "mod_contact_submissions" USING btree ("email");
