import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isPasswordLoginAllowedForArea,
  readLoginAreaPolicy
} from '../../lib/auth/login-policy';

const LOGIN_POLICY_ENV_KEYS = [
  'AUTH_ADMIN_LOGIN_METHODS',
  'AUTH_DASHBOARD_LOGIN_METHODS',
  'AUTH_ADMIN_SOCIAL_PROVIDERS',
  'AUTH_DASHBOARD_SOCIAL_PROVIDERS',
  'AUTH_DEFAULT_SOCIAL_PROVIDER'
] as const;

async function withLoginPolicyEnv(
  overrides: Record<string, string | undefined>,
  run: () => Promise<void> | void
) {
  const previous = new Map<string, string | undefined>();
  for (const key of LOGIN_POLICY_ENV_KEYS) {
    previous.set(key, process.env[key]);
  }

  try {
    for (const key of LOGIN_POLICY_ENV_KEYS) {
      const nextValue = overrides[key];
      if (typeof nextValue === 'undefined') {
        delete process.env[key];
      } else {
        process.env[key] = nextValue;
      }
    }

    await run();
  } finally {
    for (const key of LOGIN_POLICY_ENV_KEYS) {
      const previousValue = previous.get(key);
      if (typeof previousValue === 'undefined') {
        delete process.env[key];
      } else {
        process.env[key] = previousValue;
      }
    }
  }
}

test('login policy defaults to password when method env is missing', async () => {
  await withLoginPolicyEnv({}, () => {
    const adminPolicy = readLoginAreaPolicy('admin');
    const dashboardPolicy = readLoginAreaPolicy('dashboard');

    assert.deepEqual(adminPolicy.methods, ['password']);
    assert.deepEqual(dashboardPolicy.methods, ['password']);
    assert.equal(adminPolicy.allowPassword, true);
    assert.equal(dashboardPolicy.allowPassword, true);
  });
});

test('login policy supports independent admin and dashboard methods', async () => {
  await withLoginPolicyEnv(
    {
      AUTH_ADMIN_LOGIN_METHODS: 'passkey',
      AUTH_DASHBOARD_LOGIN_METHODS: 'social'
    },
    () => {
      const adminPolicy = readLoginAreaPolicy('admin');
      const dashboardPolicy = readLoginAreaPolicy('dashboard');

      assert.deepEqual(adminPolicy.methods, ['passkey']);
      assert.equal(adminPolicy.allowPassword, false);
      assert.equal(adminPolicy.allowPasskey, true);
      assert.equal(adminPolicy.allowSocial, false);

      assert.deepEqual(dashboardPolicy.methods, ['social']);
      assert.equal(dashboardPolicy.allowPassword, false);
      assert.equal(dashboardPolicy.allowPasskey, false);
      assert.equal(dashboardPolicy.allowSocial, true);
    }
  );
});

test('login policy keeps only valid method tokens', async () => {
  await withLoginPolicyEnv(
    {
      AUTH_ADMIN_LOGIN_METHODS: 'password,invalid,social,passkey,social'
    },
    () => {
      const adminPolicy = readLoginAreaPolicy('admin');
      assert.deepEqual(adminPolicy.methods, ['password', 'social', 'passkey']);
    }
  );
});

test('login policy resolves per-area social providers and default provider', async () => {
  await withLoginPolicyEnv(
    {
      AUTH_DASHBOARD_LOGIN_METHODS: 'social',
      AUTH_DASHBOARD_SOCIAL_PROVIDERS: 'google,github,invalid/provider,google',
      AUTH_DEFAULT_SOCIAL_PROVIDER: 'github'
    },
    () => {
      const dashboardPolicy = readLoginAreaPolicy('dashboard');
      assert.deepEqual(dashboardPolicy.socialProviders, ['google', 'github']);
      assert.equal(dashboardPolicy.defaultSocialProvider, 'github');
    }
  );
});

test('isPasswordLoginAllowedForArea follows configured methods', async () => {
  await withLoginPolicyEnv(
    {
      AUTH_ADMIN_LOGIN_METHODS: 'passkey',
      AUTH_DASHBOARD_LOGIN_METHODS: 'password,social'
    },
    () => {
      assert.equal(isPasswordLoginAllowedForArea('admin'), false);
      assert.equal(isPasswordLoginAllowedForArea('dashboard'), true);
    }
  );
});
