import { cache } from 'react';
import { recordThemeResolutionSource } from '@/lib/observability/migration-metrics';
import {
  type ThemeArea,
  type ThemeMode
} from '@/lib/theme';
import { THEME_SELECTION_BY_AREA } from '@/lib/themes/selection.generated';

export type ThemePolicy = {
  mode: ThemeMode;
  allowUserOverride: boolean;
  defaults: Partial<Record<ThemeArea, string>>;
};

export type ThemeRuntimeSnapshot = {
  policy: ThemePolicy;
  activeThemes: Partial<Record<ThemeArea, string>>;
  userPreferences: Partial<
    Record<ThemeArea, { themeKey: string; mode?: ThemeMode }>
  >;
};

export type ThemeResolutionSource =
  | 'policy'
  | 'override'
  | 'area_active'
  | 'fallback';

export type ThemeSelection = {
  area: ThemeArea;
  mode: ThemeMode;
  themeKey: string | null;
  allowUserOverride: boolean;
  source: ThemeResolutionSource;
};

const DASHBOARD_AUTH_PATH_PREFIXES = ['/login', '/sign-in', '/sign-up'] as const;
type ThemeStorageArea = Exclude<ThemeArea, 'frontend'>;

function toStorageArea(area: ThemeArea): ThemeStorageArea {
  return area === 'frontend' ? 'public' : area;
}

function matchesPathPrefix(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function isDashboardAuthPath(path: string) {
  return DASHBOARD_AUTH_PATH_PREFIXES.some((prefix) =>
    matchesPathPrefix(path, prefix)
  );
}

export function resolveThemeAreaFromPath(path: string | null | undefined): ThemeArea {
  const normalizedPath = (path || '').trim().toLowerCase();

  if (matchesPathPrefix(normalizedPath, '/admin/login')) {
    return 'admin';
  }

  if (isDashboardAuthPath(normalizedPath)) {
    return 'dashboard';
  }

  if (matchesPathPrefix(normalizedPath, '/admin')) {
    return 'admin';
  }

  if (matchesPathPrefix(normalizedPath, '/dashboard')) {
    return 'dashboard';
  }

  return 'frontend';
}

function parseBoolean(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return (
    normalized === 'true' ||
    normalized === '1' ||
    normalized === 'yes' ||
    normalized === 'on'
  );
}

function parseThemeMode(value: string | null | undefined): ThemeMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'light' || normalized === 'dark') {
    return normalized;
  }

  return 'system';
}

function trimToNull(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

const getThemeRuntimeSnapshot = cache(async (): Promise<ThemeRuntimeSnapshot> => {
  const modeRaw = trimToNull(process.env.THEME_MODE);
  const allowUserOverrideRaw = trimToNull(process.env.THEME_ALLOW_USER_OVERRIDE);
  const adminDefault = THEME_SELECTION_BY_AREA.admin;
  const dashboardDefault = THEME_SELECTION_BY_AREA.dashboard;
  const frontendDefault = THEME_SELECTION_BY_AREA.frontend;

  const policy: ThemePolicy = {
    mode: parseThemeMode(modeRaw),
    allowUserOverride: parseBoolean(allowUserOverrideRaw ?? 'true'),
    defaults: {
      admin: adminDefault,
      dashboard: dashboardDefault,
      frontend: frontendDefault,
      public: frontendDefault
    }
  };

  return {
    policy,
    activeThemes: {},
    userPreferences: {}
  };
});

export async function getThemeRuntimeSnapshotForRequest() {
  return getThemeRuntimeSnapshot();
}

export function resolveThemeSelection(
  snapshot: ThemeRuntimeSnapshot,
  area: ThemeArea
): ThemeSelection {
  const storageArea = toStorageArea(area);
  const policyDefault =
    snapshot.policy.defaults[area] ??
    snapshot.policy.defaults[storageArea] ??
    snapshot.policy.defaults.global ??
    null;
  const activeTheme =
    snapshot.activeThemes[area] ??
    snapshot.activeThemes[storageArea] ??
    snapshot.activeThemes.global ??
    null;
  const allowUserOverride = snapshot.policy.allowUserOverride;

  const userPreference = allowUserOverride
    ? snapshot.userPreferences[area] ??
      snapshot.userPreferences[storageArea] ??
      snapshot.userPreferences.global ??
      null
    : null;

  let themeKey: string | null = null;
  let source: ThemeResolutionSource = 'fallback';

  if (userPreference?.themeKey) {
    themeKey = userPreference.themeKey;
    source = 'override';
  } else if (policyDefault) {
    themeKey = policyDefault;
    source = 'policy';
  } else if (activeTheme) {
    themeKey = activeTheme;
    source = 'area_active';
  }

  const mode = userPreference?.mode ?? snapshot.policy.mode;

  return {
    area,
    mode,
    themeKey,
    allowUserOverride,
    source
  };
}

export async function getThemeSelectionForArea(area: ThemeArea) {
  const snapshot = await getThemeRuntimeSnapshot();
  return resolveThemeSelection(snapshot, area);
}

export async function getThemeRuntimeSelections() {
  const snapshot = await getThemeRuntimeSnapshot();
  const selections: Record<ThemeArea, ThemeSelection> = {
    admin: resolveThemeSelection(snapshot, 'admin'),
    dashboard: resolveThemeSelection(snapshot, 'dashboard'),
    frontend: resolveThemeSelection(snapshot, 'frontend'),
    public: resolveThemeSelection(snapshot, 'public'),
    global: resolveThemeSelection(snapshot, 'global')
  };

  for (const selection of Object.values(selections)) {
    recordThemeResolutionSource(selection.area, selection.source, {
      themeKey: selection.themeKey,
      mode: selection.mode,
      allowUserOverride: selection.allowUserOverride
    });
  }

  return selections;
}

export function buildThemeRuntimeScript(
  selections: Record<ThemeArea, ThemeSelection>
) {
  const payload = JSON.stringify(selections);
  const dashboardAuthPrefixes = JSON.stringify(DASHBOARD_AUTH_PATH_PREFIXES);

  return `(() => {\n  try {\n    const selections = ${payload};\n    const dashboardAuthPrefixes = ${dashboardAuthPrefixes};\n    const path = (window.location.pathname || '').toLowerCase();\n    const matchesPathPrefix = (value, prefix) => value === prefix || value.startsWith(prefix + '/');\n    const isDashboardAuthPath = dashboardAuthPrefixes.some((prefix) => matchesPathPrefix(path, prefix));\n    const area = matchesPathPrefix(path, '/admin/login')\n      ? 'admin'\n      : isDashboardAuthPath\n        ? 'dashboard'\n        : matchesPathPrefix(path, '/admin')\n          ? 'admin'\n          : matchesPathPrefix(path, '/dashboard')\n            ? 'dashboard'\n            : 'frontend';\n    const selection = selections[area] || selections.frontend || selections.public || selections.global;\n    const mode = selection?.mode || 'system';\n    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;\n    const resolvedMode = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;\n    const root = document.documentElement;\n    root.classList.toggle('dark', resolvedMode === 'dark');\n    root.style.colorScheme = resolvedMode;\n    if (selection?.themeKey) {\n      root.dataset.themeKey = selection.themeKey;\n    } else {\n      delete root.dataset.themeKey;\n    }\n    root.dataset.themeArea = area;\n    root.dataset.themeMode = mode;\n  } catch (error) {\n    // no-op\n  }\n})();`;
}
