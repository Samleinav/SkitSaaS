import assert from 'node:assert/strict';
import test from 'node:test';
import {
  configureAuth,
  configureDatabase,
  configureModuleConfig
} from '@skitsaas/sdk/server';
import enterpriseSsoManifest from '../../modules/mod.auth.enterprise-sso/src/manifest';

type ConfigStore = Map<string, string | null>;

type DbState = {
  consumedState: Record<string, unknown> | null;
  selectRows: Array<Record<string, unknown> | null>;
  insertCalls: Array<Record<string, unknown>>;
};

function configureConfigAdapter(store: ConfigStore) {
  configureModuleConfig({
    getConfigValue: async (namespace, configKey) => {
      return store.get(`${namespace}:${configKey}`) ?? null;
    },
    setConfigValue: async (namespace, configKey, configValue) => {
      store.set(`${namespace}:${configKey}`, configValue);
    }
  });
}

function configureDbStub(state: DbState) {
  const queue = [...state.selectRows];

  const dbStub = {
    update() {
      return {
        set() {
          return {
            where() {
              return {
                async returning() {
                  return state.consumedState ? [state.consumedState] : [];
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
                  const next = queue.length > 0 ? queue.shift() : null;
                  return next ? [next] : [];
                }
              };
            }
          };
        }
      };
    },
    insert() {
      return {
        async values(values: Record<string, unknown>) {
          state.insertCalls.push(values);
          return [];
        }
      };
    }
  };

  configureDatabase({
    getDb: () => dbStub
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

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json'
    }
  });
}

function baseEnterpriseStore() {
  return new Map<string, string | null>([
    ['mod.auth.enterprise-sso.config:enabled', '1'],
    ['mod.auth.enterprise-sso.config:tenants', 'acme'],
    ['mod.auth.enterprise-sso.config:default_tenant', 'acme'],
    ['mod.auth.enterprise-sso.config:tenant.acme.enabled', '1'],
    ['mod.auth.enterprise-sso.config:tenant.acme.login_areas', 'admin,dashboard'],
    ['mod.auth.enterprise-sso.config:tenant.acme.group_map_json', '{"idp-owner":"owner"}'],
    ['mod.auth.enterprise-sso.config:tenant.acme.oidc.enabled', '1'],
    ['mod.auth.enterprise-sso.config:tenant.acme.oidc.client_id', 'acme-client'],
    ['mod.auth.enterprise-sso.config:tenant.acme.oidc.client_secret', 'acme-secret'],
    ['mod.auth.enterprise-sso.config:tenant.acme.oidc.authorize_url', 'https://idp.example/authorize'],
    ['mod.auth.enterprise-sso.config:tenant.acme.oidc.token_url', 'https://idp.example/token'],
    ['mod.auth.enterprise-sso.config:tenant.acme.oidc.user_info_url', 'https://idp.example/userinfo'],
    ['mod.auth.enterprise-sso.config:tenant.acme.oidc.verify_id_token', 'false'],
    ['mod.auth.enterprise-sso.config:tenant.acme.saml.enabled', '1'],
    ['mod.auth.enterprise-sso.config:tenant.acme.saml.entity_id', 'urn:sp:acme'],
    ['mod.auth.enterprise-sso.config:tenant.acme.saml.idp_entity_id', 'urn:idp:acme'],
    ['mod.auth.enterprise-sso.config:tenant.acme.saml.sso_url', 'https://idp.example/saml/sso'],
    ['mod.auth.enterprise-sso.config:tenant.acme.saml.x509_cert', 'CERTDATA'],
    ['mod.auth.enterprise-sso.config:tenant.acme.saml.expected_audience', 'urn:sp:acme']
  ]);
}

