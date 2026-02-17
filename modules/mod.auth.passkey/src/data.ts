import { getPasskeyModuleRuntimeConfig } from './config';
import { getDb } from '@skitsaas/sdk/server';
import { count, isNull } from '@skitsaas/sdk/db';
import {
  modAuthPasskeyChallenges,
  modAuthPasskeyCredentials
} from '../db/schema';

export type PasskeyCapabilitySummary = {
  providerId: 'passkey';
  status: 'disabled' | 'ready' | 'misconfigured';
  rpId: string | null;
  expectedOrigin: string | null;
  requireUserVerification: boolean;
  challengeTtlSeconds: number;
  timeoutMs: number;
  activeCredentialCount: number | null;
  pendingChallengeCount: number | null;
  message: string;
};

async function readOperationalStats() {
  try {
    const db = getDb<any>();
    const [credentialCountRow] = await db
      .select({ count: count() })
      .from(modAuthPasskeyCredentials)
      .where(isNull(modAuthPasskeyCredentials.revokedAt));
    const [challengeCountRow] = await db
      .select({ count: count() })
      .from(modAuthPasskeyChallenges)
      .where(isNull(modAuthPasskeyChallenges.consumedAt));

    return {
      activeCredentialCount:
        typeof credentialCountRow?.count === 'number'
          ? credentialCountRow.count
          : 0,
      pendingChallengeCount:
        typeof challengeCountRow?.count === 'number' ? challengeCountRow.count : 0
    };
  } catch {
    return {
      activeCredentialCount: null,
      pendingChallengeCount: null
    };
  }
}

export async function getPasskeyCapabilitySummary(): Promise<PasskeyCapabilitySummary> {
  const config = await getPasskeyModuleRuntimeConfig();
  const stats = await readOperationalStats();

  if (!config.enabled) {
    return {
      providerId: 'passkey',
      status: 'disabled',
      rpId: config.rpId,
      expectedOrigin: config.expectedOrigin,
      requireUserVerification: config.requireUserVerification,
      challengeTtlSeconds: config.challengeTtlSeconds,
      timeoutMs: config.timeoutMs,
      activeCredentialCount: stats.activeCredentialCount,
      pendingChallengeCount: stats.pendingChallengeCount,
      message:
        'Passkey module is disabled. Enable mod.auth.passkey.config.enabled=1 to activate.'
    };
  }

  if (!config.rpId || !config.expectedOrigin) {
    return {
      providerId: 'passkey',
      status: 'misconfigured',
      rpId: config.rpId,
      expectedOrigin: config.expectedOrigin,
      requireUserVerification: config.requireUserVerification,
      challengeTtlSeconds: config.challengeTtlSeconds,
      timeoutMs: config.timeoutMs,
      activeCredentialCount: stats.activeCredentialCount,
      pendingChallengeCount: stats.pendingChallengeCount,
      message:
        'Passkey module is enabled but missing rp_id or expected_origin configuration.'
    };
  }

  return {
    providerId: 'passkey',
    status: 'ready',
    rpId: config.rpId,
    expectedOrigin: config.expectedOrigin,
    requireUserVerification: config.requireUserVerification,
    challengeTtlSeconds: config.challengeTtlSeconds,
    timeoutMs: config.timeoutMs,
    activeCredentialCount: stats.activeCredentialCount,
    pendingChallengeCount: stats.pendingChallengeCount,
    message:
      'Passkey provider is configured with WebAuthn challenge/verify endpoints.'
  };
}
