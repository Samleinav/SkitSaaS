import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearBreakGlassPasswordFailureState,
  evaluateBreakGlassPasswordPolicy,
  registerBreakGlassPasswordFailure,
  resetBreakGlassPasswordFailureStateForTests,
  resolveClientIpAddress
} from '../../lib/auth/break-glass';

const BREAK_GLASS_ENV_KEYS = [
  'AUTH_BREAK_GLASS_EMAILS',
  'AUTH_BREAK_GLASS_REQUIRE_PASSKEY',
  'AUTH_BREAK_GLASS_ALLOW_PASSWORD_BYPASS',
  'AUTH_BREAK_GLASS_ALLOWED_IPS',
  'AUTH_BREAK_GLASS_MAX_ATTEMPTS',
  'AUTH_BREAK_GLASS_WINDOW_SECONDS',
  'AUTH_BREAK_GLASS_LOCKOUT_SECONDS'
] as const;

async function withBreakGlassEnv(
  overrides: Record<string, string | undefined>,
  run: () => Promise<void> | void
) {
  const previous = new Map<string, string | undefined>();
  for (const key of BREAK_GLASS_ENV_KEYS) {
    previous.set(key, process.env[key]);
  }

  try {
    resetBreakGlassPasswordFailureStateForTests();

    for (const key of BREAK_GLASS_ENV_KEYS) {
      const nextValue = overrides[key];
      if (typeof nextValue === 'undefined') {
        delete process.env[key];
      } else {
        process.env[key] = nextValue;
      }
    }

    await run();
  } finally {
    resetBreakGlassPasswordFailureStateForTests();
    for (const key of BREAK_GLASS_ENV_KEYS) {
      const previousValue = previous.get(key);
      if (typeof previousValue === 'undefined') {
        delete process.env[key];
      } else {
        process.env[key] = previousValue;
      }
    }
  }
}

test('break-glass policy blocks password login when passkey is required', async () => {
  await withBreakGlassEnv(
    {
      AUTH_BREAK_GLASS_EMAILS: 'owner@example.com',
      AUTH_BREAK_GLASS_REQUIRE_PASSKEY: 'true',
      AUTH_BREAK_GLASS_ALLOW_PASSWORD_BYPASS: 'false'
    },
    () => {
      const decision = evaluateBreakGlassPasswordPolicy({
        email: 'owner@example.com',
        ipAddress: '198.51.100.25'
      });
      assert.equal(decision.isBreakGlassUser, true);
      assert.equal(decision.allowed, false);
      assert.equal(decision.reason, 'passkey_required');
    }
  );
});

test('break-glass policy supports emergency bypass toggle', async () => {
  await withBreakGlassEnv(
    {
      AUTH_BREAK_GLASS_EMAILS: 'owner@example.com',
      AUTH_BREAK_GLASS_REQUIRE_PASSKEY: 'true',
      AUTH_BREAK_GLASS_ALLOW_PASSWORD_BYPASS: 'true'
    },
    () => {
      const decision = evaluateBreakGlassPasswordPolicy({
        email: 'owner@example.com',
        ipAddress: '198.51.100.25'
      });
      assert.equal(decision.isBreakGlassUser, true);
      assert.equal(decision.allowed, true);
      assert.equal(decision.reason, 'allowed');
    }
  );
});

test('break-glass policy enforces IP allowlist when configured', async () => {
  await withBreakGlassEnv(
    {
      AUTH_BREAK_GLASS_EMAILS: 'owner@example.com',
      AUTH_BREAK_GLASS_REQUIRE_PASSKEY: 'false',
      AUTH_BREAK_GLASS_ALLOWED_IPS: '10.0.0.10'
    },
    () => {
      const blockedDecision = evaluateBreakGlassPasswordPolicy({
        email: 'owner@example.com',
        ipAddress: '203.0.113.1'
      });
      assert.equal(blockedDecision.allowed, false);
      assert.equal(blockedDecision.reason, 'ip_not_allowed');

      const allowedDecision = evaluateBreakGlassPasswordPolicy({
        email: 'owner@example.com',
        ipAddress: '10.0.0.10'
      });
      assert.equal(allowedDecision.allowed, true);
      assert.equal(allowedDecision.reason, 'allowed');
    }
  );
});

test('break-glass policy applies lockout after repeated failures', async () => {
  await withBreakGlassEnv(
    {
      AUTH_BREAK_GLASS_EMAILS: 'owner@example.com',
      AUTH_BREAK_GLASS_REQUIRE_PASSKEY: 'false',
      AUTH_BREAK_GLASS_MAX_ATTEMPTS: '2',
      AUTH_BREAK_GLASS_WINDOW_SECONDS: '600',
      AUTH_BREAK_GLASS_LOCKOUT_SECONDS: '120'
    },
    () => {
      const nowMs = Date.parse('2026-02-16T12:00:00.000Z');
      const firstFailure = registerBreakGlassPasswordFailure({
        email: 'owner@example.com',
        ipAddress: '198.51.100.25',
        nowMs
      });
      assert.ok(firstFailure);
      assert.equal(firstFailure?.isLocked, false);

      const secondFailure = registerBreakGlassPasswordFailure({
        email: 'owner@example.com',
        ipAddress: '198.51.100.25',
        nowMs: nowMs + 1_000
      });
      assert.ok(secondFailure);
      assert.equal(secondFailure?.isLocked, true);
      assert.ok((secondFailure?.retryAfterSeconds ?? 0) > 0);

      const decision = evaluateBreakGlassPasswordPolicy({
        email: 'owner@example.com',
        ipAddress: '198.51.100.25',
        nowMs: nowMs + 2_000
      });
      assert.equal(decision.allowed, false);
      assert.equal(decision.reason, 'locked_out');
      assert.ok((decision.retryAfterSeconds ?? 0) > 0);
    }
  );
});

test('break-glass failure state can be cleared after successful auth', async () => {
  await withBreakGlassEnv(
    {
      AUTH_BREAK_GLASS_EMAILS: 'owner@example.com',
      AUTH_BREAK_GLASS_REQUIRE_PASSKEY: 'false',
      AUTH_BREAK_GLASS_MAX_ATTEMPTS: '3',
      AUTH_BREAK_GLASS_WINDOW_SECONDS: '600',
      AUTH_BREAK_GLASS_LOCKOUT_SECONDS: '120'
    },
    () => {
      registerBreakGlassPasswordFailure({
        email: 'owner@example.com',
        ipAddress: '198.51.100.25'
      });

      clearBreakGlassPasswordFailureState({
        email: 'owner@example.com',
        ipAddress: '198.51.100.25'
      });

      const decision = evaluateBreakGlassPasswordPolicy({
        email: 'owner@example.com',
        ipAddress: '198.51.100.25'
      });
      assert.equal(decision.allowed, true);
      assert.equal(decision.reason, 'allowed');
    }
  );
});

test('resolveClientIpAddress prioritizes x-forwarded-for then x-real-ip', () => {
  const fromForwarded = resolveClientIpAddress({
    xForwardedFor: '198.51.100.7, 10.0.0.1',
    xRealIp: '192.168.1.20'
  });
  assert.equal(fromForwarded, '198.51.100.7');

  const fromRealIp = resolveClientIpAddress({
    xForwardedFor: '',
    xRealIp: '192.168.1.20'
  });
  assert.equal(fromRealIp, '192.168.1.20');
});
