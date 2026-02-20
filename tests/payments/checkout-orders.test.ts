import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test, { mock } from 'node:test';
import { db } from '../../lib/db/drizzle';
import type { CheckoutOrder, SubscriptionTemplate } from '../../lib/db/schema';
import {
  buildCheckoutOrderPath,
  buildCheckoutOrderUrl,
  createSubscriptionCheckoutOrder,
  isReusableSubscriptionCheckoutOrderForContext,
  isCheckoutOrderPayable,
  parseCheckoutOrderMetadata,
  type CheckoutOrderWithMetadata
} from '../../lib/payments/checkout-orders';

function buildCheckoutOrder(
  patch: Partial<CheckoutOrderWithMetadata> = {}
): CheckoutOrderWithMetadata {
  const baseOrder: CheckoutOrder = {
    id: 1,
    checkoutToken: 'tok_test_123',
    idempotencyKey: 'idem_test_123',
    orderType: 'subscription',
    status: 'ready',
    source: 'pricing',
    moduleId: null,
    teamId: 10,
    targetType: 'team',
    targetTeamId: 10,
    targetUserId: null,
    subscriptionTemplateId: 200,
    selectedProvider: null,
    selectedPaymentMethod: null,
    providerSessionId: null,
    providerReferenceId: null,
    amount: 1000,
    currency: 'USD',
    planName: 'Starter',
    metadata: null,
    expiresAt: new Date(Date.now() + 60_000),
    completedAt: null,
    canceledAt: null,
    failedAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return {
    ...baseOrder,
    parsedMetadata: null,
    ...patch
  };
}

function buildSubscriptionTemplate(
  patch: Partial<SubscriptionTemplate> = {}
): SubscriptionTemplate {
  const now = new Date();
  return {
    id: 200,
    name: 'Starter',
    targetScope: 'organization',
    categoryKey: 'pricing.starter',
    hierarchyRank: 0,
    billingInterval: 'monthly',
    priceCents: 1000,
    compareAtPriceCents: null,
    currency: 'USD',
    trialPeriodDays: 0,
    paypalProductId: null,
    paypalPlanId: null,
    paypalPlanFingerprint: null,
    paypalPlanIdNoTrial: null,
    paypalPlanFingerprintNoTrial: null,
    createdAt: now,
    updatedAt: now,
    ...patch
  };
}

test('parseCheckoutOrderMetadata returns null for invalid payload', () => {
  assert.equal(parseCheckoutOrderMetadata(null), null);
  assert.equal(parseCheckoutOrderMetadata(''), null);
  assert.equal(parseCheckoutOrderMetadata('not-json'), null);
});

test('parseCheckoutOrderMetadata returns parsed object for valid payload', () => {
  const metadata = parseCheckoutOrderMetadata(
    JSON.stringify({
      schemaVersion: 1,
      subscription: {
        changeMode: 'immediate'
      }
    })
  );

  assert.ok(metadata);
  assert.equal(metadata?.schemaVersion, 1);
});

test('parseCheckoutOrderMetadata infers schemaVersion for legacy payload without version', () => {
  const metadata = parseCheckoutOrderMetadata(
    JSON.stringify({
      oneTime: {
        productId: 77,
        quantity: 2
      }
    })
  );

  assert.ok(metadata);
  assert.equal(metadata?.schemaVersion, 1);
  assert.equal(metadata?.oneTime?.productId, 77);
  assert.equal(metadata?.oneTime?.quantity, 2);
});

test('parseCheckoutOrderMetadata drops invalid oneTime envelope while keeping metadata object', () => {
  const metadata = parseCheckoutOrderMetadata(
    JSON.stringify({
      schemaVersion: 1,
      oneTime: 'invalid',
      source: 'legacy'
    })
  );

  assert.ok(metadata);
  assert.equal(metadata?.schemaVersion, 1);
  assert.equal(metadata?.source, 'legacy');
  assert.equal(metadata?.oneTime, undefined);
});

test('buildCheckoutOrderPath returns encoded checkout route', () => {
  assert.equal(buildCheckoutOrderPath('tok_test_123'), '/checkout/tok_test_123');
  assert.equal(
    buildCheckoutOrderPath('tok/with/slash'),
    '/checkout/tok%2Fwith%2Fslash'
  );
  assert.equal(buildCheckoutOrderPath(''), null);
});

test('buildCheckoutOrderUrl resolves absolute URL from explicit origin', () => {
  const url = buildCheckoutOrderUrl({
    checkoutToken: 'tok_test_123',
    origin: 'https://app.example.com'
  });
  assert.equal(url, 'https://app.example.com/checkout/tok_test_123');
});

test('buildCheckoutOrderUrl falls back to checkout path when no valid origin is provided', () => {
  const previousBaseUrl = process.env.BASE_URL;
  delete process.env.BASE_URL;

  try {
    const url = buildCheckoutOrderUrl({
      checkoutToken: 'tok_test_123',
      origin: 'invalid-origin'
    });
    assert.equal(url, '/checkout/tok_test_123');
  } finally {
    if (previousBaseUrl === undefined) {
      delete process.env.BASE_URL;
    } else {
      process.env.BASE_URL = previousBaseUrl;
    }
  }
});

test('isCheckoutOrderPayable validates status and expiration', () => {
  const payable = buildCheckoutOrder();
  assert.equal(isCheckoutOrderPayable(payable), true);

  const completed = buildCheckoutOrder({ status: 'completed' });
  assert.equal(isCheckoutOrderPayable(completed), false);

  const expired = buildCheckoutOrder({
    expiresAt: new Date(Date.now() - 1_000)
  });
  assert.equal(isCheckoutOrderPayable(expired), false);
});

test('isReusableSubscriptionCheckoutOrderForContext accepts matching payable subscription order', () => {
  const reusableOrder = buildCheckoutOrder({
    orderType: 'subscription',
    status: 'ready',
    teamId: 10,
    targetType: 'team',
    targetTeamId: 10,
    subscriptionTemplateId: 200,
    parsedMetadata: {
      schemaVersion: 1,
      subscription: {
        templateSnapshot: {
          templateId: 200,
          templateName: 'Starter',
          targetScope: 'organization',
          billingInterval: 'monthly',
          priceCents: 1000,
          compareAtPriceCents: null,
          currency: 'USD',
          trialPeriodDays: 0,
          updatedAt: new Date().toISOString(),
          fingerprint: 'fingerprint'
        },
        changeMode: 'period_end',
        currentAssignmentId: null,
        currentTemplateId: null,
        scheduledStartTime: '2026-03-01T00:00:00.000Z'
      }
    }
  });

  const canReuse = isReusableSubscriptionCheckoutOrderForContext({
    order: reusableOrder,
    teamId: 10,
    templateId: 200,
    changeMode: 'period_end',
    scheduledStartTime: '2026-03-01T00:00:00.000Z'
  });

  assert.equal(canReuse, true);
});

test('isReusableSubscriptionCheckoutOrderForContext rejects non-matching context', () => {
  const order = buildCheckoutOrder({
    parsedMetadata: {
      schemaVersion: 1,
      subscription: {
        templateSnapshot: {
          templateId: 200,
          templateName: 'Starter',
          targetScope: 'organization',
          billingInterval: 'monthly',
          priceCents: 1000,
          compareAtPriceCents: null,
          currency: 'USD',
          trialPeriodDays: 0,
          updatedAt: new Date().toISOString(),
          fingerprint: 'fingerprint'
        },
        changeMode: 'immediate',
        currentAssignmentId: null,
        currentTemplateId: null,
        scheduledStartTime: null
      }
    }
  });

  assert.equal(
    isReusableSubscriptionCheckoutOrderForContext({
      order: {
        ...order,
        status: 'failed'
      },
      teamId: 10,
      templateId: 200,
      changeMode: 'immediate'
    }),
    false
  );

  assert.equal(
    isReusableSubscriptionCheckoutOrderForContext({
      order,
      teamId: 10,
      templateId: 201,
      changeMode: 'immediate'
    }),
    false
  );

  assert.equal(
    isReusableSubscriptionCheckoutOrderForContext({
      order,
      teamId: 10,
      templateId: 200,
      changeMode: 'period_end'
    }),
    false
  );
});

test('subscription scope invariant migration defines active unique indexes', () => {
  const migrationPath = path.join(
    process.cwd(),
    'lib',
    'db',
    'migrations',
    '0024_subscription_checkout_scope_invariant.sql'
  );
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(
    migrationSql,
    /CREATE UNIQUE INDEX "checkout_orders_active_subscription_team_scope_idx"/
  );
  assert.match(
    migrationSql,
    /CREATE UNIQUE INDEX "checkout_orders_active_subscription_user_scope_idx"/
  );
  assert.match(
    migrationSql,
    /"status" IN \('ready', 'provider_pending'\)/
  );
});

test('createSubscriptionCheckoutOrder returns scoped active order after concurrent unique conflict', async () => {
  const template = buildSubscriptionTemplate();
  const createdRow: CheckoutOrder = {
    id: 901,
    checkoutToken: 'tok_sub_concurrent_1',
    idempotencyKey: 'sub:10:7:200:created',
    orderType: 'subscription',
    status: 'ready',
    source: 'pricing',
    moduleId: null,
    teamId: 10,
    targetType: 'team',
    targetTeamId: 10,
    targetUserId: null,
    subscriptionTemplateId: template.id,
    selectedProvider: null,
    selectedPaymentMethod: null,
    providerSessionId: null,
    providerReferenceId: null,
    amount: 1000,
    currency: 'USD',
    planName: 'Starter',
    metadata: JSON.stringify({ schemaVersion: 1 }),
    expiresAt: new Date(Date.now() + 60_000),
    completedAt: null,
    canceledAt: null,
    failedAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const selectResponses: CheckoutOrder[][] = [[], [], [createdRow]];
  let insertAttempts = 0;

  const selectMock = mock.method(
    db as unknown as {
      select: () => {
        from: () => {
          where: () => {
            orderBy: () => { limit: () => Promise<CheckoutOrder[]> };
            limit: () => Promise<CheckoutOrder[]>;
          };
        };
      };
    },
    'select',
    () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: async () => selectResponses.shift() ?? []
          }),
          limit: async () => selectResponses.shift() ?? []
        })
      })
    })
  );

  const insertMock = mock.method(
    db as unknown as {
      insert: () => {
        values: () => {
          returning: () => Promise<CheckoutOrder[]>;
        };
      };
    },
    'insert',
    () => ({
      values: () => ({
        returning: async () => {
          insertAttempts += 1;
          if (insertAttempts === 1) {
            await new Promise((resolve) => setTimeout(resolve, 15));
            return [createdRow];
          }

          throw { code: '23505' };
        }
      })
    })
  );

  try {
    const [resultA, resultB] = await Promise.all([
      createSubscriptionCheckoutOrder({
        teamId: 10,
        userId: 7,
        template
      }),
      createSubscriptionCheckoutOrder({
        teamId: 10,
        userId: 7,
        template
      })
    ]);

    assert.ok(resultA);
    assert.ok(resultB);
    assert.equal(resultA?.id, createdRow.id);
    assert.equal(resultB?.id, createdRow.id);
    assert.equal(resultA?.checkoutToken, createdRow.checkoutToken);
    assert.equal(resultB?.checkoutToken, createdRow.checkoutToken);
    assert.equal(insertAttempts, 2);
  } finally {
    insertMock.mock.restore();
    selectMock.mock.restore();
  }
});