test('enterprise sso health route exposes tenant provider summaries', async () => {
  process.env.BASE_URL = 'https://app.example';
  configureConfigAdapter(baseEnterpriseStore());
  configureDbStub({
    consumedState: null,
    selectRows: [],
    insertCalls: []
  });
  configureAuth({
    getUser: async () => null
  });

  assert.ok(enterpriseSsoManifest.apiHandler);
  const response = await enterpriseSsoManifest.apiHandler!(
    new Request('https://example.test/api/modules/mod.auth.enterprise-sso/health', {
      method: 'GET'
    }),
    {
      moduleId: enterpriseSsoManifest.moduleId,
      slug: ['health']
    }
  );

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    ok: boolean;
    providers: Array<{ providerId: string; tenantId: string }>;
  };

  assert.equal(body.ok, true);
  assert.ok(
    body.providers.some(
      (provider) =>
        provider.providerId === 'enterprise-oidc' && provider.tenantId === 'acme'
    )
  );
  assert.ok(
    body.providers.some(
      (provider) =>
        provider.providerId === 'enterprise-saml' && provider.tenantId === 'acme'
    )
  );
});

test('enterprise oidc start route fails closed when tenant cannot be resolved', async () => {
  process.env.BASE_URL = 'https://app.example';
  const store = baseEnterpriseStore();
  store.delete('mod.auth.enterprise-sso.config:tenants');
  store.delete('mod.auth.enterprise-sso.config:default_tenant');

  configureConfigAdapter(store);
  configureDbStub({
    consumedState: null,
    selectRows: [],
    insertCalls: []
  });
  configureAuth({
    getUser: async () => null
  });

  assert.ok(enterpriseSsoManifest.apiHandler);
  const response = await enterpriseSsoManifest.apiHandler!(
    new Request('https://example.test/api/modules/mod.auth.enterprise-sso/start/oidc', {
      method: 'GET',
      headers: {
        accept: 'application/json'
      }
    }),
    {
      moduleId: enterpriseSsoManifest.moduleId,
      slug: ['start', 'oidc']
    }
  );

  assert.equal(response.status, 409);
  const body = (await response.json()) as { ok: boolean; error: string };
  assert.equal(body.ok, false);
  assert.equal(body.error, 'tenant_not_resolved');
});

test('enterprise oidc callback does not elevate member to admin via mapped claims', async () => {
  process.env.BASE_URL = 'https://app.example';
  configureConfigAdapter(baseEnterpriseStore());

  const dbState: DbState = {
    consumedState: {
      tenantId: 'acme',
      area: 'admin',
      stateNonce: null,
      pkceCodeVerifier: null,
      relayRequestId: null,
      redirectTo: null
    },
    selectRows: [
      null,
      {
        id: 15,
        email: 'member@example.com',
        role: 'member',
        accountStatus: 'active',
        deletedAt: null
      },
      null
    ],
    insertCalls: []
  };
  configureDbStub(dbState);

  const sessionCalls: number[] = [];
  configureAuth({
    getUser: async () => null,
    setSessionForUser: async (userId) => {
      sessionCalls.push(userId);
    }
  });

  await withFetchStub(
    async () => {
      assert.ok(enterpriseSsoManifest.apiHandler);
      const response = await enterpriseSsoManifest.apiHandler!(
        new Request(
          'https://example.test/api/modules/mod.auth.enterprise-sso/callback/oidc?state=state-1&code=code-1',
          {
            method: 'GET',
            headers: {
              accept: 'application/json'
            }
          }
        ),
        {
          moduleId: enterpriseSsoManifest.moduleId,
          slug: ['callback', 'oidc']
        }
      );

      assert.equal(response.status, 403);
      const body = (await response.json()) as {
        ok: boolean;
        error: string;
      };
      assert.equal(body.ok, false);
      assert.equal(body.error, 'admin_access_required');
    },
    (url) => {
      if (url.includes('/token')) {
        return createJsonResponse({
          access_token: 'access-1'
        });
      }

      if (url.includes('/userinfo')) {
        return createJsonResponse({
          sub: 'subject-1',
          email: 'member@example.com',
          email_verified: true,
          name: 'Member User',
          groups: ['idp-owner']
        });
      }

      return createJsonResponse({ error: 'unexpected_fetch_call', url }, 500);
    }
  );

  assert.equal(sessionCalls.length, 0);
  assert.equal(dbState.insertCalls.length, 1);
});

