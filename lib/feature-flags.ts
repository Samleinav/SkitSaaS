const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSY_VALUES = new Set(['0', 'false', 'no', 'off']);

function parseBooleanFlag(name: string, defaultValue = false) {
  const rawValue = process.env[name];
  if (!rawValue) {
    return defaultValue;
  }

  const normalizedValue = rawValue.trim().toLowerCase();

  if (TRUTHY_VALUES.has(normalizedValue)) {
    return true;
  }

  if (FALSY_VALUES.has(normalizedValue)) {
    return false;
  }

  return defaultValue;
}

export const FEATURE_FLAG_ENV = {
  useAppModulesRuntime: 'FF_USE_APP_MODULES_RUNTIME',
  useThemeRuntime: 'FF_USE_THEME_RUNTIME',
  useModuleDispatcherRoutes: 'FF_USE_MODULE_DISPATCHER_ROUTES',
} as const;

export type FeatureFlagName = keyof typeof FEATURE_FLAG_ENV;
export type FeatureFlagEnvName = (typeof FEATURE_FLAG_ENV)[FeatureFlagName];

export function readFeatureFlag(
  flagEnvName: FeatureFlagEnvName,
  defaultValue = false
) {
  return parseBooleanFlag(flagEnvName, defaultValue);
}

export function getFeatureFlagsSnapshot() {
  return {
    useAppModulesRuntime: readFeatureFlag(
      FEATURE_FLAG_ENV.useAppModulesRuntime,
      true
    ),
    // Theme runtime is now build-time selected and always enabled at runtime.
    // Keep FF_USE_THEME_RUNTIME as legacy env for compatibility only.
    useThemeRuntime: true,
    useModuleDispatcherRoutes: readFeatureFlag(
      FEATURE_FLAG_ENV.useModuleDispatcherRoutes,
      true
    ),
  } as const;
}

export const featureFlags = getFeatureFlagsSnapshot();

export type FeatureFlags = typeof featureFlags;

export function isFeatureFlagEnabled(flagName: FeatureFlagName) {
  return featureFlags[flagName];
}
