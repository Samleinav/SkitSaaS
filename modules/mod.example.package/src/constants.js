export const EXAMPLE_PACKAGE_MODULE_ID = 'mod.example.package';
export const EXAMPLE_PACKAGE_ADMIN_ALIAS = '/admin/custom/example-package';
export const EXAMPLE_PACKAGE_DASHBOARD_ALIAS = '/dashboard/custom/example-package';
export const EXAMPLE_PACKAGE_API_BASE = `/api/modules/${EXAMPLE_PACKAGE_MODULE_ID}`;

export const EXAMPLE_PACKAGE_ITEM_STATUSES = ['draft', 'active', 'archived'];
export const EXAMPLE_PACKAGE_API_WRITE_MODES = ['admin', 'authenticated'];

export const EXAMPLE_PACKAGE_DEFAULT_PRIORITY = 3;
export const EXAMPLE_PACKAGE_MIN_PRIORITY = 1;
export const EXAMPLE_PACKAGE_MAX_PRIORITY = 5;

export const EXAMPLE_PACKAGE_SETTINGS_KEYS = {
  allowDashboardCreate: 'allow_dashboard_create',
  apiWriteMode: 'api_write_mode',
  defaultStatus: 'default_status'
};

export const EXAMPLE_PACKAGE_DEFAULT_SETTINGS = {
  allowDashboardCreate: true,
  apiWriteMode: 'authenticated',
  defaultStatus: 'draft'
};

function normalizeInput(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
}

export function normalizeExamplePackageStatus(
  value,
  fallback = EXAMPLE_PACKAGE_DEFAULT_SETTINGS.defaultStatus
) {
  const normalized = normalizeInput(value);
  if (EXAMPLE_PACKAGE_ITEM_STATUSES.includes(normalized)) {
    return normalized;
  }

  return fallback;
}

export function normalizeExamplePackageApiWriteMode(
  value,
  fallback = EXAMPLE_PACKAGE_DEFAULT_SETTINGS.apiWriteMode
) {
  const normalized = normalizeInput(value);
  if (EXAMPLE_PACKAGE_API_WRITE_MODES.includes(normalized)) {
    return normalized;
  }

  return fallback;
}

export function normalizeExamplePackagePriority(
  value,
  fallback = EXAMPLE_PACKAGE_DEFAULT_PRIORITY
) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(
    EXAMPLE_PACKAGE_MAX_PRIORITY,
    Math.max(EXAMPLE_PACKAGE_MIN_PRIORITY, parsed)
  );
}

export function parseCheckboxValue(value) {
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

export function isAdminRole(value) {
  const normalized = normalizeInput(value);
  return normalized === 'owner' || normalized === 'admin';
}

export function toPositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}
