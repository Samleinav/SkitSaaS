import assert from 'node:assert/strict';
import test from 'node:test';
import { configureAuth } from '@skitsaas/sdk/server';
import commerceOneTimePaymentsManifest from '../../modules/mod.commerce.one-time-payments/src/manifest';
import {
  commerceOneTimePaymentsApiHandler,
  createCommerceOneTimePaymentsApiHandler
} from '../../modules/mod.commerce.one-time-payments/src/api-handler';
import type { OneTimeIntent } from '../../modules/mod.commerce.one-time-payments/src/types';

type SessionUser = {
  id: number;
  role?: string | null;
  email?: string | null;
};

async function callApiRoute({
  handler = commerceOneTimePaymentsApiHandler,
  slug,
  method = 'GET',
  body,
  headers
}: {
  handler?: ReturnType<typeof createCommerceOneTimePaymentsApiHandler>;
  slug: string[];
  method?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}) {
  const request = new Request(`https://example.test/${slug.join('/')}`, {
    method,
    headers:
      body === undefined
        ? headers
        : {
            ...(headers || {}),
            'content-type': 'application/json'
          },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  return handler(request, {
    moduleId: 'mod.commerce.one-time-payments',
    slug
  });
}

function configureCurrentUser() {
  let currentUser: SessionUser | null = null;
  configureAuth({
    getUser: async () => currentUser
  });

  return {
    setUser(user: SessionUser | null) {
      currentUser = user;
    }
  };
}

function createIntentFixture(
  provider: 'stripe' | 'paypal',
  sessionId: string | null = null
): OneTimeIntent {
  const now = new Date('2026-02-14T00:00:00.000Z');
  return {
    id: provider === 'stripe' ? 8001 : 8002,
    intentKey: `otp_local_${provider}`,
    productId: 101,
    provider,
    status: sessionId ? 'session_created' : 'pending',
    targetType: 'user',
    targetUserId: 17,
    targetTeamId: null,
    amount: 2599,
    currency: 'USD',
    sessionId,
    providerIntentId: null,
    checkoutUrl: null,
    idempotencyKey: null,
    productSnapshot: {
      name: 'Local Simulation Product'
    },
    metadata: null,
    expiresAt: null,
    createdAt: now,
    updatedAt: now
  };
}

test('one-time module manifest exposes frontend products route alias', () => {
  assert.deepEqual(commerceOneTimePaymentsManifest.frontendRouteAliases, [
    '/products'
  ]);
  assert.equal(commerceOneTimePaymentsManifest.frontendRouteAccess, 'user');
  assert.equal(typeof commerceOneTimePaymentsManifest.frontendPage, 'function');
});

test('one-time payments health route is public', async () => {
  configureCurrentUser().setUser(null);
  const response = await callApiRoute({
    slug: ['health']
  });

  assert.equal(response.status, 200);
});

test('one-time checkout session route requires authenticated user', async () => {
  const auth = configureCurrentUser();
  auth.setUser(null);

  const response = await callApiRoute({
    method: 'POST',
    slug: ['checkout-sessions'],
    body: {
      productId: 10
    }
  });

  assert.equal(response.status, 401);
});

test('one-time intent read route requires authenticated user', async () => {
  const auth = configureCurrentUser();
  auth.setUser(null);

  const response = await callApiRoute({
    slug: ['intents', '1']
  });

  assert.equal(response.status, 401);
});

test('one-time checkout session route validates payload before DB layer', async () => {
  const auth = configureCurrentUser();
  auth.setUser({
    id: 17,
    role: 'member'
  });

  const response = await callApiRoute({
    method: 'POST',
    slug: ['checkout-sessions'],
    body: {}
  });

  assert.equal(response.status, 400);
  const payload = (await response.json()) as {
    ok: boolean;
    code: string;
  };
  assert.equal(payload.ok, false);
  assert.equal(payload.code, 'invalid_product_id');
});

test('one-time intent read route validates intent id format before DB layer', async () => {
  const auth = configureCurrentUser();
  auth.setUser({
    id: 17,
    role: 'member'
  });

  const response = await callApiRoute({
    slug: ['intents', 'invalid']
  });

  assert.equal(response.status, 400);
  const payload = (await response.json()) as {
    ok: boolean;
    code: string;
  };
  assert.equal(payload.ok, false);
  assert.equal(payload.code, 'invalid_intent_id');
});

test('one-time Stripe webhook route returns 503 when Stripe webhook is not configured', async () => {
  configureCurrentUser().setUser(null);
  const handler = createCommerceOneTimePaymentsApiHandler({
    verifyStripeWebhookSignature: async () => ({
      ok: false,
      code: 'provider_not_configured',
      message: 'Stripe webhook is not configured.'
    })
  });

  const response = await callApiRoute({
    handler,
    method: 'POST',
    slug: ['webhooks', 'stripe'],
    body: {
      id: 'evt_test',
      type: 'checkout.session.completed'
    }
  });

  assert.equal(response.status, 503);
  const payload = (await response.json()) as {
    ok: boolean;
    code: string;
  };
  assert.equal(payload.ok, false);
  assert.equal(payload.code, 'provider_not_configured');
});

test('one-time PayPal webhook route returns 503 when PayPal webhook is not configured', async () => {
  configureCurrentUser().setUser(null);
  const handler = createCommerceOneTimePaymentsApiHandler({
    verifyPayPalWebhookSignature: async () => ({
      ok: false,
      code: 'provider_not_configured',
      message: 'PayPal webhook is not configured.'
    })
  });

  const response = await callApiRoute({
    handler,
    method: 'POST',
    slug: ['webhooks', 'paypal'],
    body: {}
  });

  assert.equal(response.status, 503);
  const payload = (await response.json()) as {
    ok: boolean;
    code: string;
  };
  assert.equal(payload.ok, false);
  assert.equal(payload.code, 'provider_not_configured');
});

test('one-time PayPal webhook route validates JSON payload', async () => {
  configureCurrentUser().setUser(null);
  const request = new Request('https://example.test/webhooks/paypal', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: '{'
  });

  const response = await commerceOneTimePaymentsApiHandler(request, {
    moduleId: 'mod.commerce.one-time-payments',
    slug: ['webhooks', 'paypal']
  });

  assert.equal(response.status, 400);
  const payload = (await response.json()) as {
    ok: boolean;
    code: string;
  };
  assert.equal(payload.ok, false);
  assert.equal(payload.code, 'invalid_json_body');
});

test('one-time checkout session route simulates end-to-end Stripe flow with configured provider deps', async () => {
  const auth = configureCurrentUser();
  auth.setUser({
    id: 17,
    role: 'member',
    email: 'member@test.com'
  });

  let createIntentCalls = 0;
  let stripeSessionCalls = 0;
  let attachCalls = 0;

  const handler = createCommerceOneTimePaymentsApiHandler({
    createOneTimeCheckoutIntent: async (_input, actor) => {
      createIntentCalls += 1;
      assert.equal(actor.userId, 17);
      return {
        ok: true,
        intent: createIntentFixture('stripe', null),
        idempotencyReused: false
      };
    },
    createStripeCheckoutSessionForOneTimeIntent: async (input) => {
      stripeSessionCalls += 1;
      assert.equal(input.intent.provider, 'stripe');
      assert.equal(input.customerEmail, 'member@test.com');
      return {
        ok: true,
        value: {
          sessionId: 'cs_local_1',
          checkoutUrl: 'https://checkout.stripe.local/cs_local_1',
          providerIntentId: 'pi_local_1',
          expiresAt: new Date('2026-02-14T01:00:00.000Z')
        }
      };
    },
    attachStripeSessionToOneTimeIntent: async (input) => {
      attachCalls += 1;
      assert.equal(input.sessionId, 'cs_local_1');
      return {
        ok: true,
        intent: {
          ...createIntentFixture('stripe', 'cs_local_1'),
          checkoutUrl: input.checkoutUrl,
          providerIntentId: input.providerIntentId,
          expiresAt: input.expiresAt
        },
        idempotencyReused: false
      };
    }
  });

  const response = await callApiRoute({
    handler,
    method: 'POST',
    slug: ['checkout-sessions'],
    body: {
      productId: 101,
      provider: 'stripe'
    }
  });

  assert.equal(response.status, 201);
  const payload = (await response.json()) as {
    ok: boolean;
    intent: OneTimeIntent;
    idempotencyReused: boolean;
  };
  assert.equal(payload.ok, true);
  assert.equal(payload.idempotencyReused, false);
  assert.equal(payload.intent.provider, 'stripe');
  assert.equal(payload.intent.sessionId, 'cs_local_1');
  assert.equal(payload.intent.providerIntentId, 'pi_local_1');
  assert.equal(createIntentCalls, 1);
  assert.equal(stripeSessionCalls, 1);
  assert.equal(attachCalls, 1);
});

test('one-time module payment-method Stripe start route returns provider_pending payload for checkout dispatcher', async () => {
  configureCurrentUser().setUser(null);

  let createSessionCalls = 0;
  let attachCalls = 0;

  const handler = createCommerceOneTimePaymentsApiHandler({
    getOneTimeIntentByIdForActor: async (intentId, actor) => {
      assert.equal(intentId, 8001);
      assert.equal(actor.userId, 17);
      return {
        ok: true,
        intent: createIntentFixture('stripe', null),
        fulfillment: null
      };
    },
    createStripeCheckoutSessionForOneTimeIntent: async (input) => {
      createSessionCalls += 1;
      assert.equal(input.intent.provider, 'stripe');
      assert.equal(input.customerEmail, 'member@test.com');
      assert.equal(
        input.successUrl,
        'https://example.test/checkout/tok_checkout_dispatch'
      );
      assert.equal(
        input.cancelUrl,
        'https://example.test/api/checkout/methods/onetime-stripe/cancel?checkoutToken=tok_checkout_dispatch'
      );

      return {
        ok: true,
        value: {
          sessionId: 'cs_dispatch_1',
          checkoutUrl: 'https://checkout.stripe.local/cs_dispatch_1',
          providerIntentId: 'pi_dispatch_1',
          expiresAt: new Date('2026-02-14T01:00:00.000Z')
        }
      };
    },
    attachStripeSessionToOneTimeIntent: async (input) => {
      attachCalls += 1;
      assert.equal(input.intentId, 8001);
      assert.equal(input.sessionId, 'cs_dispatch_1');
      return {
        ok: true,
        intent: {
          ...createIntentFixture('stripe', 'cs_dispatch_1'),
          checkoutUrl: input.checkoutUrl,
          providerIntentId: input.providerIntentId,
          expiresAt: input.expiresAt
        },
        idempotencyReused: false
      };
    }
  });

  const response = await callApiRoute({
    handler,
    method: 'POST',
    slug: ['payment-methods', 'stripe', 'start'],
    body: {
      action: 'start',
      checkoutOrder: {
        id: 99,
        checkoutToken: 'tok_checkout_dispatch',
        orderType: 'one_time',
        metadata: {
          oneTime: {
            intentId: 8001
          }
        }
      },
      actor: {
        userId: 17,
        userEmail: 'member@test.com'
      },
      callbacks: {
        cancelUrl: 'https://example.test/api/checkout/methods/onetime-stripe/cancel'
      }
    }
  });

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    status: string;
    checkoutToken: string;
    checkoutOrderId: number;
    redirectUrl: string | null;
    providerSessionId: string | null;
  };
  assert.equal(payload.status, 'provider_pending');
  assert.equal(payload.checkoutToken, 'tok_checkout_dispatch');
  assert.equal(payload.checkoutOrderId, 99);
  assert.equal(payload.redirectUrl, 'https://checkout.stripe.local/cs_dispatch_1');
  assert.equal(payload.providerSessionId, 'cs_dispatch_1');
  assert.equal(createSessionCalls, 1);
  assert.equal(attachCalls, 1);
});

