import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { appConfigs } from '@/lib/db/schema';
import {
  inferAppConfigIsSecret,
  mapLegacyProviderToNamespace,
  trimToNull,
} from './app-config';

export type AppConfigReplayPayload =
  | {
      operation: 'upsert';
      namespace: string;
      configKey: string;
      configValue: string;
      isSecret: boolean;
    }
  | {
      operation: 'delete';
      namespace: string;
      configKey: string;
    };

function normalizeProvider(provider: string) {
  return provider.trim().toLowerCase();
}

function normalizeConfigKey(configKey: string) {
  return configKey.trim();
}

export async function upsertAppConfigEntry({
  namespace,
  configKey,
  configValue,
  isSecret,
}: {
  namespace: string;
  configKey: string;
  configValue: string;
  isSecret: boolean;
}) {
  await db
    .insert(appConfigs)
    .values({
      namespace,
      configKey,
      configValue,
      isSecret,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [appConfigs.namespace, appConfigs.configKey],
      set: {
        configValue,
        isSecret,
        updatedAt: new Date(),
      },
    });
}

export async function deleteAppConfigEntry({
  namespace,
  configKey,
}: {
  namespace: string;
  configKey: string;
}) {
  await db
    .delete(appConfigs)
    .where(
      and(eq(appConfigs.namespace, namespace), eq(appConfigs.configKey, configKey))
    );
}

export async function applyAppConfigReplayPayload(payload: AppConfigReplayPayload) {
  if (payload.operation === 'upsert') {
    await upsertAppConfigEntry({
      namespace: payload.namespace,
      configKey: payload.configKey,
      configValue: payload.configValue,
      isSecret: payload.isSecret,
    });
    return;
  }

  await deleteAppConfigEntry({
    namespace: payload.namespace,
    configKey: payload.configKey,
  });
}

export async function writeProviderConfig({
  provider,
  configKey,
  configValue,
}: {
  provider: string;
  configKey: string;
  configValue: string;
}) {
  const normalizedProvider = normalizeProvider(provider);
  const normalizedConfigKey = normalizeConfigKey(configKey);

  if (!normalizedProvider || !normalizedConfigKey) {
    return;
  }

  const normalizedConfigValue = trimToNull(configValue);
  const namespace = mapLegacyProviderToNamespace(normalizedProvider);
  const isSecret = inferAppConfigIsSecret(normalizedConfigKey);

  if (normalizedConfigValue) {
    await upsertAppConfigEntry({
      namespace,
      configKey: normalizedConfigKey,
      configValue: normalizedConfigValue,
      isSecret,
    });
    return;
  }

  await deleteAppConfigEntry({
    namespace,
    configKey: normalizedConfigKey,
  });
}

// Legacy name kept for backwards compatibility with older scripts.
export const writeProviderConfigDualModel = writeProviderConfig;
