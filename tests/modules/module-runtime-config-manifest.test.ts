import assert from 'node:assert/strict';
import test from 'node:test';
import { defineModule, validateModuleManifest } from '../../lib/modules/manifest';

test('validateModuleManifest accepts runtime config fields for admin BuildForm rendering', () => {
  const manifest = defineModule({
    moduleId: 'mod.runtime.valid',
    version: '1.0.0',
    displayName: 'Runtime Valid',
    runtimeConfig: {
      namespace: 'modules.mod.runtime.valid',
      fields: [
        {
          configKey: 'enabled',
          envKey: 'MOD_RUNTIME_VALID_ENABLED',
          kind: 'boolean',
          label: 'Enabled'
        },
        {
          configKey: 'environment',
          kind: 'select',
          label: 'Environment',
          options: [
            {
              value: 'sandbox',
              label: 'Sandbox'
            },
            {
              value: 'production',
              label: 'Production'
            }
          ]
        }
      ]
    }
  });

  assert.deepEqual(validateModuleManifest(manifest), []);
});

test('validateModuleManifest rejects runtime config select fields without options', () => {
  const manifest = defineModule({
    moduleId: 'mod.runtime.invalid-select',
    version: '1.0.0',
    displayName: 'Runtime Invalid Select',
    runtimeConfig: {
      fields: [
        {
          configKey: 'environment',
          kind: 'select',
          label: 'Environment'
        }
      ]
    }
  });

  assert.ok(
    validateModuleManifest(manifest).includes(
      'module_runtime_config_select_options_missing:0'
    )
  );
});

test('validateModuleManifest rejects duplicate runtime config fields in the same namespace', () => {
  const manifest = defineModule({
    moduleId: 'mod.runtime.duplicate',
    version: '1.0.0',
    displayName: 'Runtime Duplicate',
    runtimeConfig: {
      namespace: 'modules.mod.runtime.duplicate',
      fields: [
        {
          configKey: 'api_key',
          kind: 'password',
          label: 'API key'
        },
        {
          configKey: 'api_key',
          kind: 'text',
          label: 'API key copy'
        }
      ]
    }
  });

  assert.ok(
    validateModuleManifest(manifest).includes(
      'module_runtime_config_duplicate:modules.mod.runtime.duplicate:api_key'
    )
  );
});
