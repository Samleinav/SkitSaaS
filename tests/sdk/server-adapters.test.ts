import assert from 'node:assert/strict';
import test from 'node:test';
import {
  configureNotifications,
  createModuleApiRouter,
  createModulePageRouter,
  createNotification,
  configureAuth,
  configureDatabase,
  configureEventEmitter,
  configureModuleConfig,
  configureRevalidation,
  createFormReader,
  emitEvent,
  getDb,
  getTable,
  getModuleConfigValue,
  getUser,
  hasOwn,
  findTable,
  listTables,
  notifyGlobal,
  notifyUser,
  notifyUsers,
  parseJsonBody,
  requireAdmin,
  requireUser,
  setSessionForUser,
  revalidatePaths,
  setModuleConfigValue
} from '../../app/sdk/src/server';
import { and, eq, pgTable, serial, varchar } from '../../app/sdk/src/db';

test('SDK server adapters expose clear errors and reusable helpers', async () => {
  await assert.rejects(
    () => getUser(),
    /Module SDK auth adapter not configured/
  );
  await assert.rejects(
    () => requireAdmin(),
    /Module SDK auth adapter not configured/
  );
  await assert.rejects(
    () => setSessionForUser(1),
    /Module SDK auth adapter not configured/
  );
  await assert.rejects(
    () => revalidatePaths(['/dashboard']),
    /Module SDK revalidation adapter not configured/
  );
  await assert.rejects(
    () => emitEvent('sdk.test.event', {}),
    /Module SDK event emitter not configured/
  );
  await assert.rejects(
    () => getModuleConfigValue('mod.test', 'flag'),
    /Module SDK config adapter not configured/
  );
  await assert.rejects(
    () => createNotification({ message: 'System notice' }),
    /Module SDK notification adapter not configured/
  );
  assert.throws(
    () => getDb(),
    /Module SDK database adapter not configured/
  );
  assert.throws(
    () => getTable('users'),
    /Module SDK database adapter not configured/
  );

  const revalidatedPaths: string[] = [];
  configureRevalidation({
    revalidatePath(path) {
      revalidatedPaths.push(path);
    }
  });

  await revalidatePaths(['/dashboard', '/dashboard', ' /admin ']);
  assert.deepEqual(revalidatedPaths, ['/dashboard', '/admin']);

  type TestUser = {
    id: number;
    role: string;
  };

  configureAuth({
    getUser: async () => ({ id: 7, role: 'member' }),
    requireUser: async () => ({ id: 7, role: 'member' }),
    requireAdmin: async () => ({ id: 1, role: 'admin' }),
    setSessionForUser: async (userId) => {
      if (userId <= 0) {
        throw new Error('invalid user id');
      }
    }
  });

  const currentUser = await getUser<TestUser>();
  assert.equal(currentUser?.id, 7);

  const authenticatedUser = await requireUser<TestUser>();
  assert.equal(authenticatedUser.id, 7);

  const adminUser = await requireAdmin<TestUser>();
  assert.equal(adminUser.id, 1);

  await setSessionForUser(7);
  await assert.rejects(
    () => setSessionForUser(0),
    /positive integer userId/
  );

  const emittedHooks: string[] = [];
  configureEventEmitter({
    emitEvent: async (hook) => {
      emittedHooks.push(hook);
      return {
        eventId: 'evt-1',
        handlerCount: 0,
        mode: 'inline'
      };
    }
  });

  const eventResult = await emitEvent('sdk.test.event', {
    ok: true
  });
  assert.equal(eventResult.eventId, 'evt-1');
  assert.deepEqual(emittedHooks, ['sdk.test.event']);

  const configStore = new Map<string, string | null>();
  configureModuleConfig({
    getConfigValue: async (namespace, configKey) => {
      return configStore.get(`${namespace}:${configKey}`) ?? null;
    },
    setConfigValue: async (namespace, configKey, configValue) => {
      configStore.set(`${namespace}:${configKey}`, configValue);
    }
  });

  await setModuleConfigValue('mod.test', 'api.mode', 'admin');
  const apiMode = await getModuleConfigValue('mod.test', 'api.mode');
  assert.equal(apiMode, 'admin');

  await setModuleConfigValue('mod.test', 'api.mode', null);
  const removedValue = await getModuleConfigValue('mod.test', 'api.mode');
  assert.equal(removedValue, null);

  const createdNotifications: Array<{
    message: string;
    audienceType: string;
    userIds: number[];
  }> = [];
  configureNotifications({
    createNotification: async (input) => {
      const audienceType = input.audience?.type === 'users' ? 'direct' : 'global';
      const userIds =
        input.audience?.type === 'users' ? [...input.audience.userIds] : [];

      createdNotifications.push({
        message: input.message,
        audienceType,
        userIds
      });

      return {
        notificationId: createdNotifications.length,
        audienceType: audienceType === 'direct' ? 'direct' : 'global',
        recipientUserIds: userIds
      };
    }
  });

  await assert.rejects(
    () => createNotification({ message: '   ' }),
    /non-empty message/
  );
  await assert.rejects(
    () => notifyUser(0, { message: 'Invalid target' }),
    /positive integer userId/
  );

  const globalNotification = await notifyGlobal({
    message: ' Global broadcast '
  });
  assert.equal(globalNotification.audienceType, 'global');
  assert.deepEqual(globalNotification.recipientUserIds, []);

  const userNotification = await notifyUser(9, {
    message: 'User only'
  });
  assert.equal(userNotification.audienceType, 'direct');
  assert.deepEqual(userNotification.recipientUserIds, [9]);

  const usersNotification = await notifyUsers([11, 9, 11, -4], {
    message: 'Batch delivery'
  });
  assert.equal(usersNotification.audienceType, 'direct');
  assert.deepEqual(usersNotification.recipientUserIds, [9, 11]);

  assert.deepEqual(createdNotifications, [
    {
      message: 'Global broadcast',
      audienceType: 'global',
      userIds: []
    },
    {
      message: 'User only',
      audienceType: 'direct',
      userIds: [9]
    },
    {
      message: 'Batch delivery',
      audienceType: 'direct',
      userIds: [9, 11]
    }
  ]);

  const tableStore = new Map<string, unknown>([
    ['users', { id: 'users.id' }],
    ['subscription_assignments', { id: 'subscription_assignments.id' }]
  ]);
  configureDatabase({
    getDb: () => ({ driver: 'postgres-js' }),
    getTable: (tableId) => tableStore.get(tableId) ?? null,
    listTables: () => tableStore.keys()
  });
  const moduleDb = getDb<{ driver: string }>();
  assert.equal(moduleDb.driver, 'postgres-js');
  assert.equal(findTable<{ id: string }>('users')?.id, 'users.id');
  assert.equal(findTable('missing_table'), null);
  assert.equal(getTable<{ id: string }>(' users ')?.id, 'users.id');
  assert.deepEqual(listTables(), ['subscription_assignments', 'users']);
  assert.throws(
    () => getTable('missing_table'),
    /Module SDK database table not found/
  );

  const formData = new FormData();
  formData.set('name', ' Alice ');
  formData.set('count', '3');
  formData.append('tags', ' one ');
  formData.append('tags', 'two');
  formData.append('tags', '');
  const form = createFormReader(formData);

  assert.equal(form.string('name'), 'Alice');
  assert.equal(form.integer('count'), 3);
  assert.deepEqual(form.strings('tags'), ['one', 'two']);

  const parsedBody = await parseJsonBody(
    new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ enabled: true })
    })
  );
  assert.equal(parsedBody?.enabled, true);

  const invalidBody = await parseJsonBody(
    new Request('http://localhost', {
      method: 'POST',
      body: '[1,2,3]'
    })
  );
  assert.equal(invalidBody, null);

  assert.equal(hasOwn({ a: 1 }, 'a'), true);
  assert.equal(hasOwn({ a: 1 }, 'b'), false);

  const sdkDbSmoke = pgTable('sdk_db_smoke', {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 30 }).notNull()
  });
  const predicate = and(eq(sdkDbSmoke.id, 1));
  assert.ok(predicate);
});

