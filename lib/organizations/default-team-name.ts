const MAX_TEAM_NAME_LENGTH = 100;
const DEFAULT_TEAM_NAME_SUFFIX = "'s Team";
const DEFAULT_TEAM_NAME_FALLBACK = 'Team';

function normalizeText(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

export function buildDefaultTeamNameFromEmail(email: string) {
  const normalizedEmail = normalizeText(email) ?? DEFAULT_TEAM_NAME_FALLBACK;
  const maxBaseLength = Math.max(
    1,
    MAX_TEAM_NAME_LENGTH - DEFAULT_TEAM_NAME_SUFFIX.length
  );
  const trimmedBase =
    normalizeText(normalizedEmail.slice(0, maxBaseLength)) ??
    DEFAULT_TEAM_NAME_FALLBACK;

  return `${trimmedBase}${DEFAULT_TEAM_NAME_SUFFIX}`.slice(
    0,
    MAX_TEAM_NAME_LENGTH
  );
}
