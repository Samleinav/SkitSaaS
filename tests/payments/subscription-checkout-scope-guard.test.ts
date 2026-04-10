import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterSelfServiceSubscriptionTemplates,
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

test('self-service checkout supports organization templates when teams are enabled', () => {
  assert.equal(
    supportsSelfServiceSubscriptionTemplateScope('organization', {
      teamsEnabled: true
    }),
    true
  );
  assert.equal(
    supportsSelfServiceSubscriptionTemplateScope('user', {
      teamsEnabled: true
    }),
    false
  );
  assert.equal(
    supportsSelfServiceSubscriptionTemplateScope('invalid', {
      teamsEnabled: true
    }),
    false
  );
});

test('self-service checkout supports user templates when teams are disabled', () => {
  assert.equal(
    supportsSelfServiceSubscriptionTemplateScope('organization', {
      teamsEnabled: false
    }),
    false
  );
  assert.equal(
    supportsSelfServiceSubscriptionTemplateScope('user', {
      teamsEnabled: false
    }),
    true
  );
});

test('filterSelfServiceSubscriptionTemplates keeps only self-service eligible scopes', () => {
  const templates = [
    { id: 1, targetScope: 'organization' },
    { id: 2, targetScope: 'user' },
    { id: 3, targetScope: 'organization' }
  ];

  assert.deepEqual(
    filterSelfServiceSubscriptionTemplates(templates, { teamsEnabled: true }),
    [
      { id: 1, targetScope: 'organization' },
      { id: 3, targetScope: 'organization' }
    ]
  );
  assert.deepEqual(
    filterSelfServiceSubscriptionTemplates(templates, { teamsEnabled: false }),
    [{ id: 2, targetScope: 'user' }]
  );
});
