import assert from 'node:assert/strict';
import test, { mock } from 'node:test';

type ModuleMockFn = (
  specifier: string,
  options: {
    namedExports?: Record<string, unknown>;
  }
) => void;

type WebhookResult = {
  handled: boolean;
  teamId: number | null;
  subscriptionStatus: string | null;
};

type FetchCall = {
  url: string;
  init: RequestInit | undefined;
};

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
    'paypal webhook route tests require module mocks support',
    { skip: 'Run with --experimental-test-module-mocks' },
    () => {}
  );
} else {
  test('paypal webhook route handles key error and success flows', async () => {
    const state: {
      isConfigured: boolean;
      webhookId: string | null;
      accessToken: string | null;
      apiBaseUrl: string;
      mappedStatus: string;
      handleResult: WebhookResult;
      handleError: Error | null;
      fetchOk: boolean;
      fetchVerificationStatus: 'SUCCESS' | 'FAILURE';
      fetchCalls: FetchCall[];
      paymentLogCalls: Array<Record<string, unknown>>;
      checkoutCalls: Array<Record<string, unknown>>;
      handleCalls: Array<Record<string, unknown>>;
    } = {
      isConfigured: true,
      webhookId: null,
      accessToken: 'access-token',
      apiBaseUrl: 'https://api-m.sandbox.paypal.com',
      mappedStatus: 'pending',
      handleResult: {
        handled: false,
        teamId: null,
        subscriptionStatus: null
      },
      handleError: null,
      fetchOk: true,
      fetchVerificationStatus: 'SUCCESS',
      fetchCalls: [],
      paymentLogCalls: [],
      checkoutCalls: [],
      handleCalls: []
    };

    function resetCalls() {
      state.fetchCalls.length = 0;
      state.paymentLogCalls.length = 0;
      state.checkoutCalls.length = 0;
      state.handleCalls.length = 0;
    }

    function resetScenarioDefaults() {
      state.isConfigured = true;
      state.webhookId = null;
      state.accessToken = 'access-token';
      state.apiBaseUrl = 'https://api-m.sandbox.paypal.com';
      state.mappedStatus = 'pending';
      state.handleResult = {
        handled: false,
        teamId: null,
        subscriptionStatus: null
      };
      state.handleError = null;
      state.fetchOk = true;
      state.fetchVerificationStatus = 'SUCCESS';
      resetCalls();
    }

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input, init) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      state.fetchCalls.push({
        url,
        init
      });

      if (!state.fetchOk) {
        return new Response(
          JSON.stringify({ verification_status: state.fetchVerificationStatus }),
          { status: 500 }
        );
      }

      return new Response(
        JSON.stringify({ verification_status: state.fetchVerificationStatus }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json'
          }
        }
      );
    }) as typeof fetch;

    try {
      applyModuleMock('@/lib/payments/config', {
        namedExports: {
          getPaymentConfigValue: async (configName: string) =>
            configName === 'paypalWebhookId' ? state.webhookId : null
        }
      });

      applyModuleMock('@/lib/payments/logs', {
        namedExports: {
          createPaymentLog: async (payload: Record<string, unknown>) => {
            state.paymentLogCalls.push(payload);
          }
        }
      });

      applyModuleMock('@/lib/payments/orders', {
        namedExports: {
          mapSubscriptionStatusToOrderStatus: () => state.mappedStatus
        }
      });

      applyModuleMock('@/lib/payments/paypal', {
        namedExports: {
          getPayPalAccessToken: async () => state.accessToken,
          getPayPalApiBaseUrl: async () => state.apiBaseUrl,
          handlePayPalWebhookEvent: async (event: Record<string, unknown>) => {
            state.handleCalls.push(event);
            if (state.handleError) {
              throw state.handleError;
            }
            return state.handleResult;
          },
          isPayPalConfigured: async () => state.isConfigured
        }
      });

      applyModuleMock('@/lib/payments/checkout-system', {
        namedExports: {
          recordPayPalCheckoutEvent: async (payload: Record<string, unknown>) => {
            state.checkoutCalls.push(payload);
          }
        }
      });

      const { POST } = await import('../../app/api/paypal/webhook/route');

      async function callRoute({
        payload,
        rawBody,
        headers = {}
      }: {
        payload?: unknown;
        rawBody?: string;
        headers?: Record<string, string>;
      }) {
        const request = new Request('http://localhost/api/paypal/webhook', {
          method: 'POST',
          headers,
          body: rawBody ?? JSON.stringify(payload ?? {})
        });

        const response = await POST(request as never);
        const body = (await response.json()) as Record<string, unknown>;
        return { response, body };
      }

      resetScenarioDefaults();
      state.isConfigured = false;
      const notConfigured = await callRoute({
        payload: { event_type: 'BILLING.SUBSCRIPTION.ACTIVATED' }
      });
      assert.equal(notConfigured.response.status, 503);
      assert.equal(notConfigured.body.error, 'PayPal is not configured.');
      assert.equal(state.paymentLogCalls.length, 0);
      assert.equal(state.checkoutCalls.length, 0);
      assert.equal(state.handleCalls.length, 0);

      resetScenarioDefaults();
      const invalidJson = await callRoute({
        rawBody: '{"event_type":"BILLING.SUBSCRIPTION.ACTIVATED"'
      });
      assert.equal(invalidJson.response.status, 400);
      assert.equal(invalidJson.body.error, 'Invalid payload.');
      assert.equal(state.paymentLogCalls.length, 1);
      assert.equal(state.paymentLogCalls[0]?.eventType, 'webhook.invalid_payload');
      assert.equal(state.checkoutCalls.length, 0);
      assert.equal(state.handleCalls.length, 0);

      resetScenarioDefaults();
      state.webhookId = 'WH-TEST-ID';
      state.fetchVerificationStatus = 'FAILURE';
      const invalidSignature = await callRoute({
        payload: {
          event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
          resource: {
            id: 'I-SUB-1',
            plan_id: 'P-PLAN-1'
          }
        },
        headers: {
          'paypal-auth-algo': 'SHA256withRSA',
          'paypal-cert-url': 'https://api-m.sandbox.paypal.com/certs/test',
          'paypal-transmission-id': 'WH-TRANS-1',
          'paypal-transmission-sig': 'signature-1',
          'paypal-transmission-time': '2026-02-04T00:00:00Z'
        }
      });
      assert.equal(invalidSignature.response.status, 400);
      assert.equal(
        invalidSignature.body.error,
        'Invalid PayPal webhook signature.'
      );
      assert.equal(state.fetchCalls.length, 1);
      assert.equal(
        state.fetchCalls[0]?.url,
        'https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature'
      );
      const signatureBody = JSON.parse(
        String(state.fetchCalls[0]?.init?.body || '{}')
      ) as Record<string, unknown>;
      assert.equal(signatureBody.webhook_id, 'WH-TEST-ID');
      assert.equal(signatureBody.transmission_id, 'WH-TRANS-1');
      assert.equal(state.paymentLogCalls.length, 1);
      assert.equal(
        state.paymentLogCalls[0]?.message,
        'Invalid PayPal webhook signature.'
      );
      assert.equal(state.handleCalls.length, 0);
      assert.equal(state.checkoutCalls.length, 0);

      resetScenarioDefaults();
      state.handleResult = {
        handled: true,
        teamId: 42,
        subscriptionStatus: 'active'
      };
      state.mappedStatus = 'received';
      const processed = await callRoute({
        payload: {
          event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
          resource: {
            id: 'I-SUB-2',
            plan_id: 'P-PLAN-2'
          }
        },
        headers: {
          'paypal-transmission-id': 'WH-TRANS-2'
        }
      });
      assert.equal(processed.response.status, 200);
      assert.equal(processed.body.received, true);
      assert.equal(state.handleCalls.length, 1);
      assert.equal(state.checkoutCalls.length, 1);
      assert.equal(state.paymentLogCalls.length, 0);

      const successCheckout = state.checkoutCalls[0];
      assert.equal(successCheckout?.status, 'received');
      assert.equal(successCheckout?.logStatus, 'success');
      assert.equal(
        successCheckout?.eventType,
        'BILLING.SUBSCRIPTION.ACTIVATED'
      );
      assert.equal(successCheckout?.source, 'webhook');
      assert.equal(successCheckout?.teamId, 42);
      assert.equal(successCheckout?.providerPlanId, 'P-PLAN-2');
      assert.equal(successCheckout?.externalPaymentId, 'I-SUB-2');
      assert.equal(
        successCheckout?.message,
        'PayPal webhook event processed.'
      );
      assert.deepEqual(successCheckout?.metadata, {
        subscriptionStatus: 'active'
      });
      assert.deepEqual(successCheckout?.providerMetadata, {
        subscriptionId: 'I-SUB-2',
        planId: 'P-PLAN-2',
        webhookEventId: 'WH-TRANS-2'
      });

      resetScenarioDefaults();
      state.handleError = new Error('boom');
      const consoleErrorMock = mock.method(console, 'error', () => {});
      const failed = await callRoute({
        payload: {
          event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
          resource: {
            id: 'I-SUB-3'
          }
        },
        headers: {
          'paypal-transmission-id': 'WH-TRANS-3'
        }
      });
      assert.equal(failed.response.status, 500);
      assert.equal(failed.body.error, 'Webhook handling failed.');
      assert.equal(state.checkoutCalls.length, 1);
      assert.equal(state.checkoutCalls[0]?.status, 'failed');
      assert.equal(state.checkoutCalls[0]?.logStatus, 'failed');
      assert.equal(state.checkoutCalls[0]?.eventType, 'BILLING.SUBSCRIPTION.CANCELLED');
      assert.equal(consoleErrorMock.mock.calls.length, 1);
      assert.equal(
        state.checkoutCalls[0]?.message,
        'Error handling PayPal webhook event.'
      );
      assert.deepEqual(state.checkoutCalls[0]?.providerMetadata, {
        subscriptionId: 'I-SUB-3',
        webhookEventId: 'WH-TRANS-3'
      });
    } finally {
      globalThis.fetch = originalFetch;
      mock.restoreAll();
    }
  });
}
