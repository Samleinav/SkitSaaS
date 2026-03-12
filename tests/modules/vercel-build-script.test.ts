import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildVercelCommandPlan,
  VERCEL_PREPARE_STEPS
} from '../../scripts/vercel-build.mjs';

test('vercel build plan includes generated artifact preparation before sync', () => {
  const plan = buildVercelCommandPlan({
    NODE_ENV: 'production',
    VERCEL: '1',
    VERCEL_ENV: 'production',
    POSTGRES_URL: 'postgres://example'
  });

  assert.deepEqual(VERCEL_PREPARE_STEPS, [
    'pnpm themes:prepare',
    'pnpm modules:build',
    'pnpm modules:prepare',
    'pnpm modules:i18n',
    'pnpm i18n:prepare'
  ]);

  assert.deepEqual(plan.commands, [
    'pnpm db:deploy',
    'pnpm themes:prepare',
    'pnpm modules:build',
    'pnpm modules:prepare',
    'pnpm modules:i18n',
    'pnpm i18n:prepare',
    'pnpm modules:migrate',
    'pnpm modules:sync',
    'next build'
  ]);
});

test('vercel build plan still prepares i18n artifacts when database sync is skipped', () => {
  const plan = buildVercelCommandPlan({
    NODE_ENV: 'test',
    VERCEL: '1',
    VERCEL_ENV: 'preview'
  });

  assert.equal(plan.shouldRunDbDeploy, false);
  assert.equal(plan.hasDatabase, false);
  assert.deepEqual(plan.commands, [
    'pnpm themes:prepare',
    'pnpm modules:build',
    'pnpm modules:prepare',
    'pnpm modules:i18n',
    'pnpm i18n:prepare',
    'next build'
  ]);
});
