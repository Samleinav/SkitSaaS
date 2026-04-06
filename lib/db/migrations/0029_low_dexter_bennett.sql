ALTER TABLE "subscription_templates"
ADD COLUMN "publication_status" varchar(20) DEFAULT 'draft' NOT NULL;
--> statement-breakpoint

ALTER TABLE "subscription_templates"
ADD CONSTRAINT "subscription_templates_publication_status_chk"
CHECK ("subscription_templates"."publication_status" in ('draft', 'published'));
--> statement-breakpoint

UPDATE "subscription_templates"
SET
  "publication_status" = 'published',
  "updated_at" = now();
--> statement-breakpoint

INSERT INTO "subscription_templates" (
  "id",
  "name",
  "target_scope",
  "category_key",
  "hierarchy_rank",
  "billing_interval",
  "price_cents",
  "compare_at_price_cents",
  "currency",
  "trial_period_days",
  "publication_status",
  "paypal_product_id",
  "paypal_plan_id",
  "paypal_plan_fingerprint",
  "paypal_plan_id_no_trial",
  "paypal_plan_fingerprint_no_trial",
  "created_at",
  "updated_at"
)
VALUES
  (
    1,
    'Free User',
    'user',
    'free.user',
    0,
    'monthly',
    0,
    null,
    'USD',
    0,
    'draft',
    null,
    null,
    null,
    null,
    null,
    now(),
    now()
  ),
  (
    2,
    'Free Organization',
    'organization',
    'free.organization',
    0,
    'monthly',
    0,
    null,
    'USD',
    0,
    'draft',
    null,
    null,
    null,
    null,
    null,
    now(),
    now()
  )
ON CONFLICT ("id") DO UPDATE
SET
  "name" = excluded."name",
  "target_scope" = excluded."target_scope",
  "category_key" = excluded."category_key",
  "hierarchy_rank" = excluded."hierarchy_rank",
  "billing_interval" = excluded."billing_interval",
  "price_cents" = excluded."price_cents",
  "compare_at_price_cents" = excluded."compare_at_price_cents",
  "currency" = excluded."currency",
  "trial_period_days" = excluded."trial_period_days",
  "publication_status" = excluded."publication_status",
  "paypal_product_id" = excluded."paypal_product_id",
  "paypal_plan_id" = excluded."paypal_plan_id",
  "paypal_plan_fingerprint" = excluded."paypal_plan_fingerprint",
  "paypal_plan_id_no_trial" = excluded."paypal_plan_id_no_trial",
  "paypal_plan_fingerprint_no_trial" = excluded."paypal_plan_fingerprint_no_trial",
  "updated_at" = now();
--> statement-breakpoint

DELETE FROM "subscription_template_features"
WHERE "template_id" in (1, 2);
--> statement-breakpoint

INSERT INTO "subscription_template_features" (
  "template_id",
  "feature_key",
  "feature_label",
  "value_type",
  "feature_value",
  "value_label",
  "is_public",
  "created_at",
  "updated_at"
)
VALUES
  (
    1,
    'dashboard.user.organizations.max',
    'Max organizations',
    'number',
    '3',
    null,
    false,
    now(),
    now()
  ),
  (
    2,
    'dashboard.team.invites.enabled',
    'Allow team invitations',
    'boolean',
    'true',
    null,
    false,
    now(),
    now()
  ),
  (
    2,
    'dashboard.team.members.max',
    'Max team members',
    'number',
    '3',
    null,
    false,
    now(),
    now()
  );
--> statement-breakpoint

INSERT INTO "subscription_assignments" (
  "target_type",
  "target_team_id",
  "target_user_id",
  "subscription_template_id",
  "payment_provider",
  "provider_reference_id",
  "provider_plan_id",
  "status",
  "plan_name",
  "current_period_start",
  "current_period_end",
  "trial_ends_at",
  "cancel_at_period_end",
  "canceled_at",
  "effective_from",
  "effective_to",
  "source_order_id",
  "updated_at"
)
SELECT
  'user',
  null,
  u."id",
  1,
  null,
  null,
  null,
  'free',
  null,
  null,
  null,
  null,
  false,
  null,
  now(),
  null,
  null,
  now()
FROM "users" u
LEFT JOIN "subscription_assignments" sa
  ON sa."target_type" = 'user'
 AND sa."target_user_id" = u."id"
 AND sa."effective_to" is null
WHERE
  u."deleted_at" is null
  AND sa."id" is null;
--> statement-breakpoint

INSERT INTO "subscription_assignments" (
  "target_type",
  "target_team_id",
  "target_user_id",
  "subscription_template_id",
  "payment_provider",
  "provider_reference_id",
  "provider_plan_id",
  "status",
  "plan_name",
  "current_period_start",
  "current_period_end",
  "trial_ends_at",
  "cancel_at_period_end",
  "canceled_at",
  "effective_from",
  "effective_to",
  "source_order_id",
  "updated_at"
)
SELECT
  'team',
  t."id",
  null,
  2,
  null,
  null,
  null,
  'free',
  null,
  null,
  null,
  null,
  false,
  null,
  now(),
  null,
  null,
  now()
FROM "teams" t
LEFT JOIN "subscription_assignments" sa
  ON sa."target_type" = 'team'
 AND sa."target_team_id" = t."id"
 AND sa."effective_to" is null
WHERE sa."id" is null;
--> statement-breakpoint

SELECT setval(
  pg_get_serial_sequence('subscription_templates', 'id'),
  greatest(
    2,
    coalesce((SELECT max("id") FROM "subscription_templates"), 0)
  ),
  true
);
