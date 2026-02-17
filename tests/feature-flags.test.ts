import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FEATURE_FLAG_ENV,
  getFeatureFlagsSnapshot,
  readFeatureFlag,
} from '@/lib/feature-flags';

const FLAG_NAMES = Object.values(FEATURE_FLAG_ENV);
const ORIGINAL_FLAGS = Object.fromEntries(
  FLAG_NAMES.map((flagName) => [flagName, process.env[flagName]])
) as Record<string, string | undefined>;

function clearFeatureFlagEnv() {
  for (const flagName of FLAG_NAMES) {
    delete process.env[flagName];
  }
}

test.beforeEach(() => {
  clearFeatureFlagEnv();
});

test.after(() => {
  clearFeatureFlagEnv();
  for (const [flagName, value] of Object.entries(ORIGINAL_FLAGS)) {
    if (value !== undefined) {
      process.env[flagName] = value;
    }
  }
});

test('feature flags use defaults when env is missing', () => {
  clearFeatureFlagEnv();

  const flags = getFeatureFlagsSnapshot();

  assert.equal(flags.useAppModulesRuntime, true);
  assert.equal(flags.useThemeRuntime, true);
  assert.equal(flags.useModuleDispatcherRoutes, true);
});

test('readFeatureFlag accepts truthy and falsy values', () => {
  process.env.FF_USE_APP_MODULES_RUNTIME = 'true';
  process.env.FF_USE_THEME_RUNTIME = '0';

  assert.equal(readFeatureFlag(FEATURE_FLAG_ENV.useAppModulesRuntime), true);
  assert.equal(readFeatureFlag(FEATURE_FLAG_ENV.useThemeRuntime), false);
});

test('readFeatureFlag falls back to provided default for invalid values', () => {
  process.env.FF_USE_MODULE_DISPATCHER_ROUTES = 'invalid-value';

  assert.equal(
    readFeatureFlag(FEATURE_FLAG_ENV.useModuleDispatcherRoutes, true),
    true
  );
  assert.equal(
    readFeatureFlag(FEATURE_FLAG_ENV.useModuleDispatcherRoutes, false),
    false
  );
});
