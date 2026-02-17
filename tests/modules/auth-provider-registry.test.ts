import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defineModule,
  validateModuleManifest
} from '../../lib/modules/manifest';
import {
  buildAuthProviderRegistry,
  resolveAuthProviderActionPath,
  resolveAuthProviderActionSlug,
  type ModuleRuntimeRow
} from '../../lib/modules/runtime';

test('buildAuthProviderRegistry resolves providers from enabled modules only', () => {
  const manifests = [
    defineModule({
      moduleId: 'mod.auth.a',
      version: '1.0.0',
      displayName: 'Auth A',
      authProviders: [
        {
          providerId: 'google',
          kind: 'oauth2',
          displayName: 'Google',
          routes: {
            startPath: '/start/google',
            callbackPath: '/callback/google'
          }
        }
      ]
    }),
    defineModule({
      moduleId: 'mod.auth.b',
      version: '1.0.0',
      displayName: 'Auth B',
      authProviders: [
        {
          providerId: 'github',
          kind: 'oauth2',
          displayName: 'GitHub'
        }
      ]
    })
  ];

  const runtimeRows: ModuleRuntimeRow[] = [
    {
      moduleId: 'mod.auth.a',
      status: 'enabled',
      version: '1.0.0',
      installMode: 'plugin'
    },
    {
      moduleId: 'mod.auth.b',
      status: 'disabled',
      version: '1.0.0',
      installMode: 'plugin'
    }
  ];

  const registry = buildAuthProviderRegistry({
    manifests,
    runtimeRows,
    enabledOnly: true
  });

  assert.equal(registry.issues.length, 0);
  assert.equal(registry.providers.length, 1);
  assert.equal(registry.providers[0]?.providerId, 'google');
  assert.equal(registry.providers[0]?.moduleId, 'mod.auth.a');
});

test('buildAuthProviderRegistry fails closed on duplicate provider ids', () => {
  const manifests = [
    defineModule({
      moduleId: 'mod.auth.alpha',
      version: '1.0.0',
      displayName: 'Auth Alpha',
      authProviders: [
        {
          providerId: 'google',
          kind: 'oauth2',
          displayName: 'Google Alpha'
        }
      ]
    }),
    defineModule({
      moduleId: 'mod.auth.beta',
      version: '1.0.0',
      displayName: 'Auth Beta',
      authProviders: [
        {
          providerId: 'google',
          kind: 'oauth2',
          displayName: 'Google Beta'
        }
      ]
    })
  ];

  const runtimeRows: ModuleRuntimeRow[] = [
    {
      moduleId: 'mod.auth.alpha',
      status: 'enabled',
      version: '1.0.0',
      installMode: 'plugin'
    },
    {
      moduleId: 'mod.auth.beta',
      status: 'enabled',
      version: '1.0.0',
      installMode: 'plugin'
    }
  ];

  const registry = buildAuthProviderRegistry({
    manifests,
    runtimeRows,
    enabledOnly: true
  });

  assert.equal(registry.providers.length, 0);
  assert.equal(registry.issues.length, 1);
  assert.equal(registry.issues[0]?.code, 'duplicate_provider_id');
  assert.equal(registry.issues[0]?.providerId, 'google');
});

test('auth provider action path/slug resolve from registry metadata', () => {
  const manifests = [
    defineModule({
      moduleId: 'mod.auth.passkey',
      version: '1.0.0',
      displayName: 'Passkey',
      authProviders: [
        {
          providerId: 'passkey',
          kind: 'passkey',
          routes: {
            startPath: '/authentication/options',
            callbackPath: '/authentication/verify',
            healthPath: '/health'
          }
        }
      ]
    })
  ];

  const runtimeRows: ModuleRuntimeRow[] = [
    {
      moduleId: 'mod.auth.passkey',
      status: 'enabled',
      version: '1.0.0',
      installMode: 'plugin'
    }
  ];

  const registry = buildAuthProviderRegistry({
    manifests,
    runtimeRows,
    enabledOnly: true
  });

  const provider = registry.providers[0];
  assert.ok(provider);
  assert.equal(
    resolveAuthProviderActionPath(provider, 'start'),
    '/authentication/options'
  );
  assert.deepEqual(resolveAuthProviderActionSlug(provider, 'start'), [
    'authentication',
    'options'
  ]);
  assert.deepEqual(resolveAuthProviderActionSlug(provider, 'callback'), [
    'authentication',
    'verify'
  ]);
  assert.deepEqual(resolveAuthProviderActionSlug(provider, 'health'), [
    'health'
  ]);
});

test('validateModuleManifest validates auth provider definitions', () => {
  const errors = validateModuleManifest(
    defineModule({
      moduleId: 'mod.auth.invalid',
      version: '1.0.0',
      displayName: 'Invalid Auth',
      authProviders: [
        {
          providerId: 'Google',
          kind: 'oauth2'
        },
        {
          providerId: 'google',
          kind: 'unknown' as 'oauth2'
        }
      ]
    })
  );

  assert.ok(errors.includes('module_auth_provider_id_invalid:0'));
  assert.ok(errors.includes('module_auth_provider_kind_invalid:1'));
});