test('createModuleApiRouter resolves method/path/auth/roles declaratively', async () => {
  type TestUser = {
    id: number;
    role?: string;
  };

  let currentUser: TestUser | null = null;

  configureAuth({
    getUser: async () => currentUser
  });

  const apiHandler = createModuleApiRouter<TestUser>({
    routes: [
      {
        method: 'GET',
        path: '/health',
        handler: () => Response.json({ ok: true })
      },
      {
        method: 'POST',
        path: '/items',
        auth: 'user',
        handler: ({ user }) => {
          return Response.json({
            ok: true,
            userId: user?.id ?? null
          });
        }
      },
      {
        method: 'PATCH',
        path: '/items/:itemId',
        roles: ['editor', 'admin'],
        handler: ({ params }) => {
          return Response.json({
            ok: true,
            itemId: params.itemId
          });
        }
      }
    ]
  });

  const baseContext = {
    moduleId: 'mod.test',
    slug: [] as string[]
  };

  const healthResponse = await apiHandler(new Request('http://localhost/health'), {
    ...baseContext,
    slug: ['health']
  });
  assert.equal(healthResponse.status, 200);

  const unauthenticatedCreateResponse = await apiHandler(
    new Request('http://localhost/items', {
      method: 'POST'
    }),
    {
      ...baseContext,
      slug: ['items']
    }
  );
  assert.equal(unauthenticatedCreateResponse.status, 401);

  currentUser = { id: 7, role: 'member' };
  const authenticatedCreateResponse = await apiHandler(
    new Request('http://localhost/items', {
      method: 'POST'
    }),
    {
      ...baseContext,
      slug: ['items']
    }
  );
  assert.equal(authenticatedCreateResponse.status, 200);
  assert.deepEqual(await authenticatedCreateResponse.json(), {
    ok: true,
    userId: 7
  });

  const forbiddenPatchResponse = await apiHandler(
    new Request('http://localhost/items/55', {
      method: 'PATCH'
    }),
    {
      ...baseContext,
      slug: ['items', '55']
    }
  );
  assert.equal(forbiddenPatchResponse.status, 403);

  currentUser = { id: 7, role: 'editor' };
  const allowedPatchResponse = await apiHandler(
    new Request('http://localhost/items/55', {
      method: 'PATCH'
    }),
    {
      ...baseContext,
      slug: ['items', '55']
    }
  );
  assert.equal(allowedPatchResponse.status, 200);
  assert.deepEqual(await allowedPatchResponse.json(), {
    ok: true,
    itemId: '55'
  });

  const methodNotAllowedResponse = await apiHandler(
    new Request('http://localhost/items', {
      method: 'DELETE'
    }),
    {
      ...baseContext,
      slug: ['items']
    }
  );
  assert.equal(methodNotAllowedResponse.status, 405);
  assert.equal(methodNotAllowedResponse.headers.get('Allow'), 'POST');

  const notFoundResponse = await apiHandler(new Request('http://localhost/missing'), {
    ...baseContext,
    slug: ['missing']
  });
  assert.equal(notFoundResponse.status, 404);
});

