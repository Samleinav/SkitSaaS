import assert from 'node:assert/strict';
import test from 'node:test';
import {
  configureAuth,
  configureDatabase,
  configureModuleConfig
} from '@skitsaas/sdk/server';
import { loadOptionalPrivateModuleManifest } from './private-module-test-kit';

const passkeyModuleManifestPromise = loadOptionalPrivateModuleManifest(
  'modulesprivate/mod.auth.passkey/src/manifest.ts'
);
const socialLoginsModuleManifestPromise = loadOptionalPrivateModuleManifest(
  'modulesprivate/mod.auth.social-logins/src/manifest.ts'
);

async function requirePasskeyModuleManifest() {
  return passkeyModuleManifestPromise;
}

async function requireSocialLoginsModuleManifest() {
  return socialLoginsModuleManifestPromise;
}

type ConfigStore = Map<string, string | null>;
type SocialSelectRow = Record<string, unknown> | null;
type SocialOauthStateRow = {
  providerId: string;
  flow: string;
  area: string;
  stateNonce: string;
  pkceCodeVerifier: string | null;
  requestedByUserId: number | null;
  redirectTo: string | null;
} | null;

const SOCIAL_ENV_KEYS = [
  'AUTH_SOCIAL_STATE_TTL_SECONDS',
  'AUTH_SOCIAL_CALLBACK_BASE_URL',
  'AUTH_SOCIAL_GOOGLE_ENABLED',
  'AUTH_SOCIAL_GOOGLE_CLIENT_ID',
  'AUTH_SOCIAL_GOOGLE_CLIENT_SECRET',
  'AUTH_SOCIAL_GOOGLE_AUTHORIZE_URL',
  'AUTH_SOCIAL_GOOGLE_TOKEN_URL',
  'AUTH_SOCIAL_GOOGLE_USER_INFO_URL',
  'AUTH_SOCIAL_GOOGLE_EMAIL_INFO_URL',
  'AUTH_SOCIAL_GOOGLE_SCOPES',
  'AUTH_SOCIAL_GITHUB_ENABLED',
  'AUTH_SOCIAL_GITHUB_CLIENT_ID',
  'AUTH_SOCIAL_GITHUB_CLIENT_SECRET',
  'AUTH_SOCIAL_GITHUB_AUTHORIZE_URL',
  'AUTH_SOCIAL_GITHUB_TOKEN_URL',
  'AUTH_SOCIAL_GITHUB_USER_INFO_URL',
  'AUTH_SOCIAL_GITHUB_EMAIL_INFO_URL',
  'AUTH_SOCIAL_GITHUB_SCOPES',
  'AUTH_SOCIAL_X_ENABLED',
  'AUTH_SOCIAL_X_CLIENT_ID',
  'AUTH_SOCIAL_X_CLIENT_SECRET',
  'AUTH_SOCIAL_X_AUTHORIZE_URL',
  'AUTH_SOCIAL_X_TOKEN_URL',
  'AUTH_SOCIAL_X_USER_INFO_URL',
  'AUTH_SOCIAL_X_EMAIL_INFO_URL',
  'AUTH_SOCIAL_X_SCOPES'
] as const;

function clearSocialEnvOverrides() {
  for (const key of SOCIAL_ENV_KEYS) {
    delete process.env[key];
  }
}

function configureConfigAdapter(store: ConfigStore) {
  configureModuleConfig({
    getConfigValue: async (namespace, configKey) => {
      return store.get(`${namespace}:${configKey}`) ?? null;
    },
    setConfigValue: async (namespace, configKey, configValue) => {
      store.set(`${namespace}:${configKey}`, configValue);
    }
  });

  configureAuth({
    getUser: async () => null
  });
}

function configureDatabaseWithNoOauthState() {
  configureSocialDatabaseScenario({
    oauthStateRow: null,
    selectRows: []
  });
}

