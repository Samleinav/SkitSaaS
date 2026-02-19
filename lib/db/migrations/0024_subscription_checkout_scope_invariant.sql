WITH ranked_team_orders AS (
	SELECT
		"id",
		row_number() OVER (
			PARTITION BY "target_team_id", "subscription_template_id"
			ORDER BY "updated_at" DESC, "id" DESC
		) AS "row_rank"
	FROM "checkout_orders"
	WHERE
		"order_type" = 'subscription'
		AND "target_type" = 'team'
		AND "target_team_id" IS NOT NULL
		AND "subscription_template_id" IS NOT NULL
		AND "status" IN ('ready', 'provider_pending')
),
team_duplicates AS (
	SELECT "id"
	FROM ranked_team_orders
	WHERE "row_rank" > 1
)
UPDATE "checkout_orders"
SET
	"status" = 'expired',
	"updated_at" = now()
WHERE "id" IN (SELECT "id" FROM team_duplicates);--> statement-breakpoint

WITH ranked_user_orders AS (
	SELECT
		"id",
		row_number() OVER (
			PARTITION BY "target_user_id", "subscription_template_id"
			ORDER BY "updated_at" DESC, "id" DESC
		) AS "row_rank"
	FROM "checkout_orders"
	WHERE
		"order_type" = 'subscription'
		AND "target_type" = 'user'
		AND "target_user_id" IS NOT NULL
		AND "subscription_template_id" IS NOT NULL
		AND "status" IN ('ready', 'provider_pending')
),
user_duplicates AS (
	SELECT "id"
	FROM ranked_user_orders
	WHERE "row_rank" > 1
)
UPDATE "checkout_orders"
SET
	"status" = 'expired',
	"updated_at" = now()
WHERE "id" IN (SELECT "id" FROM user_duplicates);--> statement-breakpoint

CREATE UNIQUE INDEX "checkout_orders_active_subscription_team_scope_idx"
	ON "checkout_orders" USING btree ("target_team_id","subscription_template_id")
	WHERE
		"order_type" = 'subscription'
		AND "target_type" = 'team'
		AND "target_team_id" IS NOT NULL
		AND "subscription_template_id" IS NOT NULL
		AND "status" IN ('ready', 'provider_pending');--> statement-breakpoint

CREATE UNIQUE INDEX "checkout_orders_active_subscription_user_scope_idx"
	ON "checkout_orders" USING btree ("target_user_id","subscription_template_id")
	WHERE
		"order_type" = 'subscription'
		AND "target_type" = 'user'
		AND "target_user_id" IS NOT NULL
		AND "subscription_template_id" IS NOT NULL
		AND "status" IN ('ready', 'provider_pending');
