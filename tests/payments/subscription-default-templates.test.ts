import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BASELINE_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID,
  BASELINE_USER_SUBSCRIPTION_TEMPLATE_ID,
  getReservedBaselineSubscriptionTemplateIdForScope,
  isReservedBaselineSubscriptionTemplateId,
  isSubscriptionTemplateSelfServiceEligible,
  isSubscriptionTemplateVisibleInAdminCatalog
} from '../../lib/payments/subscription-default-templates';

test('reserved baseline ids stay fixed per scope', () => {
  assert.equal(BASELINE_USER_SUBSCRIPTION_TEMPLATE_ID, 1);
  assert.equal(BASELINE_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID, 2);
  assert.equal(getReservedBaselineSubscriptionTemplateIdForScope('user'), 1);
  assert.equal(getReservedBaselineSubscriptionTemplateIdForScope('organization'), 2);
});

test('reserved baseline templates are hidden from admin commercial catalogs', () => {
  assert.equal(isReservedBaselineSubscriptionTemplateId(1), true);
  assert.equal(isReservedBaselineSubscriptionTemplateId(2), true);
  assert.equal(isReservedBaselineSubscriptionTemplateId(3), false);
  assert.equal(isSubscriptionTemplateVisibleInAdminCatalog(1), false);
  assert.equal(isSubscriptionTemplateVisibleInAdminCatalog(2), false);
  assert.equal(isSubscriptionTemplateVisibleInAdminCatalog(7), true);
});

test('self-service eligibility rejects reserved baseline templates even if published', () => {
  assert.equal(
    isSubscriptionTemplateSelfServiceEligible({
      id: 1,
      publicationStatus: 'published'
    }),
    false
  );
  assert.equal(
    isSubscriptionTemplateSelfServiceEligible({
      id: 2,
      publicationStatus: 'published'
    }),
    false
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
