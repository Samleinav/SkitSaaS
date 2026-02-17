import { getAppConfigValueFromDb, trimToNull } from '@/lib/config/app-config';

type OrganizationConfigDefinition = {
  provider: 'organization';
  configKey: string;
  envKey: string;
  fallback?: string;
};

const ORGANIZATION_CONFIG_DEFINITIONS = {
  allowMultiOrganizations: {
    provider: 'organization',
    configKey: 'allow_multi_organizations',
    envKey: 'ALLOW_MULTI_ORGANIZATIONS',
    fallback: 'false'
  },
  maxOrganizationsPerUser: {
    provider: 'organization',
    configKey: 'max_organizations_per_user',
    envKey: 'MAX_ORGANIZATIONS_PER_USER'
  }
} as const satisfies Record<string, OrganizationConfigDefinition>;

export type OrganizationConfigName = keyof typeof ORGANIZATION_CONFIG_DEFINITIONS;

type OrganizationLimits = {
  allowMultiOrganizations: boolean;
  maxOrganizationsPerUser: number | null;
};

function getNonEmptyEnvValue(envKey: string) {
  return trimToNull(process.env[envKey]);
}

function parseBoolean(value: string | null) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return (
    normalized === 'true' ||
    normalized === '1' ||
    normalized === 'yes' ||
    normalized === 'on'
  );
}

function parsePositiveInteger(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export async function getOrganizationConfigValue(
  configName: OrganizationConfigName
) {
  const definition = ORGANIZATION_CONFIG_DEFINITIONS[configName];
  const envValue = getNonEmptyEnvValue(definition.envKey);
  if (envValue) {
    return envValue;
  }

  try {
    const dbValue = await getAppConfigValueFromDb(
      'organization.policy',
      definition.configKey
    );
    if (dbValue) {
      return dbValue;
    }
  } catch {
    // If DB is unavailable, continue with fallback behavior.
  }

  return ('fallback' in definition ? definition.fallback : undefined) ?? null;
}

export async function getOrganizationLimits(): Promise<OrganizationLimits> {
  const [allowMultiOrganizationsRaw, maxOrganizationsPerUserRaw] =
    await Promise.all([
      getOrganizationConfigValue('allowMultiOrganizations'),
      getOrganizationConfigValue('maxOrganizationsPerUser')
    ]);

  const allowMultiOrganizations = parseBoolean(allowMultiOrganizationsRaw);
  if (!allowMultiOrganizations) {
    return {
      allowMultiOrganizations: false,
      maxOrganizationsPerUser: 1
    };
  }

  return {
    allowMultiOrganizations: true,
    maxOrganizationsPerUser: parsePositiveInteger(maxOrganizationsPerUserRaw)
  };
}

export function canCreateOrganization({
  currentOrganizationCount,
  limits
}: {
  currentOrganizationCount: number;
  limits: OrganizationLimits;
}) {
  const maxOrganizationsPerUser = limits.maxOrganizationsPerUser;
  if (maxOrganizationsPerUser === null) {
    return true;
  }

  return currentOrganizationCount < maxOrganizationsPerUser;
}

export function getOrganizationConfigDefinitionsForAdmin() {
  return ORGANIZATION_CONFIG_DEFINITIONS;
}
