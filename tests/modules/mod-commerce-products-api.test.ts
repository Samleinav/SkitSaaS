import assert from 'node:assert/strict';
import test from 'node:test';
import { configureAuth } from '@skitsaas/sdk/server';
import { createCommerceProductsApiHandler } from '../../modules/mod.commerce.products/src/api-handler';
import type { CommerceProduct } from '../../modules/mod.commerce.products/src/types';

type SessionUser = {
  id: number;
  role?: string | null;
};

type ProductsApiDataDeps = NonNullable<
  Parameters<typeof createCommerceProductsApiHandler>[0]
>;

const FIXED_DATE = new Date('2026-02-12T00:00:00.000Z');

function createProductFixture(): CommerceProduct {
  return {
    id: 1,
    productKey: 'coffee-mug',
    name: 'Coffee Mug',
    description: 'Ceramic mug',
    kind: 'one_time',
    subscriptionTemplateId: null,
    metadata: null,
    createdByUserId: 1,
    updatedByUserId: 1,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    currentPrice: {
      id: 11,
      productId: 1,
      currency: 'USD',
      unitAmountCents: 2499,
      isActive: true,
      provider: null,
      providerPriceId: null,
      metadata: null,
      effectiveFrom: FIXED_DATE,
      effectiveTo: null,
      createdAt: FIXED_DATE,
      updatedAt: FIXED_DATE
    },
    publication: {
      id: 21,
      productId: 1,
      isPublished: false,
      publishedAt: null,
      unpublishedAt: null,
      publishedByUserId: null,
      metadata: null,
      createdAt: FIXED_DATE,
      updatedAt: FIXED_DATE
    }
  };
}

function createDataDeps(
  overrides: Partial<ProductsApiDataDeps> = {}
): ProductsApiDataDeps {
  const product = createProductFixture();
  return {
    listCommerceProducts: async () => [product],
    getCommerceProductById: async () => product,
    createCommerceProduct: async () => ({ ok: true, product }),
    updateCommerceProduct: async () => ({ ok: true, product }),
    publishCommerceProduct: async () => ({ ok: true, product }),
    unpublishCommerceProduct: async () => ({ ok: true, product }),
    ...overrides
  };
}

function createApiHarness(overrides: Partial<ProductsApiDataDeps> = {}) {
  let currentUser: SessionUser | null = null;
  configureAuth({
    getUser: async () => currentUser
  });

  return {
    setUser(user: SessionUser | null) {
      currentUser = user;
    },
    handler: createCommerceProductsApiHandler(createDataDeps(overrides))
  };
}

async function callApiRoute({
  handler,
  slug,
  method = 'GET',
  body
}: {
  handler: ReturnType<typeof createCommerceProductsApiHandler>;
  slug: string[];
  method?: string;
  body?: Record<string, unknown>;
}) {
  const request = new Request(`https://example.test/${slug.join('/')}`, {
    method,
    headers:
      body === undefined
        ? undefined
        : {
            'content-type': 'application/json'
          },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  return handler(request, {
    moduleId: 'mod.commerce.products',
    slug
  });
}

test('products API health route is public', async () => {
  const { handler } = createApiHarness();
  const response = await callApiRoute({
    handler,
    slug: ['health']
  });

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    ok: boolean;
    moduleId: string;
    service: string;
  };
  assert.equal(payload.ok, true);
  assert.equal(payload.moduleId, 'mod.commerce.products');
  assert.equal(payload.service, 'products');
});

test('products API list route returns 401 without session', async () => {
  const { handler, setUser } = createApiHarness();
  setUser(null);

  const response = await callApiRoute({
    handler,
    slug: ['products']
  });

  assert.equal(response.status, 401);
});

test('products API list route returns 403 for non-admin user', async () => {
  const { handler, setUser } = createApiHarness();
  setUser({
    id: 7,
    role: 'member'
  });

  const response = await callApiRoute({
    handler,
    slug: ['products']
  });

  assert.equal(response.status, 403);
});

test('products API create route accepts admin request and forwards actor id', async () => {
  let seenActorUserId: number | null = null;
  let seenProductKey: string | null = null;

  const { handler, setUser } = createApiHarness({
    createCommerceProduct: async (input, context) => {
      seenActorUserId = context?.actorUserId ?? null;
      seenProductKey = input.productKey;
      return {
        ok: true,
        product: createProductFixture()
      };
    }
  });

  setUser({
    id: 99,
    role: 'owner'
  });

  const response = await callApiRoute({
    handler,
    method: 'POST',
    slug: ['products'],
    body: {
      productKey: 'Coffee-Mug',
      name: 'Coffee Mug',
      kind: 'one_time',
      price: {
        currency: 'usd',
        unitAmountCents: 2499
      }
    }
  });

  assert.equal(response.status, 201);
  assert.equal(seenActorUserId, 99);
  assert.equal(seenProductKey, 'coffee-mug');
});

test('products API create route maps duplicate key to 409', async () => {
  const { handler, setUser } = createApiHarness({
    createCommerceProduct: async () => ({
      ok: false,
      code: 'duplicate_product_key',
      message: 'Duplicate key'
    })
  });

  setUser({
    id: 1,
    role: 'owner'
  });

  const response = await callApiRoute({
    handler,
    method: 'POST',
    slug: ['products'],
    body: {
      productKey: 'coffee-mug',
      name: 'Coffee Mug',
      kind: 'one_time',
      price: {
        currency: 'USD',
        unitAmountCents: 2499
      }
    }
  });

  assert.equal(response.status, 409);
  const payload = (await response.json()) as {
    ok: boolean;
    code: string;
  };
  assert.equal(payload.ok, false);
  assert.equal(payload.code, 'duplicate_product_key');
});

test('products API publish route maps missing active one_time price to 409', async () => {
  const { handler, setUser } = createApiHarness({
    publishCommerceProduct: async () => ({
      ok: false,
      code: 'one_time_product_missing_active_price',
      message: 'Cannot publish one_time product without active price.'
    })
  });

  setUser({
    id: 1,
    role: 'admin'
  });

  const response = await callApiRoute({
    handler,
    method: 'POST',
    slug: ['products', '1', 'publish'],
    body: {}
  });

  assert.equal(response.status, 409);
  const payload = (await response.json()) as {
    ok: boolean;
    code: string;
  };
  assert.equal(payload.ok, false);
  assert.equal(payload.code, 'one_time_product_missing_active_price');
});

test('products API publish route rejects invalid product id before data layer call', async () => {
  let publishCalls = 0;
  const { handler, setUser } = createApiHarness({
    publishCommerceProduct: async () => {
      publishCalls += 1;
      return {
        ok: true,
        product: createProductFixture()
      };
    }
  });

  setUser({
    id: 1,
    role: 'admin'
  });

  const response = await callApiRoute({
    handler,
    method: 'POST',
    slug: ['products', 'invalid-id', 'publish'],
    body: {}
  });

  assert.equal(response.status, 400);
  assert.equal(publishCalls, 0);
});
