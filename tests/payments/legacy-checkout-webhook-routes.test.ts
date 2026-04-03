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
    'legacy checkout webhook route tests require module mocks support',
    { skip: 'Run with --experimental-test-module-mocks' },
    () => {}
  );
} else {
  test('legacy stripe and paypal webhook routes delegate to shared core webhook helpers', async () => {
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

    applyModuleMock('@/lib/payments/core-webhook-actions', {
      namedExports: {
        executeStripeCheckoutWebhookAction: async (payload: Record<string, unknown>) => {
          state.stripeCalls.push(payload);
          return {
            ok: true,
            result: {
              status: 'completed'
            },
            checkoutOrder: null
          };
        },
        executePayPalCheckoutWebhookAction: async (payload: Record<string, unknown>) => {
          state.paypalCalls.push(payload);
          return {
            ok: true,
            result: {
              status: 'completed'
            },
            checkoutOrder: null
          };
        }
      }
    });

    const stripeRoute = await import('../../app/api/stripe/webhook/route');
    const paypalRoute = await import('../../app/api/paypal/webhook/route');

    const stripeResponse = await stripeRoute.POST(
      new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        body: 'payload'
      }) as never
    );
    assert.equal(stripeResponse.status, 200);
    const stripeBody = (await stripeResponse.json()) as Record<string, unknown>;
    assert.equal(stripeBody.received, true);
    assert.equal(state.stripeCalls.length, 1);
    assert.equal(state.stripeCalls[0]?.source, '/api/stripe/webhook');

    const payPalResponse = await paypalRoute.POST(
      new Request('http://localhost/api/paypal/webhook', {
        method: 'POST',
        body: JSON.stringify({ id: 'WH-123' }),
        headers: {
          'content-type': 'application/json'
        }
      }) as never
    );
    assert.equal(payPalResponse.status, 200);
    const payPalBody = (await payPalResponse.json()) as Record<string, unknown>;
    assert.equal(payPalBody.received, true);
    assert.equal(state.paypalCalls.length, 1);
    assert.equal(state.paypalCalls[0]?.source, '/api/paypal/webhook');

    mock.restoreAll();
  });
}
