import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolvePayPalCheckoutTargetFromCustomId,
  resolvePayPalOneTimeOrderState,
  resolvePayPalOneTimeWebhookDetails,
  type PayPalWebhookEvent
} from '../../lib/payments/paypal';

test('resolvePayPalCheckoutTargetFromCustomId parses user and team targets', () => {
  assert.deepEqual(resolvePayPalCheckoutTargetFromCustomId('user:15'), {
    targetType: 'user',
    targetTeamId: null,
    targetUserId: 15
  });

  assert.deepEqual(resolvePayPalCheckoutTargetFromCustomId('team:22'), {
    targetType: 'team',
    targetTeamId: 22,
    targetUserId: null
  });

  assert.deepEqual(resolvePayPalCheckoutTargetFromCustomId('31'), {
    targetType: 'team',
    targetTeamId: 31,
    targetUserId: null
  });

  assert.deepEqual(resolvePayPalCheckoutTargetFromCustomId('invalid'), {
    targetType: null,
    targetTeamId: null,
    targetUserId: null
  });
});

test('resolvePayPalOneTimeWebhookDetails extracts completed capture payload details', () => {
  const event: PayPalWebhookEvent = {
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
    resource: {
      id: 'CAPTURE-123',
      amount: {
        value: '49.99',
        currency_code: 'USD'
      },
      custom_id: 'user:9',
      supplementary_data: {
        related_ids: {
          order_id: 'ORDER-456'
        }
      }
    }
  };

  assert.deepEqual(resolvePayPalOneTimeWebhookDetails(event), {
    eventType: 'PAYMENT.CAPTURE.COMPLETED',
    orderId: 'ORDER-456',
    captureId: 'CAPTURE-123',
    status: 'received',
    logStatus: 'success',
    amount: 4999,
    currency: 'USD',
    customId: 'user:9'
  });
});

test('resolvePayPalOneTimeWebhookDetails extracts pending and denied capture payload details', () => {
  const pendingEvent: PayPalWebhookEvent = {
    event_type: 'PAYMENT.CAPTURE.PENDING',
    resource: {
      id: 'CAPTURE-PENDING',
      amount: {
        value: '10.00',
        currency_code: 'EUR'
      },
      supplementary_data: {
        related_ids: {
          order_id: 'ORDER-PENDING'
        }
      }
    }
  };

  const deniedEvent: PayPalWebhookEvent = {
    event_type: 'PAYMENT.CAPTURE.DENIED',
    resource: {
      id: 'CAPTURE-DENIED',
      supplementary_data: {
        related_ids: {
          order_id: 'ORDER-DENIED'
        }
      }
    }
  };

  assert.deepEqual(resolvePayPalOneTimeWebhookDetails(pendingEvent), {
    eventType: 'PAYMENT.CAPTURE.PENDING',
    orderId: 'ORDER-PENDING',
    captureId: 'CAPTURE-PENDING',
    status: 'pending',
    logStatus: 'info',
    amount: 1000,
    currency: 'EUR',
    customId: null
  });

  assert.deepEqual(resolvePayPalOneTimeWebhookDetails(deniedEvent), {
    eventType: 'PAYMENT.CAPTURE.DENIED',
    orderId: 'ORDER-DENIED',
    captureId: 'CAPTURE-DENIED',
    status: 'failed',
    logStatus: 'failed',
    amount: null,
    currency: null,
    customId: null
  });
});

test('resolvePayPalOneTimeWebhookDetails ignores unsupported events or missing order ids', () => {
  assert.equal(
    resolvePayPalOneTimeWebhookDetails({
      event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
      resource: {
        id: 'I-SUB-1'
      }
    }),
    null
  );

  assert.equal(
    resolvePayPalOneTimeWebhookDetails({
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: {
        id: 'CAPTURE-123'
      }
    }),
    null
  );
});

test('resolvePayPalOneTimeOrderState extracts capture-backed and approved order states', () => {
  assert.deepEqual(
    resolvePayPalOneTimeOrderState({
      payload: {
        id: 'ORDER-COMPLETED',
        status: 'COMPLETED',
        payer: {
          payer_id: 'PAYER-1'
        },
        purchase_units: [
          {
            custom_id: 'team:4',
            amount: {
              value: '29.00',
              currency_code: 'USD'
            },
            payments: {
              captures: [
                {
                  id: 'CAPTURE-1',
                  status: 'COMPLETED',
                  amount: {
                    value: '29.00',
                    currency_code: 'USD'
                  }
                }
              ]
            }
          }
        ]
      }
    }),
    {
      orderId: 'ORDER-COMPLETED',
      orderStatus: 'COMPLETED',
      captureId: 'CAPTURE-1',
      captureStatus: 'COMPLETED',
      effectiveStatus: 'COMPLETED',
      amount: 2900,
      currency: 'USD',
      payerId: 'PAYER-1',
      customId: 'team:4'
    }
  );

  assert.deepEqual(
    resolvePayPalOneTimeOrderState({
      payload: {
        id: 'ORDER-APPROVED',
        status: 'APPROVED',
        purchase_units: [
          {
            custom_id: 'user:7',
            amount: {
              value: '12.50',
              currency_code: 'EUR'
            }
          }
        ]
      }
    }),
    {
      orderId: 'ORDER-APPROVED',
      orderStatus: 'APPROVED',
      captureId: null,
      captureStatus: null,
      effectiveStatus: 'APPROVED',
      amount: 1250,
      currency: 'EUR',
      payerId: null,
      customId: 'user:7'
    }
  );
});
