import assert from 'node:assert/strict';
import test, { mock } from 'node:test';

type ModuleMockFn = (
  specifier: string,
  options: {
    namedExports?: Record<string, unknown>;
  }
) => void;

const hasModuleMock =
  typeof (mock as unknown as { module?: ModuleMockFn }).module === 'function';

function applyModuleMock(
  specifier: string,
  options: {
    namedExports?: Record<string, unknown>;
  }
) {
  const mockObject = mock as unknown as { module?: ModuleMockFn };
  if (!mockObject.module) {
    return;
  }

  mockObject.module(specifier, options);
}

if (!hasModuleMock) {
  test(
    'payment methods core webhook dispatch tests require module mocks support',
    { skip: 'Run with --experimental-test-module-mocks' },
    () => {}
  );
} else {
  test('executeCheckoutPaymentMethodAction uses direct core webhook helpers for stripe and paypal', async () => {
    const state: {
      stripeCalls: Array<Record<string, unknown>>;
      paypalCalls: Array<Record<string, unknown>>;
    } = {
      stripeCalls: [],
      paypalCalls: []
    };

    applyModuleMock('@/lib/modules/runtime', {
      namedExports: {
        getEnabledPaymentMethodRegistry: async () => ({
          methods: [],
          issues: []
        }),
        resolveModuleApiHandler: async () => null
      }
    });

    applyModuleMock('@/lib/system/activity-logs', {
      namedExports: {
        createSysActivityLog: async () => {}
      }
    });

    applyModuleMock('@/lib/payments/attempt-logs', {
      namedExports: {
        createCheckoutPaymentAttemptLog: async () => {}
      }
    });

    applyModuleMock('@/lib/payments/core-return-actions', {
      namedExports: {
        executeStripeCheckoutReturnAction: async () => {
          throw new Error('return helper should not be called');
        },
        executePayPalCheckoutReturnAction: async () => {
          throw new Error('return helper should not be called');
        }
      }
    });

    applyModuleMock('@/lib/payments/core-webhook-actions', {
      namedExports: {
        executeStripeCheckoutWebhookAction: async (payload: Record<string, unknown>) => {
          state.stripeCalls.push(payload);
          return {
            ok: true,
            result: {
              status: 'completed',
              paymentMethod: 'stripe',
              eventType: 'customer.subscription.updated'
            },
            checkoutOrder: null
          };
        },
        executePayPalCheckoutWebhookAction: async (payload: Record<string, unknown>) => {
          state.paypalCalls.push(payload);
          return {
            ok: true,
            result: {
              status: 'completed',
              paymentMethod: 'paypal',
              eventType: 'BILLING.SUBSCRIPTION.ACTIVATED'
            },
            checkoutOrder: null
          };
        }
      }
    });

    const paymentMethods = await import('../../lib/payments/payment-methods');

    const stripeResult = await paymentMethods.executeCheckoutPaymentMethodAction({
      paymentMethodId: 'stripe',
      action: 'webhook',
      request: new Request('http://localhost/api/checkout/methods/stripe/webhook', {
        method: 'POST',
        body: 'payload'
      }),
      source: 'webhook'
    });
    assert.equal(stripeResult.ok, true);
    assert.equal(state.stripeCalls.length, 1);
    assert.equal(state.paypalCalls.length, 0);
    assert.equal(state.stripeCalls[0]?.source, '/api/checkout/methods/stripe/webhook');

    const payPalResult = await paymentMethods.executeCheckoutPaymentMethodAction({
      paymentMethodId: 'paypal',
      action: 'webhook',
      request: new Request('http://localhost/api/checkout/methods/paypal/webhook', {
        method: 'POST',
        body: JSON.stringify({ id: 'WH-123' }),
        headers: {
          'content-type': 'application/json'
        }
      }),
      source: 'webhook'
    });
    assert.equal(payPalResult.ok, true);
    assert.equal(state.paypalCalls.length, 1);
    assert.equal(state.paypalCalls[0]?.source, '/api/checkout/methods/paypal/webhook');

    mock.restoreAll();
  });
}
