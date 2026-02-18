import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { NextRequest } from 'next/server';

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
    'checkout methods route tests require module mocks support',
    { skip: 'Run with --experimental-test-module-mocks' },
    () => {}
  );
} else {
  test('checkout methods route resolves user and team target access', async () => {
    const state: {
      user: { id: number; email: string; role: string } | null;
      checkoutAccess:
        | {
            checkoutOrder: {
              checkoutToken: string;
              orderType: string;
              targetType: string;
              parsedMetadata: Record<string, unknown> | null;
            };
            teamRole: string | null;
          }
        | null;
    } = {
      user: null,
      checkoutAccess: null
    };

    applyModuleMock('@/lib/db/queries', {
      namedExports: {
        getUser: async () => state.user
      }
    });

    applyModuleMock('@/lib/payments/checkout-orders', {
      namedExports: {
        getCheckoutOrderByTokenForUser: async () => state.checkoutAccess
      }
    });

    applyModuleMock('@/lib/payments/payment-methods', {
      namedExports: {
        getCheckoutPaymentMethodRegistry: async () => ({
          methods: [
            {
              paymentMethodId: 'stripe',
              ownerType: 'core',
              displayName: 'Stripe',
              description: null,
              order: 10,
              supportsOrderTypes: ['subscription', 'one_time'],
              routes: {
                startPath: '/api/checkout/{checkoutToken}/pay/stripe',
                cancelPath: null,
                returnPath: null,
                webhookPath: null
              },
              metadata: null
            },
            {
              paymentMethodId: 'onetime-stripe',
              ownerType: 'module',
              displayName: 'Stripe (One-time)',
              description: null,
              order: 110,
              supportsOrderTypes: ['one_time'],
              routes: {
                startPath: '/api/modules/mod.commerce.one-time-payments/payment-methods/stripe/start',
                cancelPath: '/api/modules/mod.commerce.one-time-payments/payment-methods/stripe/cancel',
                returnPath: null,
                webhookPath: null
              },
              metadata: {
                provider: 'stripe'
              }
            },
            {
              paymentMethodId: 'onetime-paypal',
              ownerType: 'module',
              displayName: 'PayPal (One-time)',
              description: null,
              order: 120,
              supportsOrderTypes: ['one_time'],
              routes: {
                startPath: '/api/modules/mod.commerce.one-time-payments/payment-methods/paypal/start',
                cancelPath: '/api/modules/mod.commerce.one-time-payments/payment-methods/paypal/cancel',
                returnPath: null,
                webhookPath: null
              },
              metadata: {
                provider: 'paypal'
              }
            }
          ],
          issues: []
        }),
        supportsCheckoutPaymentMethodOrderType: () => true
      }
    });

    applyModuleMock('@/lib/payments/stripe', {
      namedExports: {
        isStripeConfigured: async () => true
      }
    });

    applyModuleMock('@/lib/payments/paypal', {
      namedExports: {
        isPayPalConfigured: async () => true,
        getPayPalClientId: async () => 'client_id'
      }
    });

    const { GET } = await import('../../app/api/checkout/methods/route');

    async function callRoute(url: string) {
      const response = await GET(new NextRequest(url));
      const body = (await response.json()) as Record<string, unknown>;
      return { response, body };
    }

    state.user = null;
    let response = await callRoute('http://localhost/api/checkout/methods');
    assert.equal(response.response.status, 401);

    state.user = { id: 7, email: 'member@example.com', role: 'member' };
    state.checkoutAccess = {
      checkoutOrder: {
        checkoutToken: 'tok_1',
        orderType: 'one_time',
        targetType: 'team',
        parsedMetadata: null
      },
      teamRole: 'member'
    };
    response = await callRoute(
      'http://localhost/api/checkout/methods?checkoutToken=tok_1'
    );
    assert.equal(response.response.status, 403);

    state.checkoutAccess = {
      checkoutOrder: {
        checkoutToken: 'tok_1',
        orderType: 'one_time',
        targetType: 'user',
        parsedMetadata: {
          oneTime: {
            provider: 'stripe'
          }
        }
      },
      teamRole: null
    };
    response = await callRoute(
      'http://localhost/api/checkout/methods?checkoutToken=tok_1'
    );
    assert.equal(response.response.status, 200);
    assert.equal(response.body.ok, true);
    assert.deepEqual(
      ((response.body.methods as Array<{ paymentMethodId: string }> | undefined) || []).map(
        (method) => method.paymentMethodId
      ),
      ['stripe', 'onetime-stripe', 'onetime-paypal']
    );

    mock.restoreAll();
  });
}
