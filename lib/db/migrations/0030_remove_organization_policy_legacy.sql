DELETE FROM "app_configs"
WHERE "namespace" = 'organization.policy'
  AND "config_key" IN ('allow_multi_organizations', 'max_organizations_per_user');