test('one-time module payment-method Stripe start route rejects provider mismatch', async () => {
  configureCurrentUser().setUser(null);

  const handler = createCommerceOneTimePaymentsApiHandler({
    getOneTimeIntentByIdForActor: async () => ({
      ok: true,
      intent: createIntentFixture('paypal', null),
      fulfillment: null
    })
  });

  const response = await callApiRoute({
    handler,
    method: 'POST',
    slug: ['payment-methods', 'stripe', 'start'],
    body: {
      action: 'start',
      checkoutOrder: {
        id: 100,
        checkoutToken: 'tok_provider_mismatch',
        orderType: 'one_time',
        metadata: {
          oneTime: {
            intentId: 8002
          }
        }
      },
      actor: {
        userId: 17
      }
    }
  });

  assert.equal(response.status, 409);
  const payload = (await response.json()) as {
    ok: boolean;
    code: string | null;
  };
  assert.equal(payload.ok, false);
  assert.equal(payload.code, 'operation_failed');
});

test('one-time module payment-method cancel route returns canceled payload with checkout redirect', async () => {
  configureCurrentUser().setUser(null);

  const response = await callApiRoute({
    method: 'POST',
    slug: ['payment-methods', 'paypal', 'cancel'],
    body: {
      action: 'cancel',
      fallbackCheckoutToken: 'tok_cancel_1'
    }
  });

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    status: string;
    checkoutToken: string;
    redirectUrl: string;
  };
  assert.equal(payload.status, 'canceled');
  assert.equal(payload.checkoutToken, 'tok_cancel_1');
  assert.equal(payload.redirectUrl, '/checkout/tok_cancel_1');
});

