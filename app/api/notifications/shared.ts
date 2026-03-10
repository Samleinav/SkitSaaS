import type { NotificationRuntimeArea } from '@/lib/notifications/service';

export function normalizeNotificationRuntimeArea(
  value: unknown
): NotificationRuntimeArea | null {
  if (value === 'admin' || value === 'dashboard') {
    return value;
  }

  return null;
}

export function normalizeNotificationIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((entry) =>
          typeof entry === 'number' && Number.isInteger(entry) && entry > 0
            ? entry
            : null
        )
        .filter(Boolean) as number[]
    )
  ).sort((left, right) => left - right);
}

export function normalizeNotificationLimit(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}
