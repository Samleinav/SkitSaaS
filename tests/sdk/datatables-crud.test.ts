import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDataTableTemplateContract,
  createDataTableTemplateEntries
} from '../../app/sdk/src/datatables';
import { createDataTableCrudApiRouter } from '../../app/sdk/src/datatables/server';
import { configureAuth, configureRevalidation } from '../../app/sdk/src/server';

test('sdk root keeps datatable CRUD exports on the datatables subpath only', async () => {
  const rootSdk = await import(
    new URL('../../app/sdk/dist/index.js', import.meta.url).href
  );
  const datatablesServerSdk = await import(
    new URL('../../app/sdk/dist/datatables/server.js', import.meta.url).href
  );

  assert.equal(
    'createDataTableCrudApiRouter' in rootSdk,
    false,
    'root entry should stay client-safe'
  );
  assert.equal(
    typeof rootSdk.createDataTableTemplateContract,
    'function',
    'root entry should still expose datatable contract helpers'
  );
  assert.equal(
    typeof datatablesServerSdk.createDataTableCrudApiRouter,
    'function',
    'datatable CRUD router should be available from datatables/server subpath'
  );
});

test('datatable template contract creates stable namespaced component ids', () => {
  const contract = createDataTableTemplateContract({
    moduleId: 'mod.example.apikeys',
    resource: 'Api Keys'
  });

  assert.equal(
    contract.table,
    'mod.example.apikeys.datatable.api-keys.table'
  );
  assert.equal(
    contract['row-actions'],
    'mod.example.apikeys.datatable.api-keys.row-actions'
  );
  assert.equal(
    contract['create-form'],
    'mod.example.apikeys.datatable.api-keys.create-form'
  );

  const entries = createDataTableTemplateEntries(contract, {
    payloadBySlot: {
      table: {
        className: 'rounded-xl'
      }
    },
    lockTemplateBySlot: {
      table: true
    }
  });
  assert.equal(entries.length, 6);
  const tableEntry = entries.find((entry) => entry.componentId === contract.table);
  assert.ok(tableEntry);
  assert.equal(tableEntry?.lockTemplate, true);
  assert.deepEqual(tableEntry?.payload, {
    className: 'rounded-xl'
  });
});

test('datatable CRUD router handles auth, parsing, and revalidation', async () => {
  type TestUser = {
    id: number;
    role?: string;
  };

  let currentUser: TestUser | null = null;
  const revalidated: string[] = [];
  const createdNames: string[] = [];
  const updatedNames: string[] = [];
  const deletedIds: number[] = [];

  configureAuth({
    getUser: async () => currentUser
  });
  configureRevalidation({
    revalidatePath(path) {
      revalidated.push(path);
    }
  });

  const router = createDataTableCrudApiRouter<
    TestUser,
    { id: number; name: string },
    { name: string },
    { name: string },
    number
  >({
    basePath: '/api-keys',
    policies: {
      list: { auth: 'admin' },
      create: { auth: 'admin' },
      update: { auth: 'admin' },
      delete: { auth: 'admin' }
    },
    parseId: (raw) => {
      const parsed = Number(raw);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
      }

      return parsed;
    },
    parseCreateInput: ({ body }) => {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      return name ? { name } : null;
    },
    parseUpdateInput: ({ body }) => {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      return name ? { name } : null;
    },
    revalidateByOperation: {
      create: ['/admin/apikeys'],
      update: ['/admin/apikeys'],
      delete: ['/admin/apikeys']
    },
    handlers: {
      list: ({ searchParams }) => ({
        items: [{ id: 1, name: 'default' }],
        page: Number(searchParams.get('page') ?? '1')
      }),
      create: ({ input }) => {
        createdNames.push(input.name);
        return {
          id: 2,
          name: input.name
        };
      },
      update: ({ id, input }) => {
        updatedNames.push(input.name);
        return {
          id,
          name: input.name
        };
      },
      delete: ({ id }) => {
        deletedIds.push(id);
        return {
          id
        };
      }
    }
  });

  const baseContext = {
    moduleId: 'mod.example.apikeys',
    slug: ['api-keys']
  };

  const unauthorizedListResponse = await router(
    new Request('http://localhost/api-keys?page=2'),
    baseContext
  );
  assert.equal(unauthorizedListResponse.status, 401);

  currentUser = { id: 1, role: 'admin' };

  const listResponse = await router(
    new Request('http://localhost/api-keys?page=2'),
    baseContext
  );
  assert.equal(listResponse.status, 200);
  assert.deepEqual(await listResponse.json(), {
    ok: true,
    operation: 'list',
    data: {
      items: [{ id: 1, name: 'default' }],
      page: 2
    }
  });

  const invalidCreateResponse = await router(
    new Request('http://localhost/api-keys', {
      method: 'POST',
      body: JSON.stringify(['invalid'])
    }),
    baseContext
  );
  assert.equal(invalidCreateResponse.status, 400);

  const createResponse = await router(
    new Request('http://localhost/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name: 'Primary' })
    }),
    baseContext
  );
  assert.equal(createResponse.status, 201);
  assert.deepEqual(await createResponse.json(), {
    ok: true,
    operation: 'create',
    data: {
      id: 2,
      name: 'Primary'
    }
  });

  const invalidUpdateIdResponse = await router(
    new Request('http://localhost/api-keys/invalid', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Renamed' })
    }),
    {
      ...baseContext,
      slug: ['api-keys', 'invalid']
    }
  );
  assert.equal(invalidUpdateIdResponse.status, 400);

  const updateResponse = await router(
    new Request('http://localhost/api-keys/2', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Renamed' })
    }),
    {
      ...baseContext,
      slug: ['api-keys', '2']
    }
  );
  assert.equal(updateResponse.status, 200);
  assert.deepEqual(await updateResponse.json(), {
    ok: true,
    operation: 'update',
    data: {
      id: 2,
      name: 'Renamed'
    }
  });

  const deleteResponse = await router(
    new Request('http://localhost/api-keys/2', {
      method: 'DELETE'
    }),
    {
      ...baseContext,
      slug: ['api-keys', '2']
    }
  );
  assert.equal(deleteResponse.status, 200);
  assert.deepEqual(await deleteResponse.json(), {
    ok: true,
    operation: 'delete',
    data: {
      id: 2
    }
  });

  assert.deepEqual(createdNames, ['Primary']);
  assert.deepEqual(updatedNames, ['Renamed']);
  assert.deepEqual(deletedIds, [2]);
  assert.deepEqual(revalidated, [
    '/admin/apikeys',
    '/admin/apikeys',
    '/admin/apikeys'
  ]);
});
