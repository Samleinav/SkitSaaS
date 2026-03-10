-- Migration: 0027_quota_usage
-- Tracks per-scope, per-feature quota consumption against subscription plan limits.

CREATE TABLE IF NOT EXISTS "quota_usage" (
  "id"          serial PRIMARY KEY,
  "scope_type"  varchar(20)  NOT NULL,           -- 'team' | 'user'
  "scope_team_id" integer    REFERENCES "teams"("id"),
  "scope_user_id" integer    REFERENCES "users"("id"),
  "feature_key" varchar(100) NOT NULL,
  "used"        integer      NOT NULL DEFAULT 0,
  "period_start" timestamp   NOT NULL,           -- start of the current billing period
  "period_end"  timestamp,                       -- null = open-ended / no reset
  "created_at"  timestamp    NOT NULL DEFAULT now(),
  "updated_at"  timestamp    NOT NULL DEFAULT now(),
  CONSTRAINT "quota_usage_scope_integrity_chk" CHECK (
    (scope_type = 'team' AND scope_team_id IS NOT NULL AND scope_user_id IS NULL) OR
    (scope_type = 'user' AND scope_user_id IS NOT NULL AND scope_team_id IS NULL)
  )
);

-- One row per (scope, feature, period_start) combination
CREATE UNIQUE INDEX "quota_usage_scope_feature_period_idx"
  ON "quota_usage" ("scope_type", "scope_team_id", "feature_key", "period_start")
  WHERE scope_team_id IS NOT NULL;

CREATE UNIQUE INDEX "quota_usage_scope_user_feature_period_idx"
  ON "quota_usage" ("scope_type", "scope_user_id", "feature_key", "period_start")
  WHERE scope_user_id IS NOT NULL;

CREATE INDEX "quota_usage_feature_key_idx" ON "quota_usage" ("feature_key");