function configureSocialDatabaseScenario({
  oauthStateRow,
  selectRows
}: {
  oauthStateRow: SocialOauthStateRow;
  selectRows: SocialSelectRow[];
}) {
  const queue = [...selectRows];
  const dbStub = {
    update() {
      return {
        set() {
          return {
            where() {
              return {
                async returning() {
                  return oauthStateRow ? [oauthStateRow] : [];
                }
              };
            }
          };
        }
      };
    },
    select() {
      return {
        from() {
          return {
            where() {
              return {
                async limit() {
                  const nextRow = queue.length > 0 ? queue.shift() : null;
                  return nextRow ? [nextRow] : [];
                }
              };
            },
            async groupBy() {
              return [];
            }
          };
        }
      };
    }
  };

  configureDatabase({
    getDb: () => dbStub
  });
}

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json'
    }
  });
}

async function withFetchStub(
  run: () => Promise<void>,
  responder: (url: string) => Response
) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    return responder(url);
  }) as typeof fetch;

  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test('passkey auth module health route reports disabled status by default', async () => {
  const manifest = await requirePasskeyModuleManifest();
  if (!manifest) {
    return;
  }
  const store = new Map<string, string | null>();
  configureConfigAdapter(store);

  assert.ok(manifest.apiHandler);
  const response = await manifest.apiHandler!(
    new Request('https://example.test/api/modules/mod.auth.passkey/health', {
      method: 'GET'
    }),
    {
      moduleId: manifest.moduleId,
      slug: ['health']
    }
  );

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    ok: boolean;
    providerId: string;
    status: string;
  };
  assert.equal(body.ok, true);
  assert.equal(body.providerId, 'passkey');
  assert.equal(body.status, 'disabled');
});

test('passkey auth module health route reports ready when required config exists', async () => {
  const manifest = await requirePasskeyModuleManifest();
  if (!manifest) {
    return;
  }
  const store = new Map<string, string | null>([
    ['mod.auth.passkey.config:enabled', '1'],
    ['mod.auth.passkey.config:rp_id', 'localhost'],
    ['mod.auth.passkey.config:expected_origin', 'http://localhost:3000']
  ]);
  configureConfigAdapter(store);

  assert.ok(manifest.apiHandler);
  const response = await manifest.apiHandler!(
    new Request('https://example.test/api/modules/mod.auth.passkey/health', {
      method: 'GET'
    }),
    {
      moduleId: manifest.moduleId,
      slug: ['health']
    }
  );

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    status: string;
  };
  assert.equal(body.status, 'ready');
});

test('passkey auth start route is deterministically blocked when provider is disabled', async () => {
  const manifest = await requirePasskeyModuleManifest();
  if (!manifest) {
    return;
  }
  const store = new Map<string, string | null>();
  configureConfigAdapter(store);

  assert.ok(manifest.apiHandler);
  const response = await manifest.apiHandler!(
    new Request(
      'https://example.test/api/modules/mod.auth.passkey/authentication/options',
      {
        method: 'GET',
        headers: {
          accept: 'application/json'
        }
      }
    ),
    {
      moduleId: manifest.moduleId,
      slug: ['authentication', 'options']
    }
  );

  assert.equal(response.status, 503);
  const body = (await response.json()) as {
    ok: boolean;
    error: string;
    status: string;
  };
  assert.equal(body.ok, false);
  assert.equal(body.error, 'passkey_provider_not_ready');
  assert.equal(body.status, 'disabled');
});

test('social login module providers route returns supported provider set', async () => {
  const manifest = await requireSocialLoginsModuleManifest();
  if (!manifest) {
    return;
  }
  const store = new Map<string, string | null>();
  configureConfigAdapter(store);

  assert.ok(manifest.apiHandler);
  const response = await manifest.apiHandler!(
    new Request('https://example.test/api/modules/mod.auth.social-logins/providers', {
      method: 'GET'
    }),
    {
      moduleId: manifest.moduleId,
      slug: ['providers']
    }
  );

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    ok: boolean;
    providers: Array<{ providerId: string; status: string }>;
  };
  assert.equal(body.ok, true);
  assert.deepEqual(
    body.providers.map((provider) => provider.providerId),
    ['google', 'github', 'x']
  );
});

