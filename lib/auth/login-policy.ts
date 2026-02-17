import { getEnabledAuthProviderRegistry } from '@/lib/modules/runtime';

export type AuthArea = 'admin' | 'dashboard';
export type AuthLoginMethod = 'password' | 'passkey' | 'social';

const ALLOWED_LOGIN_METHODS = new Set<AuthLoginMethod>([
  'password',
  'passkey',
  'social'
]);

const PROVIDER_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

function parseCsv(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

function uniquePreservingOrder(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
}

function readRawMethodsByArea(area: AuthArea) {
  return area === 'admin'
    ? process.env.AUTH_ADMIN_LOGIN_METHODS
    : process.env.AUTH_DASHBOARD_LOGIN_METHODS;
}

function readRawSocialProvidersByArea(area: AuthArea) {
  return area === 'admin'
    ? process.env.AUTH_ADMIN_SOCIAL_PROVIDERS
    : process.env.AUTH_DASHBOARD_SOCIAL_PROVIDERS;
}

function normalizeMethods(rawValue: string | undefined) {
  const parsed = parseCsv(rawValue).filter((value): value is AuthLoginMethod =>
    ALLOWED_LOGIN_METHODS.has(value as AuthLoginMethod)
  );

  if (parsed.length === 0) {
    return ['password'] as AuthLoginMethod[];
  }

  return uniquePreservingOrder(parsed) as AuthLoginMethod[];
}

function normalizeProviderIds(rawValue: string | undefined) {
  const parsed = parseCsv(rawValue).filter((value) =>
    PROVIDER_ID_PATTERN.test(value)
  );

  return uniquePreservingOrder(parsed);
}

export type LoginAreaPolicy = {
  area: AuthArea;
  methods: AuthLoginMethod[];
  allowPassword: boolean;
  allowPasskey: boolean;
  allowSocial: boolean;
  socialProviders: string[];
  defaultSocialProvider: string | null;
};

export function readLoginAreaPolicy(area: AuthArea): LoginAreaPolicy {
  const methods = normalizeMethods(readRawMethodsByArea(area));
  const socialProviders = normalizeProviderIds(readRawSocialProvidersByArea(area));
  const defaultSocialProviderRaw = String(
    process.env.AUTH_DEFAULT_SOCIAL_PROVIDER ?? ''
  )
    .trim()
    .toLowerCase();
  const defaultSocialProvider =
    PROVIDER_ID_PATTERN.test(defaultSocialProviderRaw) &&
    defaultSocialProviderRaw.length > 0
      ? defaultSocialProviderRaw
      : null;

  return {
    area,
    methods,
    allowPassword: methods.includes('password'),
    allowPasskey: methods.includes('passkey'),
    allowSocial: methods.includes('social'),
    socialProviders,
    defaultSocialProvider
  };
}

export function isPasswordLoginAllowedForArea(area: AuthArea) {
  return readLoginAreaPolicy(area).allowPassword;
}

export type LoginProviderOption = {
  providerId: string;
  displayName: string;
  kind: string;
  startPath: string;
};

function isSocialProviderKind(kind: string) {
  return kind === 'oauth2' || kind === 'oidc' || kind === 'saml';
}

export async function getLoginProviderOptionsForArea(
  area: AuthArea
): Promise<LoginProviderOption[]> {
  const policy = readLoginAreaPolicy(area);
  if (!policy.allowPasskey && !policy.allowSocial) {
    return [];
  }

  const registry = await getEnabledAuthProviderRegistry();
  const socialProviderFilter =
    policy.socialProviders.length > 0 ? new Set(policy.socialProviders) : null;

  const providers = registry.providers.filter((provider) => {
    if (provider.kind === 'passkey') {
      return policy.allowPasskey;
    }

    if (isSocialProviderKind(provider.kind)) {
      if (!policy.allowSocial) {
        return false;
      }

      if (!socialProviderFilter) {
        return true;
      }

      return socialProviderFilter.has(provider.providerId);
    }

    return false;
  });

  if (policy.defaultSocialProvider) {
    providers.sort((left, right) => {
      const leftPriority =
        left.providerId === policy.defaultSocialProvider ? 0 : 1;
      const rightPriority =
        right.providerId === policy.defaultSocialProvider ? 0 : 1;
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return 0;
    });
  }

  return providers.map((provider) => ({
    providerId: provider.providerId,
    displayName: provider.displayName,
    kind: provider.kind,
    startPath: `/api/auth/providers/${provider.providerId}/start`
  }));
}
