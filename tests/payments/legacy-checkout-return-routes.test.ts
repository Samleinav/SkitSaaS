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
    'legacy checkout return route tests require module mocks support',
    { skip: 'Run with --experimental-test-module-mocks' },
    () => {}
  );
} else {
  test('legacy stripe and paypal checkout routes delegate to shared core return helpers', async () => {
    const state: {
      stripeCalls: Array<Record<string, unknown>>;
      paypalCalls: Array<Record<string, unknown>>;
    } = {
      stripeCalls: [],
      paypalCalls: []
    };

    applyModuleMock('@/lib/payments/legacy-routes', {
      namedExports: {
        logLegacyCheckoutRouteUsage: async () => {}
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
              redirectUrl: '/dashboard'
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
              redirectUrl: '/dashboard',
              metadata: {
                subscription: {
                  id: 'sub_test_123'
                }
              }
            },
            checkoutOrder: null
          };
        }
      }
    });

    const stripeRoute = await import('../../app/api/stripe/checkout/route');
    const paypalRoute = await import('../../app/api/paypal/checkout/route');

    const stripeResponse = await stripeRoute.GET(
      new Request('http://localhost/api/stripe/checkout?session_id=cs_test_123') as never
    );
    assert.equal(stripeResponse.status, 307);
    assert.equal(stripeResponse.headers.get('location'), 'http://localhost/dashboard');
    assert.equal(state.stripeCalls.length, 1);
    assert.equal(state.stripeCalls[0]?.source, '/api/stripe/checkout');

    const payPalResponse = await paypalRoute.POST(
      new Request('http://localhost/api/paypal/checkout', {
        method: 'POST',
        body: JSON.stringify({ subscriptionId: 'sub_test_123' }),
        headers: {
          'content-type': 'application/json'
        }
      }) as never
    );
    assert.equal(payPalResponse.status, 200);
    const payPalBody = (await payPalResponse.json()) as Record<string, unknown>;
    assert.equal(payPalBody.ok, true);
    assert.deepEqual(payPalBody.subscription, { id: 'sub_test_123' });
    assert.equal(state.paypalCalls.length, 1);
    assert.equal(state.paypalCalls[0]?.source, '/api/paypal/checkout');

    mock.restoreAll();
  });
}
