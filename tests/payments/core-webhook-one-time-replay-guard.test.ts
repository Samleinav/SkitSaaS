import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canReuseConvergedOneTimeCheckoutWebhook,
  resolvePayPalWebhookSignatureRequirement
} from '../../lib/payments/core-webhook-actions';
import type { CheckoutOrderWithMetadata } from '../../lib/payments/checkout-orders';

function createCheckoutOrder(
  overrides: Partial<CheckoutOrderWithMetadata>
): CheckoutOrderWithMetadata {
  return {
    id: 1,
    checkoutToken: 'chk_test_123',
    orderType: 'one_time',
    status: 'completed',
    selectedProvider: 'paypal',
    providerSessionId: 'ORDER-123',
    providerReferenceId: 'CAPTURE-456',
    parsedMetadata: null,
    ...overrides
  } as CheckoutOrderWithMetadata;
}

test('canReuseConvergedOneTimeCheckoutWebhook accepts matching completed or failed provider states', () => {
  assert.equal(
    canReuseConvergedOneTimeCheckoutWebhook({
      checkoutOrder: createCheckoutOrder({}),
      provider: 'paypal',
      nextStatus: 'completed',
      providerSessionId: 'ORDER-123',
      providerReferenceId: 'CAPTURE-456'
    }),
    true
  );

  assert.equal(
    canReuseConvergedOneTimeCheckoutWebhook({
      checkoutOrder: createCheckoutOrder({
        status: 'failed',
        providerReferenceId: 'CAPTURE-FAILED'
      }),
      provider: 'paypal',
      nextStatus: 'failed',
      providerReferenceId: 'CAPTURE-FAILED'
    }),
    true
  );
});

test('canReuseConvergedOneTimeCheckoutWebhook accepts matching provider_pending state by session', () => {
  assert.equal(
    canReuseConvergedOneTimeCheckoutWebhook({
      checkoutOrder: createCheckoutOrder({
        status: 'provider_pending',
        providerReferenceId: null
      }),
      provider: 'paypal',
      nextStatus: 'provider_pending',
      providerSessionId: 'ORDER-123'
    }),
    true
  );
});

test('canReuseConvergedOneTimeCheckoutWebhook rejects mismatched status, provider, or identifiers', () => {
  assert.equal(
    canReuseConvergedOneTimeCheckoutWebhook({
      checkoutOrder: createCheckoutOrder({}),
      provider: 'stripe',
      nextStatus: 'completed',
      providerSessionId: 'ORDER-123'
    }),
    false
  );

  assert.equal(
    canReuseConvergedOneTimeCheckoutWebhook({
      checkoutOrder: createCheckoutOrder({ status: 'provider_pending' }),
      provider: 'paypal',
      nextStatus: 'completed',
      providerSessionId: 'ORDER-123'
    }),
    false
  );

  assert.equal(
    canReuseConvergedOneTimeCheckoutWebhook({
      checkoutOrder: createCheckoutOrder({}),
      provider: 'paypal',
      nextStatus: 'completed',
      providerSessionId: 'ORDER-999',
      providerReferenceId: 'CAPTURE-999'
    }),
    false
  );

  assert.equal(
    canReuseConvergedOneTimeCheckoutWebhook({
      checkoutOrder: createCheckoutOrder({ orderType: 'subscription' }),
      provider: 'paypal',
      nextStatus: 'completed',
      providerSessionId: 'ORDER-123'
    }),
    false
  );
});

test('resolvePayPalWebhookSignatureRequirement requires webhook id in production-like runtimes', () => {
  assert.deepEqual(
    resolvePayPalWebhookSignatureRequirement({
      webhookId: null,
      paypalEnvironment: 'sandbox',
      nodeEnv: 'development',
      vercelEnv: null,
      appEnv: null
    }),
    {
      configured: false,
      required: false,
      webhookId: null
    }
  );

  assert.deepEqual(
    resolvePayPalWebhookSignatureRequirement({
      webhookId: ' WH-TEST-ID ',
      paypalEnvironment: 'production',
      nodeEnv: 'development',
      vercelEnv: null,
      appEnv: null
    }),
    {
      configured: true,
      required: true,
      webhookId: 'WH-TEST-ID'
    }
  );

  assert.deepEqual(
    resolvePayPalWebhookSignatureRequirement({
      webhookId: null,
      paypalEnvironment: 'live',
      nodeEnv: 'test',
      vercelEnv: null,
      appEnv: null
    }),
    {
      configured: false,
      required: true,
      webhookId: null
    }
  );

  assert.deepEqual(
    resolvePayPalWebhookSignatureRequirement({
      webhookId: '',
      paypalEnvironment: 'sandbox',
      nodeEnv: 'test',
      vercelEnv: 'production',
      appEnv: null
    }),
    {
      configured: false,
      required: true,
      webhookId: null
    }
  );
});
