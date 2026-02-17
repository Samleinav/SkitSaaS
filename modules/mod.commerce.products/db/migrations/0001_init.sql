CREATE TABLE "mod_commerce_products" (
  "id" serial PRIMARY KEY NOT NULL,
  "product_key" varchar(120) NOT NULL,
  "name" varchar(160) NOT NULL,
  "description" text,
  "kind" varchar(20) DEFAULT 'one_time' NOT NULL,
  "subscription_template_id" integer,
  "metadata" text,
  "created_by_user_id" integer,
  "updated_by_user_id" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mod_commerce_product_prices" (
  "id" serial PRIMARY KEY NOT NULL,
  "product_id" integer NOT NULL,
  "currency" varchar(10) DEFAULT 'USD' NOT NULL,
  "unit_amount_cents" integer NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "provider" varchar(30),
  "provider_price_id" text,
  "metadata" text,
  "effective_from" timestamp DEFAULT now() NOT NULL,
  "effective_to" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mod_commerce_product_publication" (
  "id" serial PRIMARY KEY NOT NULL,
  "product_id" integer NOT NULL,
  "is_published" boolean DEFAULT false NOT NULL,
  "published_at" timestamp,
  "unpublished_at" timestamp,
  "published_by_user_id" integer,
  "metadata" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mod_commerce_products"
  ADD CONSTRAINT "mod_commerce_products_subscription_template_fk"
  FOREIGN KEY ("subscription_template_id")
  REFERENCES "public"."subscription_templates"("id")
  ON DELETE no action
  ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mod_commerce_products"
  ADD CONSTRAINT "mod_commerce_products_created_by_user_fk"
  FOREIGN KEY ("created_by_user_id")
  REFERENCES "public"."users"("id")
  ON DELETE no action
  ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mod_commerce_products"
  ADD CONSTRAINT "mod_commerce_products_updated_by_user_fk"
  FOREIGN KEY ("updated_by_user_id")
  REFERENCES "public"."users"("id")
  ON DELETE no action
  ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mod_commerce_product_prices"
  ADD CONSTRAINT "mod_commerce_product_prices_product_fk"
  FOREIGN KEY ("product_id")
  REFERENCES "public"."mod_commerce_products"("id")
  ON DELETE no action
  ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mod_commerce_product_publication"
  ADD CONSTRAINT "mod_commerce_product_publication_product_fk"
  FOREIGN KEY ("product_id")
  REFERENCES "public"."mod_commerce_products"("id")
  ON DELETE no action
  ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mod_commerce_product_publication"
  ADD CONSTRAINT "mod_commerce_product_publication_published_by_user_fk"
  FOREIGN KEY ("published_by_user_id")
  REFERENCES "public"."users"("id")
  ON DELETE no action
  ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "mod_commerce_products_key_idx"
  ON "mod_commerce_products" ("product_key");
--> statement-breakpoint
CREATE INDEX "mod_commerce_products_kind_idx"
  ON "mod_commerce_products" ("kind");
--> statement-breakpoint
CREATE INDEX "mod_commerce_products_template_idx"
  ON "mod_commerce_products" ("subscription_template_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "mod_commerce_product_prices_provider_price_idx"
  ON "mod_commerce_product_prices" ("provider","provider_price_id")
  WHERE "mod_commerce_product_prices"."provider_price_id" is not null;
--> statement-breakpoint
CREATE INDEX "mod_commerce_product_prices_product_idx"
  ON "mod_commerce_product_prices" ("product_id");
--> statement-breakpoint
CREATE INDEX "mod_commerce_product_prices_active_idx"
  ON "mod_commerce_product_prices" ("product_id","is_active");
--> statement-breakpoint
CREATE UNIQUE INDEX "mod_commerce_product_publication_product_idx"
  ON "mod_commerce_product_publication" ("product_id");
--> statement-breakpoint
CREATE INDEX "mod_commerce_product_publication_state_idx"
  ON "mod_commerce_product_publication" ("is_published","updated_at");
--> statement-breakpoint
ALTER TABLE "mod_commerce_products"
  ADD CONSTRAINT "mod_commerce_products_kind_chk"
  CHECK ("mod_commerce_products"."kind" in ('subscription', 'one_time'));
--> statement-breakpoint
ALTER TABLE "mod_commerce_products"
  ADD CONSTRAINT "mod_commerce_products_subscription_scope_chk"
  CHECK (
    (
      ("mod_commerce_products"."kind" = 'subscription' and "mod_commerce_products"."subscription_template_id" is not null)
      or
      ("mod_commerce_products"."kind" = 'one_time' and "mod_commerce_products"."subscription_template_id" is null)
    )
  );
--> statement-breakpoint
ALTER TABLE "mod_commerce_product_prices"
  ADD CONSTRAINT "mod_commerce_product_prices_currency_chk"
  CHECK (char_length("mod_commerce_product_prices"."currency") between 3 and 10);
--> statement-breakpoint
ALTER TABLE "mod_commerce_product_prices"
  ADD CONSTRAINT "mod_commerce_product_prices_amount_chk"
  CHECK ("mod_commerce_product_prices"."unit_amount_cents" >= 0);
