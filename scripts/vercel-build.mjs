import { execSync } from 'node:child_process';

function run(command) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: 'inherit' });
}

const isVercel = process.env.VERCEL === '1';
const isProduction = process.env.VERCEL_ENV === 'production';
const shouldRunDbMigrate = isVercel && isProduction;

if (shouldRunDbMigrate) {
  run('pnpm db:deploy');
} else {
  console.log(
    'Skipping db:migrate (build is not a production Vercel deployment).'
  );
}

run('pnpm modules:prepare');
run('pnpm themes:prepare');
run('pnpm modules:i18n');
if (process.env.POSTGRES_URL) {
  run('pnpm modules:migrate');
  run('pnpm modules:sync');
} else {
  console.log(
    'Skipping modules:migrate and modules:sync (POSTGRES_URL is not set).'
  );
}

run('next build');
