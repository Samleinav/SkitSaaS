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
    'payment methods core return dispatch tests require module mocks support',
    { skip: 'Run with --experimental-test-module-mocks' },
    () => {}
  );
} else {
  test('executeCheckoutPaymentMethodAction uses direct core return helpers for stripe and paypal', async () => {
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
        executeStripeCheckoutReturnAction: async (payload: Record<string, unknown>) => {
          state.stripeCalls.push(payload);
          return {
            ok: true,
            result: {
              status: 'completed',
              checkoutToken: 'tok_stripe',
              checkoutOrderId: 11,
              redirectUrl: '/dashboard',
              paymentMethod: 'card'
            },
            checkoutOrder: null
          };
        },
        executePayPalCheckoutReturnAction: async (payload: Record<string, unknown>) => {
          state.paypalCalls.push(payload);
          return {
            ok: true,
            result: {
              status: 'completed',
              checkoutToken: 'tok_paypal',
              checkoutOrderId: 22,
              redirectUrl: '/dashboard',
              paymentMethod: 'paypal'
            },
            checkoutOrder: null
          };
        }
      }
    });

    const paymentMethods = await import('../../lib/payments/payment-methods');

    const stripeResult = await paymentMethods.executeCheckoutPaymentMethodAction({
      paymentMethodId: 'stripe',
      action: 'return',
      request: new Request(
        'http://localhost/api/checkout/methods/stripe/return?session_id=cs_test_123'
      ),
      fallbackCheckoutToken: 'tok_stripe',
      source: 'checkout'
    });
    assert.equal(stripeResult.ok, true);
    assert.equal(state.stripeCalls.length, 1);
    assert.equal(state.paypalCalls.length, 0);
    assert.equal(state.stripeCalls[0]?.source, '/api/checkout/methods/stripe/return');

    const payPalResult = await paymentMethods.executeCheckoutPaymentMethodAction({
      paymentMethodId: 'paypal',
      action: 'return',
      request: new Request('http://localhost/api/checkout/methods/paypal/return', {
        method: 'POST',
        body: JSON.stringify({ subscriptionId: 'sub_test_123' }),
        headers: {
          'content-type': 'application/json'
        }
      }),
      fallbackCheckoutToken: 'tok_paypal',
      source: 'checkout'
    });
    assert.equal(payPalResult.ok, true);
    assert.equal(state.paypalCalls.length, 1);
    assert.equal(state.paypalCalls[0]?.source, '/api/checkout/methods/paypal/return');

    mock.restoreAll();
  });
}