test('one-time checkout session route supports core checkout mode without provider session creation', async () => {
  const auth = configureCurrentUser();
  auth.setUser({
    id: 17,
    role: 'member',
    email: 'member@test.com'
  });

  let stripeSessionCalls = 0;
  let attachCalls = 0;

  const handler = createCommerceOneTimePaymentsApiHandler({
    createOneTimeCheckoutIntent: async (input, actor) => {
      assert.equal(actor.userId, 17);
      assert.equal(input.checkoutMode, 'core_checkout');
      return {
        ok: true,
        intent: {
          ...createIntentFixture('stripe', null),
          checkoutUrl: '/checkout/tok_core_1'
        },
        idempotencyReused: false
      };
    },
    createStripeCheckoutSessionForOneTimeIntent: async () => {
      stripeSessionCalls += 1;
      return {
        ok: true,
        value: {
          sessionId: 'cs_should_not_be_used',
          checkoutUrl: 'https://checkout.stripe.local/cs_should_not_be_used',
          providerIntentId: 'pi_should_not_be_used',
          expiresAt: new Date('2026-02-14T01:00:00.000Z')
        }
      };
    },
    attachStripeSessionToOneTimeIntent: async (input) => {
      attachCalls += 1;
      return {
        ok: true,
        intent: {
          ...createIntentFixture('stripe', 'cs_should_not_be_used'),
          checkoutUrl: input.checkoutUrl,
          providerIntentId: input.providerIntentId,
          expiresAt: input.expiresAt
        },
        idempotencyReused: false
      };
    }
  });

  const response = await callApiRoute({
    handler,
    method: 'POST',
    slug: ['checkout-sessions'],
    body: {
      productId: 101,
      provider: 'stripe',
      checkoutMode: 'core_checkout'
    }
  });

  assert.equal(response.status, 201);
  const payload = (await response.json()) as {
    ok: boolean;
    intent: OneTimeIntent;
    idempotencyReused: boolean;
  };
  assert.equal(payload.ok, true);
  assert.equal(payload.idempotencyReused, false);
  assert.equal(payload.intent.checkoutUrl, '/checkout/tok_core_1');
  assert.equal(payload.intent.sessionId, null);
  assert.equal(stripeSessionCalls, 0);
  assert.equal(attachCalls, 0);
});

