import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function run(command) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: 'inherit' });
}

export const VERCEL_PREPARE_STEPS = Object.freeze([
  'pnpm themes:prepare',
  'pnpm modules:build',
  'pnpm modules:prepare',
  'pnpm modules:i18n',
  'pnpm i18n:prepare'
]);

export function buildVercelCommandPlan(env = process.env) {
  const isVercel = env.VERCEL === '1';
  const isProduction = env.VERCEL_ENV === 'production';
  const shouldRunDbDeploy = isVercel && isProduction;
  const hasDatabase = Boolean(env.POSTGRES_URL);

  return {
    shouldRunDbDeploy,
    hasDatabase,
    commands: [
      ...(shouldRunDbDeploy ? ['pnpm db:deploy'] : []),
      ...VERCEL_PREPARE_STEPS,
      ...(hasDatabase ? ['pnpm modules:migrate', 'pnpm modules:sync'] : []),
      'next build'
    ]
  };
}

export function runVercelBuild(env = process.env) {
  const plan = buildVercelCommandPlan(env);

  if (!plan.shouldRunDbDeploy) {
    console.log(
      'Skipping db:deploy (build is not a production Vercel deployment).'
    );
  }

  if (!plan.hasDatabase) {
    console.log(
      'Skipping modules:migrate and modules:sync (POSTGRES_URL is not set).'
    );
  }

  for (const command of plan.commands) {
    run(command);
  }
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  runVercelBuild();
}