test('social login module rejects unsupported provider in start route', async () => {
  const manifest = await requireSocialLoginsModuleManifest();
  if (!manifest) {
    return;
  }
  const store = new Map<string, string | null>();
  configureConfigAdapter(store);

  assert.ok(manifest.apiHandler);
  const response = await manifest.apiHandler!(
    new Request('https://example.test/api/modules/mod.auth.social-logins/start/linkedin', {
      method: 'POST'
    }),
    {
      moduleId: manifest.moduleId,
      slug: ['start', 'linkedin']
    }
  );

  assert.equal(response.status, 404);
  const body = (await response.json()) as {
    ok: boolean;
    error: string;
  };
  assert.equal(body.ok, false);
  assert.equal(body.error, 'provider_not_supported');
});

test('social login callback rejects invalid payload when provider is enabled', async () => {
  const manifest = await requireSocialLoginsModuleManifest();
  if (!manifest) {
    return;
  }
  const store = new Map<string, string | null>([
    ['mod.auth.social-logins.config:provider.google.enabled', '1'],
    ['mod.auth.social-logins.config:provider.google.client_id', 'google-client-id'],
    ['mod.auth.social-logins.config:provider.google.client_secret', 'google-client-secret']
  ]);
  configureConfigAdapter(store);

  assert.ok(manifest.apiHandler);
  const response = await manifest.apiHandler!(
    new Request(
      'https://example.test/api/modules/mod.auth.social-logins/callback/google',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json'
        },
        body: JSON.stringify({})
      }
    ),
    {
      moduleId: manifest.moduleId,
      slug: ['callback', 'google']
    }
  );

  assert.equal(response.status, 400);
  const body = (await response.json()) as {
    ok: boolean;
    error: string;
  };
  assert.equal(body.ok, false);
  assert.equal(body.error, 'invalid_callback_payload');
});

test('social login callback rejects state replay/mismatch deterministically', async () => {
  const manifest = await requireSocialLoginsModuleManifest();
  if (!manifest) {
    return;
  }
  clearSocialEnvOverrides();
  const store = new Map<string, string | null>([
    ['mod.auth.social-logins.config:provider.google.enabled', '1'],
    ['mod.auth.social-logins.config:provider.google.client_id', 'google-client-id'],
    ['mod.auth.social-logins.config:provider.google.client_secret', 'google-client-secret']
  ]);
  configureConfigAdapter(store);
  configureDatabaseWithNoOauthState();

  assert.ok(manifest.apiHandler);
  const response = await manifest.apiHandler!(
    new Request(
      'https://example.test/api/modules/mod.auth.social-logins/callback/google?state=invalid-state&code=abc',
      {
        method: 'GET',
        headers: {
          accept: 'application/json'
        }
      }
    ),
    {
      moduleId: manifest.moduleId,
      slug: ['callback', 'google']
    }
  );

  assert.equal(response.status, 409);
  const body = (await response.json()) as {
    ok: boolean;
    error: string;
  };
  assert.equal(body.ok, false);
  assert.equal(body.error, 'oauth_state_invalid_or_expired');
});

