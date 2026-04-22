import assert from 'node:assert/strict';
import test from 'node:test';
import { buildModulePaymentMethodDispatchRequests } from '../../lib/payments/payment-methods';

test('buildModulePaymentMethodDispatchRequests adds a raw GET fallback for module return callbacks', async () => {
  const dispatchRequests = buildModulePaymentMethodDispatchRequests({
    moduleId: 'mod.pay.wallet',
    path: '/payments/walletx/return',
    action: 'return',
    request: new Request(
      'http://localhost/api/checkout/methods/walletx/return?checkoutToken=tok_walletx&session_id=sess_123'
    ),
    payload: {
      action: 'return',
      paymentMethodId: 'walletx',
      query: {
        checkoutToken: 'tok_walletx',
        session_id: 'sess_123'
      },
      rawBody: null,
      fallbackCheckoutToken: 'tok_walletx'
    }
  });

  assert.equal(dispatchRequests.length, 2);
  assert.equal(dispatchRequests[0]?.dispatchFormat, 'normalized-json');
  assert.equal(dispatchRequests[0]?.slug.join('/'), 'payments/walletx/return');
  assert.equal(dispatchRequests[0]?.request.method, 'POST');
  assert.equal(
    new URL(dispatchRequests[0]!.request.url).pathname,
    '/api/modules/mod.pay.wallet/payments/walletx/return'
  );
  assert.equal(
    dispatchRequests[0]?.request.headers.get('x-checkout-method-dispatch-format'),
    'normalized-json'
  );
  assert.equal(
    dispatchRequests[0]?.request.headers.get('content-type'),
    'application/json'
  );

  const normalizedPayload = JSON.parse(
    (await dispatchRequests[0]!.request.text()) || '{}'
  ) as Record<string, unknown>;
  assert.equal(normalizedPayload.action, 'return');
  assert.equal(normalizedPayload.fallbackCheckoutToken, 'tok_walletx');

  assert.equal(dispatchRequests[1]?.dispatchFormat, 'raw-request');
  assert.equal(dispatchRequests[1]?.request.method, 'GET');
  assert.equal(
    new URL(dispatchRequests[1]!.request.url).pathname,
    '/api/modules/mod.pay.wallet/payments/walletx/return'
  );
  assert.equal(
    new URL(dispatchRequests[1]!.request.url).search,
    '?checkoutToken=tok_walletx&session_id=sess_123'
  );
  assert.equal(
    dispatchRequests[1]?.request.headers.get('x-checkout-method-dispatch-format'),
    'raw-request'
  );
});

test('buildModulePaymentMethodDispatchRequests keeps start actions on the normalized POST bridge only', () => {
  const dispatchRequests = buildModulePaymentMethodDispatchRequests({
    moduleId: 'mod.pay.wallet',
    path: '/payments/walletx/start',
    action: 'start',
    request: new Request('http://localhost/api/checkout/tok_walletx/pay/walletx', {
      method: 'POST'
    }),
    payload: {
      action: 'start',
      paymentMethodId: 'walletx',
      checkoutOrder: {
        id: 11,
        checkoutToken: 'tok_walletx'
      }
    }
  });

  assert.equal(dispatchRequests.length, 1);
  assert.equal(dispatchRequests[0]?.dispatchFormat, 'normalized-json');
  assert.equal(dispatchRequests[0]?.request.method, 'POST');
  assert.equal(
    new URL(dispatchRequests[0]!.request.url).pathname,
    '/api/modules/mod.pay.wallet/payments/walletx/start'
  );
});
