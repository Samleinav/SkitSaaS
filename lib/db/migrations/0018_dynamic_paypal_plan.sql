ALTER TABLE "subscription_templates"
  ADD COLUMN "paypal_product_id" text,
  ADD COLUMN "paypal_plan_id" text,
  ADD COLUMN "paypal_plan_fingerprint" text;