test('social login callback completes successful Google login flow', async () => {
  const manifest = await requireSocialLoginsModuleManifest();
  if (!manifest) {
    return;
  }
  clearSocialEnvOverrides();
  const store = new Map<string, string | null>([
    ['mod.auth.social-logins.config:provider.google.enabled', '1'],
    ['mod.auth.social-logins.config:provider.google.client_id', 'google-client-id'],
    ['mod.auth.social-logins.config:provider.google.client_secret', 'google-client-secret']
  ]);
  configureConfigAdapter(store);

  const sessionCalls: number[] = [];
  configureAuth({
    getUser: async () => null,
    setSessionForUser: async (userId) => {
      sessionCalls.push(userId);
    }
  });
  configureSocialDatabaseScenario({
    oauthStateRow: {
      providerId: 'google',
      flow: 'login',
      area: 'dashboard',
      stateNonce: 'nonce-1',
      pkceCodeVerifier: 'pkce-verifier-1',
      requestedByUserId: null,
      redirectTo: null
    },
    selectRows: [
      {
        id: 101,
        userId: 77,
        providerId: 'google',
        providerSubject: 'google-sub-1'
      },
      {
        id: 77,
        email: 'user@example.com',
        role: 'member',
        accountStatus: 'active',
        deletedAt: null
      }
    ]
  });

  await withFetchStub(
    async () => {
      assert.ok(manifest.apiHandler);
      const response = await manifest.apiHandler!(
        new Request(
          'https://example.test/api/modules/mod.auth.social-logins/callback/google?state=state-1&code=auth-code-1',
          {
            method: 'GET',
            headers: {
              accept: 'application/json'
            }
          }
        ),
        {
          moduleId: manifest.moduleId,
          slug: ['callback', 'google']
        }
      );

      assert.equal(response.status, 200);
      const body = (await response.json()) as {
        ok: boolean;
        providerId: string;
        redirectTo: string;
        userId: number;
      };
      assert.equal(body.ok, true);
      assert.equal(body.providerId, 'google');
      assert.equal(body.redirectTo, '/dashboard');
      assert.equal(body.userId, 77);
    },
    (url) => {
      if (url.includes('oauth2.googleapis.com/token')) {
        return createJsonResponse({
          access_token: 'google-access-token',
          token_type: 'Bearer'
        });
      }

      if (url.includes('openidconnect.googleapis.com/v1/userinfo')) {
        return createJsonResponse({
          sub: 'google-sub-1',
          email: 'user@example.com',
          email_verified: true,
          name: 'Google User',
          picture: 'https://example.test/avatar.png'
        });
      }

      return createJsonResponse(
        {
          error: 'unexpected_fetch_call',
          url
        },
        500
      );
    }
  );

  assert.deepEqual(sessionCalls, [77]);
});

test('social login callback completes successful GitHub login flow', async () => {
  const manifest = await requireSocialLoginsModuleManifest();
  if (!manifest) {
    return;
  }
  clearSocialEnvOverrides();
  const store = new Map<string, string | null>([
    ['mod.auth.social-logins.config:provider.github.enabled', '1'],
    ['mod.auth.social-logins.config:provider.github.client_id', 'github-client-id'],
    ['mod.auth.social-logins.config:provider.github.client_secret', 'github-client-secret']
  ]);
  configureConfigAdapter(store);

  const sessionCalls: number[] = [];
  configureAuth({
    getUser: async () => null,
    setSessionForUser: async (userId) => {
      sessionCalls.push(userId);
    }
  });
  configureSocialDatabaseScenario({
    oauthStateRow: {
      providerId: 'github',
      flow: 'login',
      area: 'dashboard',
      stateNonce: 'nonce-2',
      pkceCodeVerifier: 'pkce-verifier-2',
      requestedByUserId: null,
      redirectTo: null
    },
    selectRows: [
      {
        id: 201,
        userId: 55,
        providerId: 'github',
        providerSubject: '12345'
      },
      {
        id: 55,
        email: 'octo@example.com',
        role: 'member',
        accountStatus: 'active',
        deletedAt: null
      }
    ]
  });

  await withFetchStub(
    async () => {
      assert.ok(manifest.apiHandler);
      const response = await manifest.apiHandler!(
        new Request(
          'https://example.test/api/modules/mod.auth.social-logins/callback/github?state=state-2&code=auth-code-2',
          {
            method: 'GET',
            headers: {
              accept: 'application/json'
            }
          }
        ),
        {
          moduleId: manifest.moduleId,
          slug: ['callback', 'github']
        }
      );

      assert.equal(response.status, 200);
      const body = (await response.json()) as {
        ok: boolean;
        providerId: string;
        redirectTo: string;
        userId: number;
      };
      assert.equal(body.ok, true);
      assert.equal(body.providerId, 'github');
      assert.equal(body.redirectTo, '/dashboard');
      assert.equal(body.userId, 55);
    },
    (url) => {
      if (url.includes('github.com/login/oauth/access_token')) {
        return createJsonResponse({
          access_token: 'github-access-token',
          token_type: 'bearer',
          scope: 'read:user user:email'
        });
      }

      if (url.includes('api.github.com/user/emails')) {
        return createJsonResponse([
          {
            email: 'octo@example.com',
            primary: true,
            verified: true
          }
        ]);
      }

      if (url.includes('api.github.com/user')) {
        return createJsonResponse({
          id: 12345,
          login: 'octocat',
          name: 'Octo Cat',
          avatar_url: 'https://example.test/octo.png'
        });
      }

      return createJsonResponse(
        {
          error: 'unexpected_fetch_call',
          url
        },
        500
      );
    }
  );

  assert.deepEqual(sessionCalls, [55]);
});

