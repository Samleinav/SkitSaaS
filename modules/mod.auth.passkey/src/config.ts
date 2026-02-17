import { getModuleConfigValue } from '@skitsaas/sdk/server';
import { AUTH_PASSKEY_MODULE_ID } from './constants';

const PASSKEY_NAMESPACE = `${AUTH_PASSKEY_MODULE_ID}.config`;

async function readConfigValue(configKey: string) {
  const value = await getModuleConfigValue(PASSKEY_NAMESPACE, configKey);
  return value?.trim() ?? '';
}

function parseEnabled(value: string) {
  const normalized = value.toLowerCase();
  if (!normalized) {
    return false;
  }

  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function parsePositiveInt(value: string, fallbackValue: number, minimumValue = 1) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < minimumValue) {
    return fallbackValue;
  }

  return parsed;
}

export type PasskeyModuleRuntimeConfig = {
  enabled: boolean;
  rpId: string | null;
  rpName: string;
  expectedOrigin: string | null;
  requireUserVerification: boolean;
  challengeTtlSeconds: number;
  timeoutMs: number;
};

export async function getPasskeyModuleRuntimeConfig(): Promise<PasskeyModuleRuntimeConfig> {
  const [
    enabledRaw,
    rpIdRaw,
    rpNameRaw,
    expectedOriginRaw,
    requireUvRaw,
    challengeTtlRaw,
    timeoutMsRaw
  ] =
    await Promise.all([
      readConfigValue('enabled'),
      readConfigValue('rp_id'),
      readConfigValue('rp_name'),
      readConfigValue('expected_origin'),
      readConfigValue('require_user_verification'),
      readConfigValue('challenge_ttl_seconds'),
      readConfigValue('timeout_ms')
    ]);

  return {
    enabled: parseEnabled(enabledRaw),
    rpId: rpIdRaw || null,
    rpName: rpNameRaw || 'S-Kit SaaS',
    expectedOrigin: expectedOriginRaw || null,
    requireUserVerification: parseEnabled(requireUvRaw),
    challengeTtlSeconds: parsePositiveInt(challengeTtlRaw, 300, 30),
    timeoutMs: parsePositiveInt(timeoutMsRaw, 60_000, 10_000)
  };
}
