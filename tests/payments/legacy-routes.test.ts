import assert from 'node:assert/strict';
import test from 'node:test';
import { isLegacyCheckoutBridgeRequest } from '../../lib/payments/legacy-routes';

test('isLegacyCheckoutBridgeRequest detects dispatcher bridge headers', () => {
  const bridgeRequest = new Request('https://example.com/api/paypal/checkout', {
    method: 'POST',
    headers: {
      'x-checkout-legacy-bridge': '1'
    }
  });
  const directRequest = new Request('https://example.com/api/paypal/checkout', {
    method: 'POST'
  });

  assert.equal(isLegacyCheckoutBridgeRequest(bridgeRequest), true);
  assert.equal(isLegacyCheckoutBridgeRequest(directRequest), false);
});
