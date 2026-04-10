import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getSubscriptionSignupPolicyDefinitions,
  isSubscriptionSignupDefaultTemplateCandidate,
  resolveSubscriptionFailureFallbackTemplateIdForTargetType
} from '@/lib/payments/subscription-signup-policy';

test('signup policy definitions expose stable signup policy env keys', () => {
  const definitions = getSubscriptionSignupPolicyDefinitions();

  assert.equal(
    definitions.signupDefaultOrganizationTemplateId.envKey,
    'SIGNUP_DEFAULT_ORGANIZATION_TEMPLATE_ID'
  );
  assert.equal(
    definitions.signupDefaultUserTemplateId.envKey,
    'SIGNUP_DEFAULT_USER_TEMPLATE_ID'
  );
  assert.deepEqual(Object.keys(definitions).sort(), [
    'signupDefaultOrganizationTemplateId',
    'signupDefaultUserTemplateId'
  ]);
});

test('signup default template candidates must be published scope matches', () => {
  assert.equal(
    isSubscriptionSignupDefaultTemplateCandidate(
      {
        id: 15,
        targetScope: 'organization',
        publicationStatus: 'published'
      },
      'organization'
    ),
    true
  );

  assert.equal(
    isSubscriptionSignupDefaultTemplateCandidate(
      {
        id: 2,
        targetScope: 'organization',
        publicationStatus: 'published'
      },
      'organization'
    ),
    true
  );

  assert.equal(
    isSubscriptionSignupDefaultTemplateCandidate(
      {
        id: 18,
        targetScope: 'user',
        publicationStatus: 'draft'
      },
      'user'
    ),
    false
  );

  assert.equal(
    isSubscriptionSignupDefaultTemplateCandidate(
      {
        id: 19,
        targetScope: 'user',
        publicationStatus: 'published'
      },
      'organization'
    ),
    false
  );
});

test('subscription failure fallback resolves the reserved default tier by target type', async () => {
  assert.equal(
    await resolveSubscriptionFailureFallbackTemplateIdForTargetType('user'),
    1
  );
  assert.equal(
    await resolveSubscriptionFailureFallbackTemplateIdForTargetType('team'),
    2
  );
});