test('social login callback completes successful X login flow', async () => {
  const manifest = await requireSocialLoginsModuleManifest();
  if (!manifest) {
    return;
  }
  clearSocialEnvOverrides();
  const store = new Map<string, string | null>([
    ['mod.auth.social-logins.config:provider.x.enabled', '1'],
    ['mod.auth.social-logins.config:provider.x.client_id', 'x-client-id'],
    ['mod.auth.social-logins.config:provider.x.client_secret', 'x-client-secret']
  ]);
  configureConfigAdapter(store);

  const sessionCalls: number[] = [];
  configureAuth({
    getUser: async () => null,
    setSessionForUser: async (userId) => {
      sessionCalls.push(userId);
    }
  });
  configureSocialDatabaseScenario({
    oauthStateRow: {
      providerId: 'x',
      flow: 'login',
      area: 'dashboard',
      stateNonce: 'nonce-3',
      pkceCodeVerifier: 'pkce-verifier-3',
      requestedByUserId: null,
      redirectTo: null
    },
    selectRows: [
      {
        id: 301,
        userId: 44,
        providerId: 'x',
        providerSubject: 'x-sub-1'
      },
      {
        id: 44,
        email: 'x@example.com',
        role: 'member',
        accountStatus: 'active',
        deletedAt: null
      }
    ]
  });

  await withFetchStub(
    async () => {
      assert.ok(manifest.apiHandler);
      const response = await manifest.apiHandler!(
        new Request(
          'https://example.test/api/modules/mod.auth.social-logins/callback/x?state=state-3&code=auth-code-3',
          {
            method: 'GET',
            headers: {
              accept: 'application/json'
            }
          }
        ),
        {
          moduleId: manifest.moduleId,
          slug: ['callback', 'x']
        }
      );

      assert.equal(response.status, 200);
      const body = (await response.json()) as {
        ok: boolean;
        providerId: string;
        redirectTo: string;
        userId: number;
      };
      assert.equal(body.ok, true);
      assert.equal(body.providerId, 'x');
      assert.equal(body.redirectTo, '/dashboard');
      assert.equal(body.userId, 44);
    },
    (url) => {
      if (url.includes('api.twitter.com/2/oauth2/token')) {
        return createJsonResponse({
          access_token: 'x-access-token',
          token_type: 'bearer'
        });
      }

      if (url.includes('api.twitter.com/2/users/me')) {
        return createJsonResponse({
          data: {
            id: 'x-sub-1',
            name: 'X User',
            username: 'xuser',
            profile_image_url: 'https://example.test/x.png'
          }
        });
      }

      return createJsonResponse(
        {
          error: 'unexpected_fetch_call',
          url
        },
        500
      );
    }
  );

  assert.deepEqual(sessionCalls, [44]);
});

