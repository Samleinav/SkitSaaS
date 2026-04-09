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
    'checkout method cancel route tests require module mocks support',
    { skip: 'Run with --experimental-test-module-mocks' },
    () => {}
  );
} else {
  test('checkout method cancel route enforces core auth and delegates dispatch', async () => {
    const state: {
      methodOwner: 'core' | 'module' | null;
      user: { id: number; email: string; role: string } | null;
      team: {
        id: number;
        teamMembers: Array<{ userId: number; role: string }>;
      } | null;
      checkoutAccess: {
        checkoutOrder: { id: number; targetType: string };
        teamRole: string | null;
      } | null;
      signupIntentAccess:
        | {
            checkoutOrder: { id: number; targetType: string | null };
          }
        | null;
      dispatchResult:
        | {
            ok: true;
            result: Record<string, unknown>;
            checkoutOrder: Record<string, unknown> | null;
          }
        | {
            ok: false;
            statusCode: number;
            error: string;
          };
      dispatchCalls: Array<Record<string, unknown>>;
      lookupCalls: Array<Record<string, unknown>>;
    } = {
      methodOwner: 'module',
      user: null,
      team: null,
      checkoutAccess: null,
      signupIntentAccess: null,
      dispatchResult: {
        ok: true,
        result: {
          status: 'canceled'
        },
        checkoutOrder: null
      },
      dispatchCalls: [],
      lookupCalls: []
    };

    applyModuleMock('@/lib/payments/payment-methods', {
      namedExports: {
        getCheckoutPaymentMethodById: async (paymentMethodId: string) => {
          if (!state.methodOwner) {
            return {
              method: null,
              issue: null,
              registry: { methods: [], issues: [] }
            };
          }

          return {
            method: {
              paymentMethodId,
              ownerType: state.methodOwner,
              moduleId: state.methodOwner === 'module' ? 'mod.pay.fake' : null,
              displayName: 'Fake',
              description: null,
              order: 10,
              supportsOrderTypes: ['subscription'],
              routes: {
                startPath: '/start/fake',
                cancelPath: '/cancel/fake',
                returnPath: null,
                webhookPath: null
              },
              metadata: null
            },
            issue: null,
            registry: { methods: [], issues: [] }
          };
        },
        executeCheckoutPaymentMethodAction: async (
          payload: Record<string, unknown>
        ) => {
          state.dispatchCalls.push(payload);
          return state.dispatchResult;
        }
      }
    });

    applyModuleMock('@/lib/db/queries', {
      namedExports: {
        getUser: async () => state.user,
        getTeamForUser: async () => state.team
      }
    });

    applyModuleMock('@/lib/payments/checkout-orders', {
      namedExports: {
        getCheckoutOrderByTokenForUser: async (payload: Record<string, unknown>) => {
          state.lookupCalls.push(payload);
          return state.checkoutAccess;
        }
      }
    });

    applyModuleMock('@/lib/payments/signup-intents', {
      namedExports: {
        getSignupIntentCheckoutAccessByToken: async () => state.signupIntentAccess
      }
    });

    const { POST } = await import(
      '../../app/api/checkout/methods/[paymentMethodId]/cancel/route'
    );

    async function callRoute({
      methodId,
      url
    }: {
      methodId: string;
      url: string;
    }) {
      const request = new Request(url, {
        method: 'POST'
      });
      const response = await POST(request as never, {
        params: { paymentMethodId: methodId }
      } as never);
      const body = (await response.json()) as Record<string, unknown>;
      return { response, body };
    }

    state.methodOwner = 'module';
    state.user = null;
    state.team = null;
    state.checkoutAccess = null;
    state.dispatchCalls.length = 0;
    state.lookupCalls.length = 0;
    const moduleCancel = await callRoute({
      methodId: 'walletx',
      url: 'http://localhost/api/checkout/methods/walletx/cancel'
    });
    assert.equal(moduleCancel.response.status, 200);
    assert.equal(state.dispatchCalls.length, 1);
    assert.equal(state.lookupCalls.length, 0);

    state.methodOwner = 'core';
    state.user = null;
    state.team = null;
    state.signupIntentAccess = null;
    state.dispatchCalls.length = 0;
    const coreNoAuth = await callRoute({
      methodId: 'paypal',
      url: 'http://localhost/api/checkout/methods/paypal/cancel?checkoutToken=abc'
    });
    assert.equal(coreNoAuth.response.status, 401);
    assert.equal(state.dispatchCalls.length, 0);

    state.user = { id: 7, email: 'owner@example.com', role: 'owner' };
    state.dispatchCalls.length = 0;
    const coreMissingToken = await callRoute({
      methodId: 'paypal',
      url: 'http://localhost/api/checkout/methods/paypal/cancel'
    });
    assert.equal(coreMissingToken.response.status, 400);
    assert.equal(state.dispatchCalls.length, 0);

    state.checkoutAccess = null;
    state.lookupCalls.length = 0;
    const coreMissingOrder = await callRoute({
      methodId: 'paypal',
      url: 'http://localhost/api/checkout/methods/paypal/cancel?checkoutToken=abc'
    });
    assert.equal(coreMissingOrder.response.status, 404);
    assert.equal(state.lookupCalls.length, 1);

    state.checkoutAccess = {
      checkoutOrder: { id: 101, targetType: 'team' },
      teamRole: 'owner'
    };
    state.dispatchCalls.length = 0;
    const coreOk = await callRoute({
      methodId: 'paypal',
      url: 'http://localhost/api/checkout/methods/paypal/cancel?checkoutToken=abc'
    });
    assert.equal(coreOk.response.status, 200);
    assert.equal(state.dispatchCalls.length, 1);
    assert.equal(state.dispatchCalls[0]?.paymentMethodId, 'paypal');
    assert.equal(state.dispatchCalls[0]?.action, 'cancel');
    assert.equal(state.dispatchCalls[0]?.fallbackCheckoutToken, 'abc');

    state.checkoutAccess = {
      checkoutOrder: { id: 102, targetType: 'team' },
      teamRole: 'member'
    };
    state.dispatchCalls.length = 0;
    const coreTeamNotOwner = await callRoute({
      methodId: 'paypal',
      url: 'http://localhost/api/checkout/methods/paypal/cancel?checkoutToken=abc'
    });
    assert.equal(coreTeamNotOwner.response.status, 403);
    assert.equal(state.dispatchCalls.length, 0);

    state.checkoutAccess = {
      checkoutOrder: { id: 103, targetType: 'user' },
      teamRole: null
    };
    state.dispatchCalls.length = 0;
    const coreUserTargetOk = await callRoute({
      methodId: 'paypal',
      url: 'http://localhost/api/checkout/methods/paypal/cancel?checkoutToken=abc'
    });
    assert.equal(coreUserTargetOk.response.status, 200);
    assert.equal(state.dispatchCalls.length, 1);

    state.user = null;
    state.checkoutAccess = null;
    state.signupIntentAccess = {
      checkoutOrder: { id: 104, targetType: null }
    };
    state.dispatchCalls.length = 0;
    const guestSignupCancelOk = await callRoute({
      methodId: 'paypal',
      url: 'http://localhost/api/checkout/methods/paypal/cancel?checkoutToken=abc'
    });
    assert.equal(guestSignupCancelOk.response.status, 200);
    assert.equal(state.dispatchCalls.length, 1);

    mock.restoreAll();
  });
}
