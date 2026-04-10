import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BASELINE_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID,
  BASELINE_USER_SUBSCRIPTION_TEMPLATE_ID,
  getReservedBaselineSubscriptionTemplateIdForScope,
  isReservedBaselineSubscriptionTemplateId,
  resolveDefaultTierFallbackAssignmentStatus,
  isSubscriptionTemplateSelfServiceEligible,
  isSubscriptionTemplateVisibleInAdminCatalog
} from '../../lib/payments/subscription-default-templates';

test('reserved default tier ids stay fixed per scope', () => {
  assert.equal(BASELINE_USER_SUBSCRIPTION_TEMPLATE_ID, 1);
  assert.equal(BASELINE_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID, 2);
  assert.equal(getReservedBaselineSubscriptionTemplateIdForScope('user'), 1);
  assert.equal(getReservedBaselineSubscriptionTemplateIdForScope('organization'), 2);
});

test('reserved default tiers are hidden from admin commercial catalogs', () => {
  assert.equal(isReservedBaselineSubscriptionTemplateId(1), true);
  assert.equal(isReservedBaselineSubscriptionTemplateId(2), true);
  assert.equal(isReservedBaselineSubscriptionTemplateId(3), false);
  assert.equal(isSubscriptionTemplateVisibleInAdminCatalog(1), false);
  assert.equal(isSubscriptionTemplateVisibleInAdminCatalog(2), false);
  assert.equal(isSubscriptionTemplateVisibleInAdminCatalog(7), true);
});

test('self-service eligibility accepts published reserved default tiers', () => {
  assert.equal(
    isSubscriptionTemplateSelfServiceEligible({
      id: 1,
      publicationStatus: 'published'
    }),
    true
  );
  assert.equal(
    isSubscriptionTemplateSelfServiceEligible({
      id: 2,
      publicationStatus: 'published'
    }),
    true
  );
  assert.equal(
    isSubscriptionTemplateSelfServiceEligible({
      id: 9,
      publicationStatus: 'draft'
    }),
    false
  );
  assert.equal(
    isSubscriptionTemplateSelfServiceEligible({
      id: 9,
      publicationStatus: 'published'
    }),
    true
  );
});

test('default tier fallback status follows template price', () => {
  assert.equal(
    resolveDefaultTierFallbackAssignmentStatus({ priceCents: 0 }),
    'free'
  );
  assert.equal(
    resolveDefaultTierFallbackAssignmentStatus({ priceCents: 1900 }),
    'unpaid'
  );
  assert.equal(resolveDefaultTierFallbackAssignmentStatus(null), 'unpaid');
});