test('enterprise oidc start route fails closed when provider config is invalid', async () => {
  process.env.BASE_URL = 'https://app.example';
  const store = baseEnterpriseStore();
  store.delete('mod.auth.enterprise-sso.config:tenant.acme.oidc.token_url');

  configureConfigAdapter(store);
  configureDbStub({
    consumedState: null,
    selectRows: [],
    insertCalls: []
  });
  configureAuth({
    getUser: async () => null
  });

  assert.ok(enterpriseSsoManifest.apiHandler);
  const response = await enterpriseSsoManifest.apiHandler!(
    new Request('https://example.test/api/modules/mod.auth.enterprise-sso/start/oidc', {
      method: 'GET',
      headers: {
        accept: 'application/json'
      }
    }),
    {
      moduleId: enterpriseSsoManifest.moduleId,
      slug: ['start', 'oidc']
    }
  );

  assert.equal(response.status, 503);
  const body = (await response.json()) as {
    ok: boolean;
    error: string;
    tenantId?: string;
  };
  assert.equal(body.ok, false);
  assert.equal(body.error, 'provider_not_ready');
  assert.equal(body.tenantId, 'acme');
});

test('enterprise oidc callback completes dashboard login for configured tenant', async () => {
  process.env.BASE_URL = 'https://app.example';
  configureConfigAdapter(baseEnterpriseStore());

  const dbState: DbState = {
    consumedState: {
      tenantId: 'acme',
      area: 'dashboard',
      stateNonce: null,
      pkceCodeVerifier: null,
      relayRequestId: null,
      redirectTo: null
    },
    selectRows: [
      null,
      {
        id: 22,
        email: 'dashboard@example.com',
        role: 'member',
        accountStatus: 'active',
        deletedAt: null
      },
      null
    ],
    insertCalls: []
  };
  configureDbStub(dbState);

  const sessionCalls: number[] = [];
  configureAuth({
    getUser: async () => null,
    setSessionForUser: async (userId) => {
      sessionCalls.push(userId);
    }
  });

  await withFetchStub(
    async () => {
      assert.ok(enterpriseSsoManifest.apiHandler);
      const response = await enterpriseSsoManifest.apiHandler!(
        new Request(
          'https://example.test/api/modules/mod.auth.enterprise-sso/callback/oidc?state=state-2&code=code-2',
          {
            method: 'GET',
            headers: {
              accept: 'application/json'
            }
          }
        ),
        {
          moduleId: enterpriseSsoManifest.moduleId,
          slug: ['callback', 'oidc']
        }
      );

      assert.equal(response.status, 200);
      const body = (await response.json()) as {
        ok: boolean;
        providerId: string;
        tenantId: string;
        userId: number;
        redirectTo: string;
      };
      assert.equal(body.ok, true);
      assert.equal(body.providerId, 'enterprise-oidc');
      assert.equal(body.tenantId, 'acme');
      assert.equal(body.userId, 22);
      assert.equal(body.redirectTo, '/dashboard');
    },
    (url) => {
      if (url.includes('/token')) {
        return createJsonResponse({
          access_token: 'access-2'
        });
      }

      if (url.includes('/userinfo')) {
        return createJsonResponse({
          sub: 'subject-2',
          email: 'dashboard@example.com',
          email_verified: true,
          name: 'Dashboard User',
          groups: ['idp-owner']
        });
      }

      return createJsonResponse({ error: 'unexpected_fetch_call', url }, 500);
    }
  );

  assert.deepEqual(sessionCalls, [22]);
  assert.equal(dbState.insertCalls.length, 1);
});
