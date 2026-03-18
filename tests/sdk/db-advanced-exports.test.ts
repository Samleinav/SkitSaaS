import assert from 'node:assert/strict';
import test from 'node:test';
import {
  customType,
  integer,
  pgTable,
  serial,
  text
} from '../../app/sdk/src/db';

test('sdk db dist entry exposes customType for advanced pg types', async () => {
  const sdkDb = await import(new URL('../../app/sdk/dist/db.js', import.meta.url).href);
  assert.equal(typeof sdkDb.customType, 'function');
});

test('sdk db surface can define vector-like custom types and host table fk stubs', () => {
  const vector = customType<{
    data: number[];
    driverData: string;
    config: { dimensions: number };
  }>({
    dataType(config) {
      return `vector(${config?.dimensions ?? 1536})`;
    },
    toDriver(value) {
      return `[${value.join(',')}]`;
    },
    fromDriver(value) {
      return value
        .slice(1, -1)
        .split(',')
        .filter(Boolean)
        .map((entry) => Number(entry));
    }
  });

  const users = pgTable('users', {
    id: integer('id').primaryKey()
  });

  const sfiles = pgTable('sfiles', {
    id: integer('id').primaryKey()
  });

  const modEmbeddings = pgTable('mod_sdk_embedding_docs', {
    id: serial('id').primaryKey(),
    ownerUserId: integer('owner_user_id').references(() => users.id, {
      onDelete: 'cascade'
    }),
    sourceFileId: integer('source_file_id').references(() => sfiles.id, {
      onDelete: 'set null'
    }),
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }).notNull()
  });

  assert.equal(users.id.name, 'id');
  assert.equal(sfiles.id.name, 'id');
  assert.equal(modEmbeddings.embedding.name, 'embedding');
  assert.equal(modEmbeddings.ownerUserId.name, 'owner_user_id');
});
