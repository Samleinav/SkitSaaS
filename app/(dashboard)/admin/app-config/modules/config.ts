import { trimToNull } from '@/lib/config/app-config';
import {
  getAppConfigEntriesForAdmin,
  getAppModulesForAdmin
} from '@/lib/db/queries.admin';
import type {
  ModuleRuntimeConfigField,
  ModuleRuntimeConfigFieldKind
} from '@/lib/modules/manifest';
import { getAllModuleManifests } from '@/lib/modules/registry';
import {
  resolveEnabledModuleIdSet,
  type ModuleRuntimeRow,
  type ModuleRuntimeStatus
} from '@/lib/modules/runtime';
import { getResolvedAppConfig } from '@/lib/runtime-config/load-app-config';

export type ModuleConfigSource = 'env' | 'db' | 'default';

export type AdminModuleRuntimeConfigFieldState = ModuleRuntimeConfigField & {
  fieldId: string;
  fieldIndex: number;
  formFieldName: string;
  namespace: string;
  kind: ModuleRuntimeConfigFieldKind;
  value: string;
  dbValue: string;
  source: ModuleConfigSource;
  hasEnvOverride: boolean;
};

export type AdminAppConfigModuleItem = {
  anchorId: string;
  moduleId: string;
  displayName: string;
  description: string;
  manifestVersion: string;
  runtimeVersion: string;
  installMode: string;
  dbStatus: ModuleRuntimeStatus;
  effectiveEnabled: boolean;
  configFieldCount: number;
  toggleLocked: boolean;
  toggleLockReason: 'runtime_mode_config' | 'config_override' | null;
  configOverrideValue: boolean | null;
  runtimeConfigTitle: string;
  runtimeConfigDescription: string;
  configFields: AdminModuleRuntimeConfigFieldState[];
};

export type AdminAppConfigModulesData = {
  moduleRuntimeMode: ReturnType<typeof getResolvedAppConfig>['moduleRuntimeMode'];
  modules: AdminAppConfigModuleItem[];
};

function normalizeModuleRuntimeStatus(value: string | null | undefined): ModuleRuntimeStatus {
  if (
    value === 'installed' ||
    value === 'enabled' ||
    value === 'disabled' ||
    value === 'uninstalled'
  ) {
    return value;
  }

  return 'uninstalled';
}

function inferInstallMode(moduleId: string) {
  return moduleId.startsWith('core.') || moduleId.startsWith('ops.')
    ? 'core'
    : 'plugin';
}

function resolveFieldKind(
  field: ModuleRuntimeConfigField
): ModuleRuntimeConfigFieldKind {
  if (field.kind) {
    return field.kind;
  }

  return field.secret ? 'password' : 'text';
}

function resolveFieldNamespace({
  moduleId,
  fieldNamespace,
  defaultNamespace
}: {
  moduleId: string;
  fieldNamespace?: string;
  defaultNamespace?: string;
}) {
  const normalizedFieldNamespace = fieldNamespace?.trim();
  if (normalizedFieldNamespace) {
    return normalizedFieldNamespace;
  }

  const normalizedDefaultNamespace = defaultNamespace?.trim();
  if (normalizedDefaultNamespace) {
    return normalizedDefaultNamespace;
  }

  return `modules.${moduleId}`;
}

function resolveFieldValue({
  envKey,
  defaultValue,
  dbValue
}: {
  envKey?: string;
  defaultValue?: string;
  dbValue: string | null;
}) {
  const envValue = envKey ? trimToNull(process.env[envKey]) : null;
  const normalizedDbValue = trimToNull(dbValue);
  const normalizedDefaultValue = trimToNull(defaultValue);

  if (envValue) {
    return {
      value: envValue,
      dbValue: normalizedDbValue ?? '',
      source: 'env' as const,
      hasEnvOverride: true
    };
  }

  if (normalizedDbValue) {
    return {
      value: normalizedDbValue,
      dbValue: normalizedDbValue,
      source: 'db' as const,
      hasEnvOverride: false
    };
  }

  return {
    value: normalizedDefaultValue ?? '',
    dbValue: '',
    source: 'default' as const,
    hasEnvOverride: false
  };
}

function resolveModuleAnchorId(moduleId: string) {
  return `module-${moduleId.replace(/[^a-z0-9_-]+/gi, '-')}`;
}

