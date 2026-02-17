import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { appConfigs } from '@/lib/db/schema';

const LEGACY_PROVIDER_NAMESPACE_MAP = {
  stripe: 'payments.stripe',
  paypal: 'payments.paypal',
  smtp: 'email.smtp',
  organization: 'organization.policy',
} as const;

const NAMESPACE_LEGACY_PROVIDER_MAP = {
  'payments.stripe': 'stripe',
  'payments.paypal': 'paypal',
  'email.smtp': 'smtp',
  'organization.policy': 'organization'
} as const;

export function trimToNull(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

export function mapLegacyProviderToNamespace(provider: string) {
  const normalized = provider.trim().toLowerCase();
  if (!normalized) {
    return 'legacy.unknown';
  }

  const mappedNamespace =
    LEGACY_PROVIDER_NAMESPACE_MAP[
      normalized as keyof typeof LEGACY_PROVIDER_NAMESPACE_MAP
    ];

  if (mappedNamespace) {
    return mappedNamespace;
  }

  return `legacy.${normalized}`;
}

export function mapNamespaceToLegacyProvider(namespace: string) {
  const normalized = namespace.trim().toLowerCase();
  if (!normalized) {
    return 'unknown';
  }

  const mappedProvider =
    NAMESPACE_LEGACY_PROVIDER_MAP[
      normalized as keyof typeof NAMESPACE_LEGACY_PROVIDER_MAP
    ];
  if (mappedProvider) {
    return mappedProvider;
  }

  if (normalized.startsWith('legacy.')) {
    const provider = normalized.slice('legacy.'.length).trim();
    return provider || 'unknown';
  }

  return normalized.replace(/\./g, '_');
}

export function inferAppConfigIsSecret(configKey: string) {
  const normalized = configKey.trim().toLowerCase();
  return (
    normalized.includes('secret') ||
    normalized.includes('password') ||
    normalized.includes('token') ||
    normalized.endsWith('_key') ||
    normalized === 'key'
  );
}

export async function getAppConfigValueFromDb(
  namespace: string,
  configKey: string
) {
  const result = await db
    .select({
      configValue: appConfigs.configValue,
    })
    .from(appConfigs)
    .where(
      and(eq(appConfigs.namespace, namespace), eq(appConfigs.configKey, configKey))
    )
    .limit(1);

  return trimToNull(result[0]?.configValue);
}