test('one-time checkout session route simulates end-to-end PayPal flow with configured provider deps', async () => {
  const auth = configureCurrentUser();
  auth.setUser({
    id: 17,
    role: 'member',
    email: 'member@test.com'
  });

  let payPalSessionCalls = 0;
  let attachCalls = 0;

  const handler = createCommerceOneTimePaymentsApiHandler({
    createOneTimeCheckoutIntent: async () => ({
      ok: true,
      intent: createIntentFixture('paypal', null),
      idempotencyReused: false
    }),
    createPayPalCheckoutSessionForOneTimeIntent: async (input) => {
      payPalSessionCalls += 1;
      assert.equal(input.intent.provider, 'paypal');
      return {
        ok: true,
        value: {
          sessionId: 'ORDER-LOCAL-1',
          checkoutUrl: 'https://paypal.local/checkout?token=ORDER-LOCAL-1',
          providerIntentId: 'ORDER-LOCAL-1',
          expiresAt: null
        }
      };
    },
    attachPayPalSessionToOneTimeIntent: async (input) => {
      attachCalls += 1;
      assert.equal(input.sessionId, 'ORDER-LOCAL-1');
      return {
        ok: true,
        intent: {
          ...createIntentFixture('paypal', 'ORDER-LOCAL-1'),
          checkoutUrl: input.checkoutUrl,
          providerIntentId: input.providerIntentId,
          expiresAt: input.expiresAt
        },
        idempotencyReused: false
      };
    }
  });

  const response = await callApiRoute({
    handler,
    method: 'POST',
    slug: ['checkout-sessions'],
    body: {
      productId: 101,
      provider: 'paypal'
    }
  });

  assert.equal(response.status, 201);
  const payload = (await response.json()) as {
    ok: boolean;
    intent: OneTimeIntent;
  };
  assert.equal(payload.ok, true);
  assert.equal(payload.intent.provider, 'paypal');
  assert.equal(payload.intent.sessionId, 'ORDER-LOCAL-1');
  assert.equal(payload.intent.providerIntentId, 'ORDER-LOCAL-1');
  assert.equal(payPalSessionCalls, 1);
  assert.equal(attachCalls, 1);
});

