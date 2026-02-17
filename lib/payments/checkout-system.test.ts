import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHECKOUT_SYSTEM_EVENTS,
  createCheckoutTemplateSnapshot,
  type CheckoutTemplateSnapshot,
  emitTemplateActiveSubscriptionsUpdateRequestedEvent,
  emitTemplatePricingChangedEvent,
  hasCheckoutTemplatePricingChanged
} from './checkout-system';

function createSnapshot(
  overrides: Partial<CheckoutTemplateSnapshot> = {}
): CheckoutTemplateSnapshot {
  return {
    templateId: 12,
    templateName: 'Starter',
    targetScope: 'organization',
    billingInterval: 'monthly',
    priceCents: 2900,
    compareAtPriceCents: null,
    currency: 'USD',
    trialPeriodDays: 7,
    updatedAt: '2026-02-04T00:00:00.000Z',
    fingerprint: 'abc123def4567890',
    ...overrides
  };
}

test('createCheckoutTemplateSnapshot normalizes currency and nullable compare-at values', () => {
  const snapshot = createCheckoutTemplateSnapshot({
    id: 90,
    name: 'Growth',
    targetScope: 'organization',
    billingInterval: 'monthly',
    priceCents: 4900,
    compareAtPriceCents: null,
    currency: ' usd ',
    trialPeriodDays: 14,
    updatedAt: new Date('2026-02-03T12:00:00.000Z')
  });

  assert.equal(snapshot.templateId, 90);
  assert.equal(snapshot.templateName, 'Growth');
  assert.equal(snapshot.currency, 'USD');
  assert.equal(snapshot.compareAtPriceCents, null);
  assert.equal(snapshot.updatedAt, '2026-02-03T12:00:00.000Z');
  assert.equal(snapshot.fingerprint.length, 16);
});

test('hasCheckoutTemplatePricingChanged compares normalized pricing fields only', () => {
  const previous = {
    billingInterval: 'monthly',
    priceCents: 2900,
    compareAtPriceCents: null,
    currency: 'usd',
    trialPeriodDays: 7
  };

  const semanticallyEqual = {
    billingInterval: 'monthly',
    priceCents: 2900,
    compareAtPriceCents: null,
    currency: 'USD',
    trialPeriodDays: 7
  };

  const changed = {
    billingInterval: 'monthly',
    priceCents: 3900,
    compareAtPriceCents: null,
    currency: 'USD',
    trialPeriodDays: 7
  };

  assert.equal(
    hasCheckoutTemplatePricingChanged(previous, semanticallyEqual),
    false
  );
  assert.equal(hasCheckoutTemplatePricingChanged(previous, changed), true);
});

test('emitTemplatePricingChangedEvent logs, records checkout, and queues both jobs', async () => {
  const previousSnapshot = createSnapshot({
    priceCents: 1900,
    fingerprint: 'old123456789abcd'
  });
  const currentSnapshot = createSnapshot({
    priceCents: 2900,
    fingerprint: 'new123456789abcd'
  });

  const calls: string[] = [];
  const activityCalls: unknown[] = [];
  const checkoutCalls: unknown[] = [];
  const emailQueueCalls: unknown[] = [];
  const manualQueueCalls: unknown[] = [];

  await emitTemplatePricingChangedEvent(
    {
      actorUserId: 55,
      actorEmail: 'owner@test.com',
      actorRole: 'owner',
      source: '/admin/subscriptions/12/edit',
      templateId: 12,
      templateName: 'Starter',
      previousSnapshot,
      currentSnapshot
    },
    {
      createSysActivityLog: async (payload) => {
        calls.push('activity');
        activityCalls.push(payload);
      },
      recordSystemCheckoutEvent: async (payload) => {
        calls.push('checkout');
        checkoutCalls.push(payload);
      },
      queueTemplatePriceChangeNotificationEmails: async (payload) => {
        calls.push('email');
        emailQueueCalls.push(payload);
      },
      queueManualActiveSubscriptionTemplateUpdate: async (payload) => {
        calls.push('manual');
        manualQueueCalls.push(payload);
      }
    }
  );

  assert.deepEqual(calls, ['activity', 'checkout', 'email', 'manual']);
  assert.equal(activityCalls.length, 1);
  assert.equal(checkoutCalls.length, 1);
  assert.equal(emailQueueCalls.length, 1);
  assert.equal(manualQueueCalls.length, 1);

  const activityPayload = activityCalls[0] as Record<string, unknown>;
  assert.equal(
    activityPayload.eventType,
    CHECKOUT_SYSTEM_EVENTS.subscriptionTemplatePricingChanged
  );
  assert.equal(activityPayload.eventCategory, 'admin');
  assert.equal(activityPayload.action, 'update');
  assert.equal(activityPayload.status, 'warning');
  assert.equal(activityPayload.actorUserId, 55);
  assert.equal(activityPayload.actorEmail, 'owner@test.com');
  assert.equal(activityPayload.actorRole, 'owner');
  assert.equal(activityPayload.entityType, 'subscription_template');
  assert.equal(activityPayload.entityId, '12');
  assert.equal(activityPayload.source, '/admin/subscriptions/12/edit');

  const checkoutPayload = checkoutCalls[0] as Record<string, unknown>;
  assert.equal(
    checkoutPayload.eventType,
    CHECKOUT_SYSTEM_EVENTS.subscriptionTemplatePricingChanged
  );
  assert.equal(checkoutPayload.persistOrder, false);
  assert.equal(checkoutPayload.source, 'system');
  assert.equal(checkoutPayload.subscriptionTemplateId, 12);
  assert.equal(checkoutPayload.planName, 'Starter');
  assert.equal(checkoutPayload.amount, 2900);
  assert.equal(checkoutPayload.currency, 'USD');
  assert.deepEqual(checkoutPayload.providerMetadata, {
    reason: 'pricing_changed',
    targetScope: 'organization'
  });

  const emailQueuePayload = emailQueueCalls[0] as Record<string, unknown>;
  assert.equal(emailQueuePayload.templateId, 12);
  assert.equal(emailQueuePayload.templateName, 'Starter');
  assert.deepEqual(emailQueuePayload.previousSnapshot, previousSnapshot);
  assert.deepEqual(emailQueuePayload.currentSnapshot, currentSnapshot);

  const manualQueuePayload = manualQueueCalls[0] as Record<string, unknown>;
  assert.equal(manualQueuePayload.templateId, 12);
  assert.equal(manualQueuePayload.templateName, 'Starter');
  assert.deepEqual(manualQueuePayload.templateSnapshot, currentSnapshot);
  assert.equal(manualQueuePayload.reason, 'pricing_changed');
});

