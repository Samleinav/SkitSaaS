const TRUTHY_ENV_VALUES = new Set(['true', '1', 'yes', 'on']);
const FALSY_ENV_VALUES = new Set(['false', '0', 'no', 'off']);

function parseBooleanFlag(value: string | null, fallback: boolean) {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (TRUTHY_ENV_VALUES.has(normalized)) {
    return true;
  }

  if (FALSY_ENV_VALUES.has(normalized)) {
    return false;
  }

  return fallback;
}

export function areTeamsEnabled() {
  const rawValue = process.env.TEAMS_ENABLED?.trim() ?? null;
  return parseBooleanFlag(rawValue, true);
}
