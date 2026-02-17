import { getPasskeyCapabilitySummary } from './data';

export async function renderPasskeyAdminPage() {
  const summary = await getPasskeyCapabilitySummary();
  return [
    'Passkey Auth Module',
    '',
    `Status: ${summary.status}`,
    `RP ID: ${summary.rpId ?? 'not set'}`,
    `Expected Origin: ${summary.expectedOrigin ?? 'not set'}`,
    `Require User Verification: ${summary.requireUserVerification ? 'yes' : 'no'}`,
    `Challenge TTL (seconds): ${summary.challengeTtlSeconds}`,
    `Request Timeout (ms): ${summary.timeoutMs}`,
    `Active Credentials: ${summary.activeCredentialCount ?? 'n/a'}`,
    `Pending Challenges: ${summary.pendingChallengeCount ?? 'n/a'}`,
    '',
    summary.message
  ].join('\n');
}

export async function renderPasskeyDashboardPage() {
  const summary = await getPasskeyCapabilitySummary();
  return [
    'Passkeys',
    '',
    'Use this module endpoint set to register and authenticate users with WebAuthn passkeys.',
    `Current status: ${summary.status}`,
    `Active credentials: ${summary.activeCredentialCount ?? 'n/a'}`
  ].join('\n');
}
