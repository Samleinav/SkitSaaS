import type {
  EnterpriseRoleMappingPolicy
} from './config';
import type { EnterpriseUserRole } from './constants';

function toTrimmedString(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function toLowerString(value: unknown) {
  return toTrimmedString(value).toLowerCase();
}

function normalizeEmail(value: unknown) {
  const normalized = toLowerString(value);
  if (!normalized || !normalized.includes('@')) {
    return null;
  }

  return normalized;
}

function normalizeRole(value: unknown) {
  const normalized = toLowerString(value);
  if (
    normalized === 'member' ||
    normalized === 'admin' ||
    normalized === 'owner'
  ) {
    return normalized as EnterpriseUserRole;
  }

  return null;
}

function readPathValue(claims: Record<string, unknown>, path: string) {
  const normalizedPath = toTrimmedString(path);
  if (!normalizedPath) {
    return undefined;
  }

  const segments = normalizedPath
    .split('.')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  let current: unknown = claims;
  for (const segment of segments) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
    if (current === undefined) {
      return undefined;
    }
  }

  return current;
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => toTrimmedString(entry))
      .filter((entry) => entry.length > 0);
  }

  const single = toTrimmedString(value);
  if (!single) {
    return [] as string[];
  }

  return [single];
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value > 0;
  }

  const normalized = toLowerString(value);
  if (!normalized) {
    return false;
  }

  return (
    normalized === '1' ||
    normalized === 'true' ||
    normalized === 'yes' ||
    normalized === 'on'
  );
}

function roleRank(role: EnterpriseUserRole) {
  if (role === 'owner') {
    return 30;
  }

  if (role === 'admin') {
    return 20;
  }

  return 10;
}

function chooseHighestRole(roles: EnterpriseUserRole[]) {
  if (!roles.length) {
    return null;
  }

  return roles.sort((left, right) => roleRank(right) - roleRank(left))[0] ?? null;
}

function resolveMappedRole({
  roleValues,
  groupValues,
  policy
}: {
  roleValues: string[];
  groupValues: string[];
  policy: EnterpriseRoleMappingPolicy;
}) {
  const candidates: EnterpriseUserRole[] = [];

  for (const value of roleValues) {
    const normalizedValue = toLowerString(value);
    const mapped = policy.roleMap[normalizedValue] ?? normalizeRole(normalizedValue);
    if (!mapped) {
      continue;
    }

    candidates.push(mapped);
  }

  for (const value of groupValues) {
    const normalizedValue = toLowerString(value);
    const mapped = policy.groupMap[normalizedValue];
    if (!mapped) {
      continue;
    }

    candidates.push(mapped);
  }

  const highest = chooseHighestRole(candidates);
  if (!highest) {
    return null;
  }

  if (!policy.allowedRoleTargets.includes(highest)) {
    return null;
  }

  return highest;
}

export type EnterpriseClaimProfile = {
  subject: string | null;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  groups: string[];
  mappedRole: EnterpriseUserRole | null;
};

export function mapEnterpriseClaimsToProfile({
  claims,
  policy
}: {
  claims: Record<string, unknown>;
  policy: EnterpriseRoleMappingPolicy;
}): EnterpriseClaimProfile {
  const subjectValue =
    readPathValue(claims, policy.subjectClaimPath) ?? claims.sub ?? claims.nameid;
  const emailValue =
    readPathValue(claims, policy.emailClaimPath) ?? claims.email;
  const emailVerifiedValue =
    readPathValue(claims, policy.emailVerifiedClaimPath) ?? claims.email_verified;
  const displayNameValue =
    readPathValue(claims, policy.displayNameClaimPath) ??
    claims.name ??
    claims.preferred_username;

  const roleValues = toStringArray(readPathValue(claims, policy.roleClaimPath));
  const groupValues = toStringArray(readPathValue(claims, policy.groupsClaimPath));

  return {
    subject: toTrimmedString(subjectValue) || null,
    email: normalizeEmail(emailValue),
    emailVerified: toBoolean(emailVerifiedValue),
    displayName: toTrimmedString(displayNameValue) || null,
    groups: groupValues,
    mappedRole: resolveMappedRole({
      roleValues,
      groupValues,
      policy
    })
  };
}

export function applyEnterpriseRolePolicy({
  currentRole,
  mappedRole,
  isNewUser,
  policy
}: {
  currentRole: EnterpriseUserRole;
  mappedRole: EnterpriseUserRole | null;
  isNewUser: boolean;
  policy: EnterpriseRoleMappingPolicy;
}) {
  const baselineRole = currentRole;
  if (!mappedRole) {
    return baselineRole;
  }

  if (!policy.allowRoleSync) {
    return baselineRole;
  }

  if (!policy.allowedRoleTargets.includes(mappedRole)) {
    return baselineRole;
  }

  if (isNewUser) {
    if (!policy.allowRoleElevation && roleRank(mappedRole) > roleRank('member')) {
      return 'member' as EnterpriseUserRole;
    }

    return mappedRole;
  }

  if (mappedRole === baselineRole) {
    return baselineRole;
  }

  const mappedRank = roleRank(mappedRole);
  const baselineRank = roleRank(baselineRole);

  if (!policy.allowRoleElevation && mappedRank > baselineRank) {
    return baselineRole;
  }

  if (mappedRank < baselineRank) {
    return baselineRole;
  }

  return mappedRole;
}
