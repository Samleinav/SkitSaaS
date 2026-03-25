import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('postgres clients stay callable while drizzle db exports remain objects', async () => {
  process.env.POSTGRES_URL ??= 'postgres://localhost:5432/skitsaas_test';
  process.env.ADMIN_POSTGRES_URL ??= process.env.POSTGRES_URL;

  const { adminClient, adminDb, client, db } = await import(
    '../../lib/db/drizzle'
  );

  assert.equal(typeof client, 'function');
  assert.equal(typeof adminClient, 'function');
  assert.equal(typeof db, 'object');
  assert.equal(typeof adminDb, 'object');
  assert.equal(typeof client.unsafe, 'function');
  assert.equal(typeof client.begin, 'function');
  assert.equal(typeof adminClient.unsafe, 'function');
  assert.equal(typeof adminClient.begin, 'function');
});

function runDrizzleConfigProbe(env: Record<string, string | undefined>) {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const script = `
    (async () => {
      const mod = await import('./lib/db/drizzle.ts');
      const result = {
        sameClientObject: mod.client === mod.adminClient,
        app: {
          host: mod.client.options.host?.[0] ?? null,
          database: mod.client.options.database ?? null,
          user: mod.client.options.user ?? null
        },
        admin: {
          host: mod.adminClient.options.host?.[0] ?? null,
          database: mod.adminClient.options.database ?? null,
          user: mod.adminClient.options.user ?? null
        }
      };
      console.log(JSON.stringify(result));
      try { await mod.client.end({ timeout: 1 }); } catch {}
      try { await mod.adminClient.end({ timeout: 1 }); } catch {}
    })().catch((error) => {
      console.error(error);
      process.exit(1);
    });
  `;

  const result = spawnSync(command, ['tsx', '-e', script], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...env
    },
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout.trim()) as {
    sameClientObject: boolean;
    app: { host: string | null; database: string | null; user: string | null };
    admin: { host: string | null; database: string | null; user: string | null };
  };
}

test('admin drizzle client uses ADMIN_POSTGRES_URL when split-role env is configured', () => {
  const result = runDrizzleConfigProbe({
    POSTGRES_URL: 'postgresql://app_user:app_pass@app-host:5432/app_db',
    ADMIN_POSTGRES_URL:
      'postgresql://admin_user:admin_pass@admin-host:5432/admin_db'
  });

  assert.equal(result.sameClientObject, false);
  assert.deepEqual(result.app, {
    host: 'app-host',
    database: 'app_db',
    user: 'app_user'
  });
  assert.deepEqual(result.admin, {
    host: 'admin-host',
    database: 'admin_db',
    user: 'admin_user'
  });
});

test('admin drizzle client falls back to POSTGRES_URL when ADMIN_POSTGRES_URL is absent', () => {
  const result = runDrizzleConfigProbe({
    POSTGRES_URL: 'postgresql://app_user:app_pass@app-host:5432/app_db',
    ADMIN_POSTGRES_URL: ''
  });

  assert.equal(result.sameClientObject, false);
  assert.deepEqual(result.app, {
    host: 'app-host',
    database: 'app_db',
    user: 'app_user'
  });
  assert.deepEqual(result.admin, {
    host: 'app-host',
    database: 'app_db',
    user: 'app_user'
  });
});
