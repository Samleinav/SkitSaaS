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
    'checkout pay route tests require module mocks support',
    { skip: 'Run with --experimental-test-module-mocks' },
    () => {}
  );
} else {
  test('checkout pay route supports user and team targets', async () => {
    const state: {
      user: { id: number; email: string; role: string } | null;
      checkoutAccess:
        | {
            checkoutOrder: {
              id: number;
              checkoutToken: string;
              orderType: string;
              status: string;
              targetType: string;
              teamId: number | null;
              targetTeamId: number | null;
              targetUserId: number | null;
            };
            teamRole: string | null;
          }
        | null;
      teamById: {
        id: number;
        name: string;
        stripeCustomerId: string | null;
        stripeProductId: string | null;
      } | null;
      startResult:
        | { ok: true; status: string; paymentMethodId: string; redirectUrl: string | null }
        | { ok: false; statusCode: number; error: string };
      startCalls: Array<Record<string, unknown>>;
    } = {
      user: null,
      checkoutAccess: null,
      teamById: null,
      startResult: {
        ok: true,
        status: 'provider_pending',
        paymentMethodId: 'onetime-stripe',
        redirectUrl: 'https://checkout.example.test/session/1'
      },
      startCalls: []
    };

    applyModuleMock('@/lib/db/queries', {
      namedExports: {
        getUser: async () => state.user,
        getTeamById: async () => state.teamById
      }
    });

    applyModuleMock('@/lib/payments/checkout-orders', {
      namedExports: {
        getCheckoutOrderByTokenForUser: async () => state.checkoutAccess
      }
    });

    applyModuleMock('@/lib/payments/payment-methods', {
      namedExports: {
        startCheckoutPaymentByMethod: async (payload: Record<string, unknown>) => {
          state.startCalls.push(payload);
          return state.startResult;
        }
      }
    });

    const { POST } = await import(
      '../../app/api/checkout/[checkoutToken]/pay/[paymentMethodId]/route'
    );

    async function callRoute() {
      const request = new Request(
        'http://localhost/api/checkout/tok_123/pay/onetime-stripe',
        {
          method: 'POST'
        }
      );
      const response = await POST(request as never, {
        params: { checkoutToken: 'tok_123', paymentMethodId: 'onetime-stripe' }
      } as never);
      const body = (await response.json()) as Record<string, unknown>;
      return { response, body };
    }

    state.user = null;
    let response = await callRoute();
    assert.equal(response.response.status, 401);

    state.user = { id: 7, email: 'member@example.com', role: 'member' };
    state.checkoutAccess = null;
    response = await callRoute();
    assert.equal(response.response.status, 404);

    state.checkoutAccess = {
      checkoutOrder: {
        id: 201,
        checkoutToken: 'tok_123',
        orderType: 'one_time',
        status: 'ready',
        targetType: 'team',
        teamId: 9,
        targetTeamId: 9,
        targetUserId: null
      },
      teamRole: 'member'
    };
    response = await callRoute();
    assert.equal(response.response.status, 403);

    state.checkoutAccess = {
      checkoutOrder: {
        id: 202,
        checkoutToken: 'tok_123',
        orderType: 'one_time',
        status: 'ready',
        targetType: 'team',
        teamId: 9,
        targetTeamId: 9,
        targetUserId: null
      },
      teamRole: 'owner'
    };
    state.teamById = null;
    response = await callRoute();
    assert.equal(response.response.status, 404);

    state.teamById = {
      id: 9,
      name: 'Core Team',
      stripeCustomerId: 'cus_123',
      stripeProductId: 'prod_123'
    };
    state.startCalls.length = 0;
    response = await callRoute();
    assert.equal(response.response.status, 200);
    assert.equal(state.startCalls.length, 1);
    assert.equal((state.startCalls[0]?.team as Record<string, unknown>)?.id, 9);

    state.checkoutAccess = {
      checkoutOrder: {
        id: 203,
        checkoutToken: 'tok_123',
        orderType: 'one_time',
        status: 'ready',
        targetType: 'user',
        teamId: null,
        targetTeamId: null,
        targetUserId: 7
      },
      teamRole: null
    };
    state.startCalls.length = 0;
    response = await callRoute();
    assert.equal(response.response.status, 200);
    assert.equal(state.startCalls.length, 1);
    assert.equal(state.startCalls[0]?.team, null);

    mock.restoreAll();
  });
}