test('createSubscriptionCheckoutOrder reuses active checkout order idempotently', async () => {
  const template = buildSubscriptionTemplate();
  const createdRow: CheckoutOrder = {
    id: 902,
    checkoutToken: 'tok_sub_reuse_1',
    idempotencyKey: 'sub:10:7:200:created',
    orderType: 'subscription',
    status: 'ready',
    source: 'pricing',
    moduleId: null,
    teamId: 10,
    targetType: 'team',
    targetTeamId: 10,
    targetUserId: null,
    subscriptionTemplateId: template.id,
    selectedProvider: null,
    selectedPaymentMethod: null,
    providerSessionId: null,
    providerReferenceId: null,
    amount: 1000,
    currency: 'USD',
    planName: 'Starter',
    metadata: JSON.stringify({
      schemaVersion: 1,
      subscription: {
        changeMode: null,
        scheduledStartTime: null
      }
    }),
    expiresAt: new Date(Date.now() + 60_000),
    completedAt: null,
    canceledAt: null,
    failedAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const selectResponses: CheckoutOrder[][] = [[], [createdRow]];
  let insertAttempts = 0;

  const selectMock = mock.method(
    db as unknown as {
      select: () => {
        from: () => {
          where: () => {
            orderBy: () => { limit: () => Promise<CheckoutOrder[]> };
            limit: () => Promise<CheckoutOrder[]>;
          };
        };
      };
    },
    'select',
    () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: async () => selectResponses.shift() ?? []
          }),
          limit: async () => selectResponses.shift() ?? []
        })
      })
    })
  );

  const insertMock = mock.method(
    db as unknown as {
      insert: () => {
        values: () => {
          returning: () => Promise<CheckoutOrder[]>;
        };
      };
    },
    'insert',
    () => ({
      values: () => ({
        returning: async () => {
          insertAttempts += 1;
          return [createdRow];
        }
      })
    })
  );

  try {
    const first = await createSubscriptionCheckoutOrder({
      teamId: 10,
      userId: 7,
      template
    });
    const second = await createSubscriptionCheckoutOrder({
      teamId: 10,
      userId: 7,
      template
    });

    assert.ok(first);
    assert.ok(second);
    assert.equal(first?.id, createdRow.id);
    assert.equal(second?.id, createdRow.id);
    assert.equal(first?.checkoutToken, createdRow.checkoutToken);
    assert.equal(second?.checkoutToken, createdRow.checkoutToken);
    assert.equal(insertAttempts, 1);
  } finally {
    insertMock.mock.restore();
    selectMock.mock.restore();
  }
});
