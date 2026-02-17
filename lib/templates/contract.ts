const SEMVER_REGEX =
  /^v?(?<major>\d+)(?:\.(?<minor>\d+))?(?:\.(?<patch>\d+))?(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

type Semver = {
  major: number;
  minor: number;
  patch: number;
};

export const TEMPLATE_CONTRACT_VERSION = '1.0.0';

function parseSemver(value: string): Semver | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const match = normalized.match(SEMVER_REGEX);
  if (!match || !match.groups) {
    return null;
  }

  const major = Number(match.groups.major ?? '0');
  const minor = Number(match.groups.minor ?? '0');
  const patch = Number(match.groups.patch ?? '0');
  if (![major, minor, patch].every((segment) => Number.isInteger(segment))) {
    return null;
  }

  return { major, minor, patch };
}

function compareSemver(a: Semver, b: Semver) {
  if (a.major !== b.major) {
    return a.major > b.major ? 1 : -1;
  }
  if (a.minor !== b.minor) {
    return a.minor > b.minor ? 1 : -1;
  }
  if (a.patch !== b.patch) {
    return a.patch > b.patch ? 1 : -1;
  }

  return 0;
}

function isCaretCompatible(host: Semver, required: Semver) {
  if (host.major !== required.major) {
    return false;
  }

  return compareSemver(host, required) >= 0;
}

export function isTemplateContractRangeSatisfied(
  range: string,
  hostVersion = TEMPLATE_CONTRACT_VERSION
): boolean | null {
  const host = parseSemver(hostVersion);
  if (!host) {
    return null;
  }

  const normalizedRange = range.trim();
  if (!normalizedRange) {
    return null;
  }

  if (normalizedRange === '*') {
    return true;
  }

  if (normalizedRange.startsWith('^')) {
    const required = parseSemver(normalizedRange.slice(1));
    if (!required) {
      return null;
    }

    return isCaretCompatible(host, required);
  }

  const required = parseSemver(normalizedRange);
  if (!required) {
    return null;
  }

  return compareSemver(host, required) === 0;
}

export type TemplateContractCompatibility =
  | 'compatible'
  | 'incompatible'
  | 'invalid';

export function resolveTemplateContractCompatibility(
  range: string,
  hostVersion = TEMPLATE_CONTRACT_VERSION
): TemplateContractCompatibility {
  const matches = isTemplateContractRangeSatisfied(range, hostVersion);
  if (matches === null) {
    return 'invalid';
  }

  return matches ? 'compatible' : 'incompatible';
}
