import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveCheckoutCallbackObservation,
  type ModulePaymentMethodActionResult
} from '../../lib/payments/payment-methods';

function buildActionResult(
  patch: Partial<ModulePaymentMethodActionResult>
): ModulePaymentMethodActionResult {
  return {
    status: 'completed',
    metadata: null,
    ...patch
  };
}

test('resolveCheckoutCallbackObservation marks replay-like callback results explicitly', () => {
  const replayed = resolveCheckoutCallbackObservation({
    action: 'webhook',
    actionResult: buildActionResult({
      status: 'completed',
      metadata: { replayed: true }
    }),
    ownerType: 'core'
  });

  assert.equal(replayed.attemptEventType, 'webhook_replayed');
  assert.equal(replayed.attemptStatus, 'info');
  assert.equal(replayed.telemetryEventType, 'checkout.method.callback.replayed');
  assert.equal(replayed.telemetryStatus, 'info');
  assert.equal(replayed.metadata.callbackOutcome, 'replayed');

  const alreadyCompleted = resolveCheckoutCallbackObservation({
    action: 'return',
    actionResult: buildActionResult({
      status: 'completed',
      metadata: { alreadyCompleted: true }
    }),
    ownerType: 'core'
  });

  assert.equal(alreadyCompleted.attemptEventType, 'return_replayed');
  assert.equal(alreadyCompleted.metadata.callbackOutcome, 'replayed');
});

test('resolveCheckoutCallbackObservation distinguishes provider_pending, ignored, failed, and success', () => {
  const providerPending = resolveCheckoutCallbackObservation({
    action: 'return',
    actionResult: buildActionResult({
      status: 'provider_pending'
    }),
    ownerType: 'module'
  });

  assert.equal(providerPending.attemptEventType, 'return_provider_pending');
  assert.equal(providerPending.telemetryEventType, 'checkout.method.callback.provider_pending');
  assert.equal(providerPending.metadata.callbackOutcome, 'provider_pending');

  const ignored = resolveCheckoutCallbackObservation({
    action: 'webhook',
    actionResult: buildActionResult({
      status: 'ignored'
    }),
    ownerType: 'core'
  });

  assert.equal(ignored.attemptEventType, 'webhook_ignored');
  assert.equal(ignored.metadata.callbackOutcome, 'ignored');

  const failed = resolveCheckoutCallbackObservation({
    action: 'return',
    actionResult: buildActionResult({
      status: 'failed'
    }),
    ownerType: 'module'
  });

  assert.equal(failed.attemptEventType, 'return_failed');
  assert.equal(failed.attemptStatus, 'failed');
  assert.equal(failed.telemetryEventType, 'checkout.method.callback.failed');
  assert.equal(failed.metadata.callbackOutcome, 'failed');

  const succeeded = resolveCheckoutCallbackObservation({
    action: 'cancel',
    actionResult: buildActionResult({
      status: 'completed'
    }),
    ownerType: 'core'
  });

  assert.equal(succeeded.attemptEventType, 'cancel_succeeded');
  assert.equal(succeeded.attemptStatus, 'success');
  assert.equal(succeeded.telemetryEventType, 'checkout.method.callback.succeeded');
  assert.equal(succeeded.metadata.callbackOutcome, 'succeeded');
});
