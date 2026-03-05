import appConfig from '@/app.config';
import type {
  AppConfig,
  ModuleFlags,
  ModuleRuntimeMode,
  ResolvedAppConfig
} from './types';

export const APP_RUNTIME_ENV_KEYS = {
  projectName: 'APP_PROJECT_NAME',
  moduleRuntimeMode: 'MODULE_RUNTIME_MODE',
  enableModules: 'ACTIVE_MODULES_ENABLE',
  disableModules: 'ACTIVE_MODULES_DISABLE'
} as const;

const DEFAULT_APP_CONFIG: AppConfig = {
  projectName: 'S-Kit-SaaS',
  moduleRuntimeMode: 'db',
  modules: {}
};

function normalizeProjectName(value: unknown) {
  if (typeof value !== 'string') {
    return DEFAULT_APP_CONFIG.projectName;
  }

  const normalized = value.trim();
  return normalized || DEFAULT_APP_CONFIG.projectName;
}

export function normalizeModuleRuntimeMode(value: unknown): ModuleRuntimeMode {
  if (value === 'db' || value === 'config' || value === 'hybrid') {
    return value;
  }

  if (typeof value !== 'string') {
    return DEFAULT_APP_CONFIG.moduleRuntimeMode;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'db' || normalized === 'config' || normalized === 'hybrid') {
    return normalized;
  }

  return DEFAULT_APP_CONFIG.moduleRuntimeMode;
}

function normalizeModuleFlags(value: unknown): ModuleFlags {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>);
  const normalized: ModuleFlags = {};
  for (const [moduleId, enabled] of entries) {
    const normalizedModuleId = moduleId.trim();
    if (!normalizedModuleId) {
      continue;
    }

    if (enabled === true || enabled === false) {
      normalized[normalizedModuleId] = enabled;
    }
  }

  return normalized;
}

function parseModuleList(rawValue: string | undefined) {
  if (!rawValue) {
    return [] as string[];
  }

  return rawValue
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function applyModuleListOverrides({
  baseFlags,
  enableList,
  disableList
}: {
  baseFlags: ModuleFlags;
  enableList: string[];
  disableList: string[];
}) {
  const normalized: ModuleFlags = {
    ...baseFlags
  };

  for (const moduleId of enableList) {
    normalized[moduleId] = true;
  }

  for (const moduleId of disableList) {
    normalized[moduleId] = false;
  }

  return normalized;
}

export function resolveAppConfig({
  source,
  env
}: {
  source?: Partial<AppConfig> | null;
  env?: NodeJS.ProcessEnv;
} = {}): ResolvedAppConfig {
  const sourceConfig = source ?? appConfig;
  const processEnv = env ?? process.env;

  const envProjectName = processEnv[APP_RUNTIME_ENV_KEYS.projectName];
  const envModuleRuntimeMode = processEnv[APP_RUNTIME_ENV_KEYS.moduleRuntimeMode];
  const envEnableModules = processEnv[APP_RUNTIME_ENV_KEYS.enableModules];
  const envDisableModules = processEnv[APP_RUNTIME_ENV_KEYS.disableModules];

  const sourceProjectName = normalizeProjectName(sourceConfig.projectName);
  const sourceRuntimeMode = normalizeModuleRuntimeMode(sourceConfig.moduleRuntimeMode);
  const sourceFlags = normalizeModuleFlags(sourceConfig.modules);

  const resolvedProjectName = normalizeProjectName(envProjectName ?? sourceProjectName);
  const resolvedRuntimeMode = normalizeModuleRuntimeMode(
    envModuleRuntimeMode ?? sourceRuntimeMode
  );

  const enableList = parseModuleList(envEnableModules);
  const disableList = parseModuleList(envDisableModules);

  return {
    projectName: resolvedProjectName,
    moduleRuntimeMode: resolvedRuntimeMode,
    modules: applyModuleListOverrides({
      baseFlags: sourceFlags,
      enableList,
      disableList
    })
  };
}

let cachedResolvedConfig: ResolvedAppConfig | null = null;

export function getResolvedAppConfig() {
  if (cachedResolvedConfig) {
    return cachedResolvedConfig;
  }

  cachedResolvedConfig = resolveAppConfig();
  return cachedResolvedConfig;
}
