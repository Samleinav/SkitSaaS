export const EXAMPLE_SUITE_MODULE_ID = 'mod.example.suite';

// Route paths — source of truth is now ExampleRoutes in ./routes.ts.
// Re-exported here for backward compatibility.
import { ExampleRoutes } from './routes';
export const EXAMPLE_SUITE_ADMIN_ALIAS = String(ExampleRoutes.admin.home);
export const EXAMPLE_SUITE_DASHBOARD_ALIAS = String(ExampleRoutes.dashboard.home);
export const EXAMPLE_SUITE_API_BASE = ExampleRoutes.apiBase;

export const EXAMPLE_SUITE_ITEM_STATUSES = [
  'draft',
  'active',
  'archived'
] as const;
export type ExampleSuiteItemStatus = (typeof EXAMPLE_SUITE_ITEM_STATUSES)[number];

export const EXAMPLE_SUITE_API_WRITE_MODES = [
  'admin',
  'authenticated'
] as const;
export type ExampleSuiteApiWriteMode =
  (typeof EXAMPLE_SUITE_API_WRITE_MODES)[number];

export const EXAMPLE_SUITE_DEFAULT_PRIORITY = 3;
export const EXAMPLE_SUITE_MIN_PRIORITY = 1;
export const EXAMPLE_SUITE_MAX_PRIORITY = 5;

export const EXAMPLE_SUITE_SETTINGS_KEYS = {
  allowDashboardCreate: 'allow_dashboard_create',
  apiWriteMode: 'api_write_mode',
  defaultStatus: 'default_status'
} as const;

export const EXAMPLE_SUITE_DEFAULT_SETTINGS = {
  allowDashboardCreate: true,
  apiWriteMode: 'authenticated' as ExampleSuiteApiWriteMode,
  defaultStatus: 'draft' as ExampleSuiteItemStatus
};

function normalizeInput(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
}

export function normalizeExampleSuiteStatus(
  value: unknown,
  fallback: ExampleSuiteItemStatus = EXAMPLE_SUITE_DEFAULT_SETTINGS.defaultStatus
): ExampleSuiteItemStatus {
  const normalized = normalizeInput(value);
  if (
    EXAMPLE_SUITE_ITEM_STATUSES.includes(
      normalized as ExampleSuiteItemStatus
    )
  ) {
    return normalized as ExampleSuiteItemStatus;
  }

  return fallback;
}

export function normalizeExampleSuiteApiWriteMode(
  value: unknown,
  fallback: ExampleSuiteApiWriteMode = EXAMPLE_SUITE_DEFAULT_SETTINGS.apiWriteMode
): ExampleSuiteApiWriteMode {
  const normalized = normalizeInput(value);
  if (
    EXAMPLE_SUITE_API_WRITE_MODES.includes(
      normalized as ExampleSuiteApiWriteMode
    )
  ) {
    return normalized as ExampleSuiteApiWriteMode;
  }

  return fallback;
}

export function normalizeExampleSuitePriority(
  value: unknown,
  fallback: number = EXAMPLE_SUITE_DEFAULT_PRIORITY
) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(
    EXAMPLE_SUITE_MAX_PRIORITY,
    Math.max(EXAMPLE_SUITE_MIN_PRIORITY, parsed)
  );
}

export function parseCheckboxValue(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  const normalized = normalizeInput(value);
  return (
    normalized === 'true' ||
    normalized === '1' ||
    normalized === 'yes' ||
    normalized === 'on'
  );
}

export function isAdminRole(value: unknown) {
  const normalized = normalizeInput(value);
  return normalized === 'owner' || normalized === 'admin';
}