test('one-time Stripe webhook route simulates configured verification and processing pipeline', async () => {
  configureCurrentUser().setUser(null);

  const handler = createCommerceOneTimePaymentsApiHandler({
    verifyStripeWebhookSignature: async ({ rawBody, signature }) => {
      assert.equal(typeof rawBody, 'string');
      assert.equal(signature, 't=1,v1=test');
      return {
        ok: true,
        event: {
          id: 'evt_local_1',
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_local_1'
            }
          }
        } as any
      };
    },
    processOneTimeStripeWebhookEvent: async () => ({
      handled: true,
      duplicate: false,
      status: 'paid',
      intentId: 8001,
      message: 'Stripe local simulation processed.'
    })
  });

  const response = await callApiRoute({
    handler,
    method: 'POST',
    slug: ['webhooks', 'stripe'],
    headers: {
      'stripe-signature': 't=1,v1=test'
    },
    body: {
      id: 'evt_local_1'
    }
  });

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    ok: boolean;
    handled: boolean;
    status: string | null;
    intentId: number | null;
  };
  assert.equal(payload.ok, true);
  assert.equal(payload.handled, true);
  assert.equal(payload.status, 'paid');
  assert.equal(payload.intentId, 8001);
});

test('one-time PayPal webhook route simulates configured verification and processing pipeline', async () => {
  configureCurrentUser().setUser(null);

  const handler = createCommerceOneTimePaymentsApiHandler({
    verifyPayPalWebhookSignature: async ({ event }) => {
      assert.equal(
        typeof event.event_type === 'string' ||
          typeof event.event_type === 'undefined',
        true
      );
      return { ok: true };
    },
    processOneTimePayPalWebhookEvent: async () => ({
      handled: true,
      duplicate: false,
      status: 'paid',
      intentId: 8002,
      message: 'PayPal local simulation processed.'
    })
  });

  const response = await callApiRoute({
    handler,
    method: 'POST',
    slug: ['webhooks', 'paypal'],
    body: {
      id: 'WH-LOCAL-1',
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: {
        id: 'CAPTURE-LOCAL-1'
      }
    }
  });

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    ok: boolean;
    handled: boolean;
    status: string | null;
    intentId: number | null;
  };
  assert.equal(payload.ok, true);
  assert.equal(payload.handled, true);
  assert.equal(payload.status, 'paid');
  assert.equal(payload.intentId, 8002);
});
