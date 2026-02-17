import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { appConfigs, appThemes } from '@/lib/db/schema';
import { trimToNull } from '@/lib/config/app-config';
import { THEME_POLICY_NAMESPACE, type ThemeMode } from '@/lib/theme';

export type ThemeConfigSource = 'env' | 'db' | 'default';

export type ThemeConfigDefinition = {
  configKey: string;
  envKey: string;
  fallback?: string;
};

export type ThemeConfigRow = {
  configKey: string;
  envKey: string;
  value: string;
  dbValue: string;
  source: ThemeConfigSource;
};

export type ThemeOption = {
  themeKey: string;
  displayName: string;
  area: string;
  isActive: boolean;
};

const THEME_CONFIG_DEFINITIONS = {
  mode: {
    configKey: 'mode',
    envKey: 'THEME_MODE',
    fallback: 'system'
  },
  allowUserOverride: {
    configKey: 'allow_user_override',
    envKey: 'THEME_ALLOW_USER_OVERRIDE',
    fallback: 'true'
  },
  adminDefault: {
    configKey: 'admin.default',
    envKey: 'THEME_ADMIN_DEFAULT',
    fallback: 'classic-light'
  },
  dashboardDefault: {
    configKey: 'dashboard.default',
    envKey: 'THEME_DASHBOARD_DEFAULT',
    fallback: 'classic-light'
  }
} as const satisfies Record<string, ThemeConfigDefinition>;

export type ThemeConfigName = keyof typeof THEME_CONFIG_DEFINITIONS;

function resolveThemeConfigRow({
  definition,
  dbConfigMap
}: {
  definition: ThemeConfigDefinition;
  dbConfigMap: Map<string, string>;
}): ThemeConfigRow {
  const envValue = trimToNull(process.env[definition.envKey]);
  const dbValue = dbConfigMap.get(definition.configKey) ?? '';

  if (envValue) {
    return {
      configKey: definition.configKey,
      envKey: definition.envKey,
      value: envValue,
      dbValue,
      source: 'env'
    };
  }

  if (dbValue) {
    return {
      configKey: definition.configKey,
      envKey: definition.envKey,
      value: dbValue,
      dbValue,
      source: 'db'
    };
  }

  return {
    configKey: definition.configKey,
    envKey: definition.envKey,
    value: definition.fallback ?? '',
    dbValue: '',
    source: 'default'
  };
}

function parseBoolean(value: string) {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === 'true' ||
    normalized === '1' ||
    normalized === 'yes' ||
    normalized === 'on'
  );
}

function parseThemeMode(value: string): ThemeMode {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'light' || normalized === 'dark') {
    return normalized;
  }

  return 'system';
}

export function getThemeConfigDefinitionsForAdmin() {
  return THEME_CONFIG_DEFINITIONS;
}

export async function getThemeConfigDataForAdmin() {
  const dbRows = await db
    .select({
      configKey: appConfigs.configKey,
      configValue: appConfigs.configValue
    })
    .from(appConfigs)
    .where(eq(appConfigs.namespace, THEME_POLICY_NAMESPACE));

  const dbConfigMap = new Map(
    dbRows.map((row) => [row.configKey, row.configValue])
  );

  const rows = Object.values(THEME_CONFIG_DEFINITIONS).map((definition) =>
    resolveThemeConfigRow({ definition, dbConfigMap })
  );

  const rowsByKey = rows.reduce<Record<string, ThemeConfigRow>>(
    (accumulator, row) => {
      accumulator[row.configKey] = row;
      return accumulator;
    },
    {}
  );

  const [adminThemes, dashboardThemes] = await Promise.all([
    db
      .select({
        themeKey: appThemes.themeKey,
        displayName: appThemes.displayName,
        area: appThemes.area,
        isActive: appThemes.isActive
      })
      .from(appThemes)
      .where(eq(appThemes.area, 'admin')),
    db
      .select({
        themeKey: appThemes.themeKey,
        displayName: appThemes.displayName,
        area: appThemes.area,
        isActive: appThemes.isActive
      })
      .from(appThemes)
      .where(eq(appThemes.area, 'dashboard'))
  ]);

  const modeRow = rowsByKey[THEME_CONFIG_DEFINITIONS.mode.configKey];
  const allowUserOverrideRow =
    rowsByKey[THEME_CONFIG_DEFINITIONS.allowUserOverride.configKey];
  const adminDefaultRow =
    rowsByKey[THEME_CONFIG_DEFINITIONS.adminDefault.configKey];
  const dashboardDefaultRow =
    rowsByKey[THEME_CONFIG_DEFINITIONS.dashboardDefault.configKey];

  return {
    rows: {
      mode: modeRow,
      allowUserOverride: allowUserOverrideRow,
      adminDefault: adminDefaultRow,
      dashboardDefault: dashboardDefaultRow
    },
    mode: parseThemeMode(modeRow?.value ?? 'system'),
    allowUserOverride: parseBoolean(allowUserOverrideRow?.value ?? 'true'),
    adminDefault: adminDefaultRow?.value ?? '',
    dashboardDefault: dashboardDefaultRow?.value ?? '',
    themeOptionsByArea: {
      admin: adminThemes,
      dashboard: dashboardThemes
    }
  };
}

export async function getThemeConfigValue(configName: ThemeConfigName) {
  const definition = THEME_CONFIG_DEFINITIONS[configName];
  const envValue = trimToNull(process.env[definition.envKey]);
  if (envValue) {
    return envValue;
  }

  try {
    const [row] = await db
      .select({
        configValue: appConfigs.configValue
      })
      .from(appConfigs)
      .where(
        and(
          eq(appConfigs.namespace, THEME_POLICY_NAMESPACE),
          eq(appConfigs.configKey, definition.configKey)
        )
      )
      .limit(1);

    if (row?.configValue) {
      return row.configValue;
    }
  } catch {
    // Continue with fallback.
  }

  return definition.fallback ?? null;
}
