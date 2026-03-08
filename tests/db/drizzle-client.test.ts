import assert from 'node:assert/strict';
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
