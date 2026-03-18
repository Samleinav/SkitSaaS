import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  configureAuth,
  configureUserRoles,
  getCurrentSfiles,
  getCurrentSfilesActor
} from '../../app/sdk/src/server';
import {
  bindSfilesActor,
  registerSfiles,
  sfiles,
  type ISfilesManager,
  type SFile,
  type SFilesActorContext
} from '../../app/sdk/src/sfiles';

function createFakeFile(id: number): SFile {
  return {
    id,
    name: `artifact-${id}.json`,
    originalName: `artifact-${id}.json`,
    path: `private/${id}.json`,
    folder: '/private/',
    mimeType: 'application/json',
    size: 12,
    backend: 'local',
    bucket: null,
    etag: `etag-${id}`,
    ownerId: 9,
    visibility: 'private',
    metadata: { moduleId: 'mod.example.suite' },
    deletedAt: null,
    createdAt: new Date('2026-03-18T00:00:00.000Z'),
    updatedAt: new Date('2026-03-18T00:00:00.000Z')
  };
}

function createFakeManager(
  calls: Array<{ method: string; actor: SFilesActorContext; args: unknown[] }>
): ISfilesManager {
  return {
    async upload(_file, filename, _options, actor) {
      calls.push({
        method: 'upload',
        actor: actor ?? { userId: null, isAdmin: false },
        args: [filename]
      });
      return createFakeFile(501);
    },
    async list(actor) {
      calls.push({ method: 'list', actor, args: [] });
      return { files: [createFakeFile(1)], folders: ['/private/'], total: 1 };
    },
    async get(actor, id) {
      calls.push({ method: 'get', actor, args: [id] });
      return createFakeFile(id);
    },
    async read(actor, id) {
      calls.push({ method: 'read', actor, args: [id] });
      return {
        file: createFakeFile(id),
        buffer: Buffer.from(`payload:${id}`, 'utf8')
      };
    },
    async delete(actor, id) {
      calls.push({ method: 'delete', actor, args: [id] });
    },
    async search(actor, options) {
      calls.push({ method: 'search', actor, args: [options] });
      return [createFakeFile(2)];
    },
    async rename(actor, id) {
      calls.push({ method: 'rename', actor, args: [id] });
      return createFakeFile(id);
    },
    async move(actor, id) {
      calls.push({ method: 'move', actor, args: [id] });
      return createFakeFile(id);
    },
    async getUrl(actor, id, options) {
      calls.push({ method: 'getUrl', actor, args: [id, options ?? null] });
      return `https://example.test/files/${id}`;
    },
    async zip(actor, options) {
      calls.push({ method: 'zip', actor, args: [options] });
      return createFakeFile(900);
    },
    async setPermissions(actor, fileId, options) {
      calls.push({ method: 'setPermissions', actor, args: [fileId, options] });
    },
    async getPermissions(actor, fileId) {
      calls.push({ method: 'getPermissions', actor, args: [fileId] });
      return [{ id: 1, fileId, userId: 9, grantedAt: new Date('2026-03-18T00:00:00.000Z') }];
    }
  };
}

test('SDK sfiles helpers bind the current actor and keep bootstrap registration working', async () => {
  const bootstrapSource = await readFile(
    new URL('../../lib/modules/sdk-server-bootstrap.ts', import.meta.url),
    'utf8'
  );
  assert.match(bootstrapSource, /import ['"]@\/lib\/sfiles['"]/);

  const { createSfiles } = await import('../../lib/sfiles');
  registerSfiles(createSfiles());
  assert.equal(typeof sfiles.get, 'function');

  const calls: Array<{ method: string; actor: SFilesActorContext; args: unknown[] }> = [];
  registerSfiles(createFakeManager(calls));

  configureUserRoles({
    adminAreaRoles: ['admin'],
    dashboardAreaRoles: ['member', 'owner']
  });

  configureAuth({
    getUser: async () => ({ id: 9, role: 'admin' })
  });

  const actor = await getCurrentSfilesActor();
  assert.deepEqual(actor, { userId: 9, isAdmin: true });

  const currentSfiles = await getCurrentSfiles();
  const readResult = await currentSfiles.read(42);
  assert.equal(readResult.file.id, 42);
  assert.equal(readResult.buffer.toString('utf8'), 'payload:42');

  await currentSfiles.getUrl(42, { expiresIn: 120 });
  await currentSfiles.delete(42);

  const manualSfiles = bindSfilesActor({ userId: 3, isAdmin: false });
  const searchResults = await manualSfiles.search({ query: 'artifact' });
  assert.equal(searchResults.length, 1);

  configureAuth({
    getUser: async () => null
  });

  const guestActor = await getCurrentSfilesActor();
  assert.deepEqual(guestActor, { userId: null, isAdmin: false });

  assert.deepEqual(
    calls.map((entry) => ({
      method: entry.method,
      actor: entry.actor
    })),
    [
      { method: 'read', actor: { userId: 9, isAdmin: true } },
      { method: 'getUrl', actor: { userId: 9, isAdmin: true } },
      { method: 'delete', actor: { userId: 9, isAdmin: true } },
      { method: 'search', actor: { userId: 3, isAdmin: false } }
    ]
  );
});
