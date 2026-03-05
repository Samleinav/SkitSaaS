import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeModuleRuntimeMode,
  resolveAppConfig
} from '../../lib/runtime-config/load-app-config';

test('normalizeModuleRuntimeMode accepts db, config and hybrid', () => {
  assert.equal(normalizeModuleRuntimeMode('db'), 'db');
  assert.equal(normalizeModuleRuntimeMode('config'), 'config');
  assert.equal(normalizeModuleRuntimeMode('hybrid'), 'hybrid');
  assert.equal(normalizeModuleRuntimeMode('unknown'), 'db');
});

test('resolveAppConfig applies env project and mode overrides', () => {
  const resolved = resolveAppConfig({
    source: {
      projectName: 'School SaaS',
      moduleRuntimeMode: 'db',
      modules: {}
    },
    env: {
      NODE_ENV: 'test',
      APP_PROJECT_NAME: 'School SaaS Staging',
      MODULE_RUNTIME_MODE: 'config'
    } as unknown as NodeJS.ProcessEnv
  });

  assert.equal(resolved.projectName, 'School SaaS Staging');
  assert.equal(resolved.moduleRuntimeMode, 'config');
});

test('resolveAppConfig applies module enable and disable env overrides', () => {
  const resolved = resolveAppConfig({
    source: {
      projectName: 'School SaaS',
      moduleRuntimeMode: 'hybrid',
      modules: {
        'mod.alpha': true,
        'mod.beta': true,
        'mod.gamma': false
      }
    },
    env: {
      NODE_ENV: 'test',
      ACTIVE_MODULES_ENABLE: 'mod.gamma,mod.delta',
      ACTIVE_MODULES_DISABLE: 'mod.beta'
    } as unknown as NodeJS.ProcessEnv
  });

  assert.equal(resolved.modules['mod.alpha'], true);
  assert.equal(resolved.modules['mod.beta'], false);
  assert.equal(resolved.modules['mod.gamma'], true);
  assert.equal(resolved.modules['mod.delta'], true);
});
