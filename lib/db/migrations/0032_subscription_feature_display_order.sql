ALTER TABLE "subscription_template_features"
ADD COLUMN "display_order" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint

WITH ranked_features AS (
  SELECT
    "id",
    ((row_number() OVER (
      PARTITION BY "template_id"
      ORDER BY "created_at" ASC, "id" ASC
    ) - 1) * 10)::integer AS "next_display_order"
  FROM "subscription_template_features"
)
UPDATE "subscription_template_features" AS feature
SET "display_order" = ranked_features."next_display_order"
FROM ranked_features
WHERE feature."id" = ranked_features."id";
--> statement-breakpoint

ALTER TABLE "subscription_template_features"
ADD CONSTRAINT "subscription_template_features_display_order_chk"
CHECK ("subscription_template_features"."display_order" >= 0);
--> statement-breakpoint

CREATE INDEX "subscription_template_features_display_order_idx"
ON "subscription_template_features" USING btree (
  "template_id",
  "display_order",
  "id"
);
