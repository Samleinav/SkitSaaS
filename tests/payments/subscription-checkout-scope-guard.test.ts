import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isSubscriptionTemplateScopeCompatible,
  supportsSelfServiceSubscriptionTemplateScope
} from '../../lib/payments/subscription-scope';

test('team checkout accepts organization templates only', () => {
  assert.equal(
    isSubscriptionTemplateScopeCompatible({
      checkoutTargetType: 'team',
      templateTargetScope: 'organization'
    }),
    true
  );

  assert.equal(
    isSubscriptionTemplateScopeCompatible({
      checkoutTargetType: 'team',
      templateTargetScope: 'user'
    }),
    false
  );
});

test('user checkout accepts user templates only', () => {
  assert.equal(
    isSubscriptionTemplateScopeCompatible({
      checkoutTargetType: 'user',
      templateTargetScope: 'user'
    }),
    true
  );

  assert.equal(
    isSubscriptionTemplateScopeCompatible({
      checkoutTargetType: 'user',
      templateTargetScope: 'organization'
    }),
    false
  );
});

test('invalid target types or scopes are rejected', () => {
  assert.equal(
    isSubscriptionTemplateScopeCompatible({
      checkoutTargetType: 'unknown',
      templateTargetScope: 'organization'
    }),
    false
  );

  assert.equal(
    isSubscriptionTemplateScopeCompatible({
      checkoutTargetType: 'team',
      templateTargetScope: 'invalid'
    }),
    false
  );
});

test('self-service checkout supports organization templates only', () => {
  assert.equal(supportsSelfServiceSubscriptionTemplateScope('organization'), true);
  assert.equal(supportsSelfServiceSubscriptionTemplateScope('user'), false);
  assert.equal(supportsSelfServiceSubscriptionTemplateScope('invalid'), false);
});