test('createModulePageRouter resolves paths and access rules', async () => {
  type TestUser = {
    id: number;
    role?: string;
  };

  let currentUser: TestUser | null = null;

  configureAuth({
    getUser: async () => currentUser
  });

  const pageHandler = createModulePageRouter<TestUser>({
    routes: [
      {
        path: '/',
        handler: () => 'root'
      },
      {
        path: '/reports/:reportId',
        auth: 'user',
        handler: ({ params }) => `report:${params.reportId}`
      },
      {
        path: '/admin',
        auth: 'admin',
        handler: () => 'admin'
      },
      {
        path: '/owners',
        roles: ['owner'],
        handler: () => 'owner'
      }
    ],
    onUnauthorized: () => 'unauthorized',
    onForbidden: () => 'forbidden',
    onNotFound: () => 'not-found'
  });

  const rootResult = await pageHandler({
    moduleId: 'mod.test',
    slug: []
  });
  assert.equal(rootResult, 'root');

  const unauthorizedResult = await pageHandler({
    moduleId: 'mod.test',
    slug: ['reports', '12']
  });
  assert.equal(unauthorizedResult, 'unauthorized');

  currentUser = { id: 7, role: 'member' };
  const reportResult = await pageHandler({
    moduleId: 'mod.test',
    slug: ['reports', '12']
  });
  assert.equal(reportResult, 'report:12');

  const adminForbiddenResult = await pageHandler({
    moduleId: 'mod.test',
    slug: ['admin']
  });
  assert.equal(adminForbiddenResult, 'forbidden');

  currentUser = { id: 8, role: 'owner' };
  const ownerAdminForbiddenResult = await pageHandler({
    moduleId: 'mod.test',
    slug: ['admin']
  });
  assert.equal(ownerAdminForbiddenResult, 'forbidden');

  currentUser = { id: 1, role: 'admin' };
  const adminResult = await pageHandler({
    moduleId: 'mod.test',
    slug: ['admin']
  });
  assert.equal(adminResult, 'admin');

  const ownerForbiddenResult = await pageHandler({
    moduleId: 'mod.test',
    slug: ['owners']
  });
  assert.equal(ownerForbiddenResult, 'forbidden');

  currentUser = { id: 2, role: 'owner' };
  const ownerResult = await pageHandler({
    moduleId: 'mod.test',
    slug: ['owners']
  });
  assert.equal(ownerResult, 'owner');

  const notFoundResult = await pageHandler({
    moduleId: 'mod.test',
    slug: ['missing']
  });
  assert.equal(notFoundResult, 'not-found');
});
