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
    'payment methods module return dispatch tests require module mocks support',
    { skip: 'Run with --experimental-test-module-mocks' },
    () => {}
  );
} else {
  test('executeCheckoutPaymentMethodAction falls back to the original GET callback for module return routes', async () => {
    const state: {
      dispatchCalls: Array<{
        method: string;
        pathname: string;
        search: string;
        dispatchFormat: string | null;
        action: string | null;
        body: string | null;
      }>;
    } = {
      dispatchCalls: []
    };

    applyModuleMock('@/lib/modules/runtime', {
      namedExports: {
        getEnabledPaymentMethodRegistry: async () => ({
          methods: [
            {
              paymentMethodId: 'walletx',
              ownerType: 'module',
              moduleId: 'mod.pay.wallet',
              displayName: 'Wallet X',
              description: null,
              order: 50,
              supportsOrderTypes: ['subscription', 'one_time'],
              supportsTargetTypes: ['team', 'user'],
              routes: {
                startPath: '/payments/walletx/start',
                cancelPath: '/payments/walletx/cancel',
                returnPath: '/payments/walletx/return',
                webhookPath: '/payments/walletx/webhook'
              },
              checkoutUi: {
                mode: 'redirect',
                badge: null,
                iconKey: 'wallet',
                ctaLabel: 'Continue with Wallet X'
              },
              metadata: null
            }
          ],
          issues: []
        }),
        resolveModuleApiHandler: async ({
          request
        }: {
          request: Request;
        }) => {
          const url = new URL(request.url);
          const body = request.method === 'POST' ? await request.text() : null;

          state.dispatchCalls.push({
            method: request.method,
            pathname: url.pathname,
            search: url.search,
            dispatchFormat: request.headers.get('x-checkout-method-dispatch-format'),
            action: request.headers.get('x-checkout-method-dispatch'),
            body
          });

          if (request.method === 'POST') {
            return null;
          }

          return Response.json({
            status: 'completed',
            checkoutToken: 'tok_walletx',
            paymentMethod: 'walletx',
            redirectUrl: '/dashboard/billing'
          });
        }
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

    try {
      const paymentMethods = await import('../../lib/payments/payment-methods');

      const result = await paymentMethods.executeCheckoutPaymentMethodAction({
        paymentMethodId: 'walletx',
        action: 'return',
        request: new Request(
          'http://localhost/api/checkout/methods/walletx/return?checkoutToken=tok_walletx&session_id=sess_123'
        ),
        fallbackCheckoutToken: 'tok_walletx',
        source: 'checkout'
      });

      assert.equal(result.ok, true);
      if (!result.ok) {
        return;
      }

      assert.equal(result.result.checkoutToken, 'tok_walletx');
      assert.equal(result.result.redirectUrl, '/dashboard/billing');

      assert.equal(state.dispatchCalls.length, 2);
      assert.equal(state.dispatchCalls[0]?.method, 'POST');
      assert.equal(
        state.dispatchCalls[0]?.dispatchFormat,
        'normalized-json'
      );
      assert.equal(state.dispatchCalls[0]?.action, 'return');
      assert.equal(
        state.dispatchCalls[0]?.pathname,
        '/api/modules/mod.pay.wallet/payments/walletx/return'
      );

      const normalizedPayload = JSON.parse(
        state.dispatchCalls[0]?.body ?? '{}'
      ) as Record<string, unknown>;
      assert.equal(normalizedPayload.action, 'return');
      assert.equal(normalizedPayload.fallbackCheckoutToken, 'tok_walletx');
      assert.deepEqual(normalizedPayload.query, {
        checkoutToken: 'tok_walletx',
        session_id: 'sess_123'
      });

      assert.equal(state.dispatchCalls[1]?.method, 'GET');
      assert.equal(state.dispatchCalls[1]?.dispatchFormat, 'raw-request');
      assert.equal(
        state.dispatchCalls[1]?.pathname,
        '/api/modules/mod.pay.wallet/payments/walletx/return'
      );
      assert.equal(
        state.dispatchCalls[1]?.search,
        '?checkoutToken=tok_walletx&session_id=sess_123'
      );
      assert.equal(state.dispatchCalls[1]?.body, null);
    } finally {
      mock.restoreAll();
    }
  });
}
