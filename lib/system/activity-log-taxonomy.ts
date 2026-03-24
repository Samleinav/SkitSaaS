export const SYSTEM_ACTIVITY_EVENT_CATEGORIES = [
  'admin',
  'api',
  'auth',
  'checkout',
  'dashboard',
  'email',
  'event_bus',
  'forms',
  'module_runtime',
  'navigation',
  'payments',
  'proxy',
  'system'
] as const;

export type SystemActivityEventCategory =
  (typeof SYSTEM_ACTIVITY_EVENT_CATEGORIES)[number];

const SYSTEM_ACTIVITY_EVENT_CATEGORY_SET = new Set<string>(
  SYSTEM_ACTIVITY_EVENT_CATEGORIES
);

export function normalizeSystemActivityEventCategory(
  value: string | null | undefined
): SystemActivityEventCategory {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (
    normalized &&
    SYSTEM_ACTIVITY_EVENT_CATEGORY_SET.has(normalized)
  ) {
    return normalized as SystemActivityEventCategory;
  }

  return 'system';
}

export function isSystemActivityEventCategory(
  value: string | null | undefined
) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  return Boolean(
    normalized && SYSTEM_ACTIVITY_EVENT_CATEGORY_SET.has(normalized)
  );
}