test('social login blocks new account linking when provider email is unverified', async () => {
  const manifest = await requireSocialLoginsModuleManifest();
  if (!manifest) {
    return;
  }
  clearSocialEnvOverrides();
  const store = new Map<string, string | null>([
    ['mod.auth.social-logins.config:provider.google.enabled', '1'],
    ['mod.auth.social-logins.config:provider.google.client_id', 'google-client-id'],
    ['mod.auth.social-logins.config:provider.google.client_secret', 'google-client-secret']
  ]);
  configureConfigAdapter(store);

  const sessionCalls: number[] = [];
  configureAuth({
    getUser: async () => null,
    setSessionForUser: async (userId) => {
      sessionCalls.push(userId);
    }
  });
  configureSocialDatabaseScenario({
    oauthStateRow: {
      providerId: 'google',
      flow: 'login',
      area: 'dashboard',
      stateNonce: 'nonce-4',
      pkceCodeVerifier: 'pkce-verifier-4',
      requestedByUserId: null,
      redirectTo: null
    },
    selectRows: [null]
  });

  await withFetchStub(
    async () => {
      assert.ok(manifest.apiHandler);
      const response = await manifest.apiHandler!(
        new Request(
          'https://example.test/api/modules/mod.auth.social-logins/callback/google?state=state-4&code=auth-code-4',
          {
            method: 'GET',
            headers: {
              accept: 'application/json'
            }
          }
        ),
        {
          moduleId: manifest.moduleId,
          slug: ['callback', 'google']
        }
      );

      assert.equal(response.status, 409);
      const body = (await response.json()) as {
        ok: boolean;
        error: string;
      };
      assert.equal(body.ok, false);
      assert.equal(body.error, 'email_verification_required');
    },
    (url) => {
      if (url.includes('oauth2.googleapis.com/token')) {
        return createJsonResponse({
          access_token: 'google-access-token',
          token_type: 'Bearer'
        });
      }

      if (url.includes('openidconnect.googleapis.com/v1/userinfo')) {
        return createJsonResponse({
          sub: 'google-unverified-sub',
          email: 'not-verified@example.com',
          email_verified: false,
          name: 'Unverified User'
        });
      }

      return createJsonResponse(
        {
          error: 'unexpected_fetch_call',
          url
        },
        500
      );
    }
  );

  assert.equal(sessionCalls.length, 0);
});

test('social link flow rejects provider account already linked to another user', async () => {
  const manifest = await requireSocialLoginsModuleManifest();
  if (!manifest) {
    return;
  }
  clearSocialEnvOverrides();
  const store = new Map<string, string | null>([
    ['mod.auth.social-logins.config:provider.google.enabled', '1'],
    ['mod.auth.social-logins.config:provider.google.client_id', 'google-client-id'],
    ['mod.auth.social-logins.config:provider.google.client_secret', 'google-client-secret']
  ]);
  configureConfigAdapter(store);

  const sessionCalls: number[] = [];
  configureAuth({
    getUser: async () => ({
      id: 10,
      role: 'member',
      email: 'current@example.com'
    }),
    setSessionForUser: async (userId) => {
      sessionCalls.push(userId);
    }
  });
  configureSocialDatabaseScenario({
    oauthStateRow: {
      providerId: 'google',
      flow: 'link',
      area: 'dashboard',
      stateNonce: 'nonce-5',
      pkceCodeVerifier: 'pkce-verifier-5',
      requestedByUserId: 10,
      redirectTo: null
    },
    selectRows: [
      {
        id: 10,
        email: 'current@example.com',
        role: 'member',
        accountStatus: 'active',
        deletedAt: null
      },
      {
        id: 808,
        userId: 999,
        providerId: 'google',
        providerSubject: 'google-sub-linked'
      }
    ]
  });

  await withFetchStub(
    async () => {
      assert.ok(manifest.apiHandler);
      const response = await manifest.apiHandler!(
        new Request(
          'https://example.test/api/modules/mod.auth.social-logins/callback/google?state=state-5&code=auth-code-5',
          {
            method: 'GET',
            headers: {
              accept: 'application/json'
            }
          }
        ),
        {
          moduleId: manifest.moduleId,
          slug: ['callback', 'google']
        }
      );

      assert.equal(response.status, 409);
      const body = (await response.json()) as {
        ok: boolean;
        error: string;
      };
      assert.equal(body.ok, false);
      assert.equal(body.error, 'provider_account_already_linked');
    },
    (url) => {
      if (url.includes('oauth2.googleapis.com/token')) {
        return createJsonResponse({
          access_token: 'google-access-token',
          token_type: 'Bearer'
        });
      }

      if (url.includes('openidconnect.googleapis.com/v1/userinfo')) {
        return createJsonResponse({
          sub: 'google-sub-linked',
          email: 'current@example.com',
          email_verified: true,
          name: 'Current User'
        });
      }

      return createJsonResponse(
        {
          error: 'unexpected_fetch_call',
          url
        },
        500
      );
    }
  );

  assert.equal(sessionCalls.length, 0);
});
