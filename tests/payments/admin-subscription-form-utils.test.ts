import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADMIN_TEAM_SUBSCRIPTION_STATUSES,
  buildAdminTeamSubscriptionUpdate,
  normalizeAdminTeamSubscriptionProvider,
  normalizeAdminTeamSubscriptionStatus,
  resolveAdminTeamPlanName
} from '../../app/(dashboard)/admin/subscriptions/form-utils';

test('normalizeAdminTeamSubscriptionStatus accepts only allowed statuses', () => {
  for (const status of ADMIN_TEAM_SUBSCRIPTION_STATUSES) {
    assert.equal(normalizeAdminTeamSubscriptionStatus(status), status);
  }

  assert.equal(normalizeAdminTeamSubscriptionStatus('unknown'), 'free');
});

test('normalizeAdminTeamSubscriptionProvider accepts known providers only', () => {
  assert.equal(normalizeAdminTeamSubscriptionProvider('stripe'), 'stripe');
  assert.equal(normalizeAdminTeamSubscriptionProvider('paypal'), 'paypal');
  assert.equal(normalizeAdminTeamSubscriptionProvider('manual'), null);
});

test('buildAdminTeamSubscriptionUpdate keeps selected status without provider', () => {
  const payload = buildAdminTeamSubscriptionUpdate({
    paymentProviderInput: '',
    subscriptionStatusInput: 'trialing',
    template: {
      id: 7,
      name: 'Growth'
    },
    currentPlanName: 'Legacy'
  });

  assert.equal(payload.paymentProvider, null);
  assert.equal(payload.subscriptionStatus, 'trialing');
  assert.equal(payload.subscriptionTemplateId, 7);
  assert.equal(payload.planName, 'Growth');
});

test('resolveAdminTeamPlanName falls back to Free when needed', () => {
  assert.equal(
    resolveAdminTeamPlanName({
      templateName: null,
      currentPlanName: null,
      status: 'free'
    }),
    'Free'
  );

  assert.equal(
    resolveAdminTeamPlanName({
      templateName: null,
      currentPlanName: 'Legacy Plus',
      status: 'active'
    }),
    'Legacy Plus'
  );
});