function resolveModuleToggleState({
  moduleId,
  moduleRuntimeMode,
  moduleFlags
}: {
  moduleId: string;
  moduleRuntimeMode: ReturnType<typeof getResolvedAppConfig>['moduleRuntimeMode'];
  moduleFlags: Record<string, boolean>;
}) {
  const hasConfigOverride = Object.prototype.hasOwnProperty.call(
    moduleFlags,
    moduleId
  );
  const configOverrideValue = hasConfigOverride ? moduleFlags[moduleId] : null;

  if (moduleRuntimeMode === 'config') {
    return {
      toggleLocked: true,
      toggleLockReason: 'runtime_mode_config' as const,
      configOverrideValue
    };
  }

  if (moduleRuntimeMode === 'hybrid' && hasConfigOverride) {
    return {
      toggleLocked: true,
      toggleLockReason: 'config_override' as const,
      configOverrideValue
    };
  }

  return {
    toggleLocked: false,
    toggleLockReason: null,
    configOverrideValue
  };
}

function toRuntimeRows(
  rows: Awaited<ReturnType<typeof getAppModulesForAdmin>>
): ModuleRuntimeRow[] {
  return rows.map((row) => ({
    moduleId: row.moduleId,
    status: normalizeModuleRuntimeStatus(row.status),
    version: row.version,
    installMode: row.installMode
  }));
}

export async function getAdminAppConfigModulesData(): Promise<AdminAppConfigModulesData> {
  const [manifests, configEntries, moduleRows] = await Promise.all([
    Promise.resolve(getAllModuleManifests()),
    getAppConfigEntriesForAdmin(),
    getAppModulesForAdmin()
  ]);

  const resolvedAppConfig = getResolvedAppConfig();
  const runtimeRows = toRuntimeRows(moduleRows);
  const enabledModuleIds = resolveEnabledModuleIdSet({
    manifests,
    runtimeRows,
    moduleRuntimeMode: resolvedAppConfig.moduleRuntimeMode,
    moduleFlags: resolvedAppConfig.modules
  });
  const runtimeRowMap = new Map(runtimeRows.map((row) => [row.moduleId, row]));
  const appConfigValueMap = new Map(
    configEntries.map((entry) => [
      `${entry.namespace}:${entry.configKey}`,
      entry.configValue
    ])
  );

  const modules = manifests
    .slice()
    .sort((left, right) => {
      const byName = left.displayName.localeCompare(right.displayName);
      return byName !== 0 ? byName : left.moduleId.localeCompare(right.moduleId);
    })
    .map((manifest) => {
      const runtimeRow = runtimeRowMap.get(manifest.moduleId);
      const runtimeConfig = manifest.runtimeConfig;
      const configFields = (runtimeConfig?.fields ?? []).map((field, fieldIndex) => {
        const namespace = resolveFieldNamespace({
          moduleId: manifest.moduleId,
          fieldNamespace: field.namespace,
          defaultNamespace: runtimeConfig?.namespace
        });
        const resolvedValue = resolveFieldValue({
          envKey: field.envKey,
          defaultValue: field.defaultValue,
          dbValue:
            appConfigValueMap.get(`${namespace}:${field.configKey}`) ?? null
        });

        return {
          ...field,
          fieldId: `${namespace}:${field.configKey}`,
          fieldIndex,
          formFieldName: `configValues.${fieldIndex}`,
          namespace,
          kind: resolveFieldKind(field),
          value: resolvedValue.value,
          dbValue: resolvedValue.dbValue,
          source: resolvedValue.source,
          hasEnvOverride: resolvedValue.hasEnvOverride
        } satisfies AdminModuleRuntimeConfigFieldState;
      });

      return {
        anchorId: resolveModuleAnchorId(manifest.moduleId),
        moduleId: manifest.moduleId,
        displayName: manifest.displayName,
        description: manifest.description?.trim() || '',
        manifestVersion: manifest.version,
        runtimeVersion: runtimeRow?.version ?? manifest.version,
        installMode: runtimeRow?.installMode ?? inferInstallMode(manifest.moduleId),
        dbStatus: runtimeRow?.status ?? 'uninstalled',
        effectiveEnabled: enabledModuleIds.has(manifest.moduleId),
        configFieldCount: configFields.length,
        ...resolveModuleToggleState({
          moduleId: manifest.moduleId,
          moduleRuntimeMode: resolvedAppConfig.moduleRuntimeMode,
          moduleFlags: resolvedAppConfig.modules
        }),
        runtimeConfigTitle: runtimeConfig?.title?.trim() || manifest.displayName,
        runtimeConfigDescription:
          runtimeConfig?.description?.trim() || manifest.description?.trim() || '',
        configFields
      } satisfies AdminAppConfigModuleItem;
    });

  return {
    moduleRuntimeMode: resolvedAppConfig.moduleRuntimeMode,
    modules
  };
}