test('emitTemplateActiveSubscriptionsUpdateRequestedEvent logs, records checkout, and queues manual update', async () => {
  const templateSnapshot = createSnapshot();
  const calls: string[] = [];
  const activityCalls: unknown[] = [];
  const checkoutCalls: unknown[] = [];
  const manualQueueCalls: unknown[] = [];

  await emitTemplateActiveSubscriptionsUpdateRequestedEvent(
    {
      actorUserId: 99,
      actorEmail: 'admin@test.com',
      actorRole: 'owner',
      source: '/admin/subscriptions/12/edit',
      templateId: 12,
      templateName: 'Starter',
      templateSnapshot,
      reason: 'manual_admin_request'
    },
    {
      createSysActivityLog: async (payload) => {
        calls.push('activity');
        activityCalls.push(payload);
      },
      recordSystemCheckoutEvent: async (payload) => {
        calls.push('checkout');
        checkoutCalls.push(payload);
      },
      queueManualActiveSubscriptionTemplateUpdate: async (payload) => {
        calls.push('manual');
        manualQueueCalls.push(payload);
      }
    }
  );

  assert.deepEqual(calls, ['activity', 'checkout', 'manual']);
  assert.equal(activityCalls.length, 1);
  assert.equal(checkoutCalls.length, 1);
  assert.equal(manualQueueCalls.length, 1);

  const activityPayload = activityCalls[0] as Record<string, unknown>;
  assert.equal(
    activityPayload.eventType,
    CHECKOUT_SYSTEM_EVENTS.subscriptionTemplateActiveUpdateRequested
  );
  assert.equal(activityPayload.eventCategory, 'admin');
  assert.equal(activityPayload.action, 'event');
  assert.equal(activityPayload.status, 'warning');
  assert.equal(activityPayload.actorUserId, 99);
  assert.equal(activityPayload.actorEmail, 'admin@test.com');
  assert.equal(activityPayload.actorRole, 'owner');
  assert.equal(activityPayload.entityType, 'subscription_template');
  assert.equal(activityPayload.entityId, '12');
  assert.equal(activityPayload.source, '/admin/subscriptions/12/edit');

  const checkoutPayload = checkoutCalls[0] as Record<string, unknown>;
  assert.equal(
    checkoutPayload.eventType,
    CHECKOUT_SYSTEM_EVENTS.subscriptionTemplateActiveUpdateRequested
  );
  assert.equal(checkoutPayload.persistOrder, false);
  assert.equal(checkoutPayload.source, 'system');
  assert.equal(checkoutPayload.subscriptionTemplateId, 12);
  assert.equal(checkoutPayload.planName, 'Starter');
  assert.equal(checkoutPayload.amount, 2900);
  assert.equal(checkoutPayload.currency, 'USD');
  assert.deepEqual(checkoutPayload.metadata, {
    reason: 'manual_admin_request'
  });
  assert.deepEqual(checkoutPayload.providerMetadata, {
    reason: 'manual_admin_request',
    targetScope: 'organization'
  });

  const manualQueuePayload = manualQueueCalls[0] as Record<string, unknown>;
  assert.equal(manualQueuePayload.templateId, 12);
  assert.equal(manualQueuePayload.templateName, 'Starter');
  assert.deepEqual(manualQueuePayload.templateSnapshot, templateSnapshot);
  assert.equal(manualQueuePayload.reason, 'manual_admin_request');
});
