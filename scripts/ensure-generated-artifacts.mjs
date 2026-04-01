#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_ARTIFACTS = Object.freeze([
  'lib/themes/assets.generated.ts',
  'lib/themes/code-registry.generated.ts',
  'lib/themes/external.generated.ts',
  'lib/themes/frontend-routes.generated.ts',
  'lib/themes/selection.generated.ts',
  'lib/modules/external.generated.ts',
  'lib/modules/external-meta.generated.ts',
  'lib/portals/all-portals.generated.ts',
  'lib/routing/all-routes.generated.ts',
  'lib/i18n/module-flat-translations.generated.ts',
  'lib/i18n/supported-locales.generated.ts',
  'lib/i18n/theme-translations.generated.ts',
  'lib/i18n/translations.generated.ts'
]);

const PREPARE_COMMANDS = Object.freeze([
  'pnpm themes:prepare',
  'pnpm modules:build',
  'pnpm modules:prepare',
  'pnpm modules:i18n',
  'pnpm i18n:prepare'
]);

function missingArtifacts() {
  return REQUIRED_ARTIFACTS.filter((relativePath) => {
    const absolutePath = path.resolve(process.cwd(), relativePath);
    return !fs.existsSync(absolutePath);
  });
}

function run(command) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: 'inherit' });
}

function main() {
  const force = process.argv.includes('--force');
  const missingBeforeRun = missingArtifacts();

  if (!force && missingBeforeRun.length === 0) {
    console.log(
      `[ensure-generated-artifacts] OK (${REQUIRED_ARTIFACTS.length} artifacts present).`
    );
    return;
  }

  if (force) {
    console.log('[ensure-generated-artifacts] Force mode enabled.');
  } else {
    console.log('[ensure-generated-artifacts] Missing generated artifacts:');
    for (const relativePath of missingBeforeRun) {
      console.log(`- ${relativePath}`);
    }
  }

  for (const command of PREPARE_COMMANDS) {
    run(command);
  }

  const missingAfterRun = missingArtifacts();
  if (missingAfterRun.length > 0) {
    console.error(
      '[ensure-generated-artifacts] Preparation completed, but some artifacts are still missing:'
    );
    for (const relativePath of missingAfterRun) {
      console.error(`- ${relativePath}`);
    }
    process.exit(1);
  }

  console.log(
    `[ensure-generated-artifacts] Ready (${REQUIRED_ARTIFACTS.length} artifacts available).`
  );
}

main();
