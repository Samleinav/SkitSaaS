import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getSubscriptionSignupPolicyDefinitions,
  isSubscriptionPublicFreeFallbackTemplateCandidate,
  isSubscriptionSignupDefaultTemplateCandidate,
  normalizeSubscriptionFailureFallbackMode
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
  assert.equal(
    definitions.publicFreeOrganizationTemplateId.envKey,
    'SIGNUP_PUBLIC_FREE_ORGANIZATION_TEMPLATE_ID'
  );
  assert.equal(
    definitions.publicFreeUserTemplateId.envKey,
    'SIGNUP_PUBLIC_FREE_USER_TEMPLATE_ID'
  );
  assert.equal(
    definitions.subscriptionFailureFallbackMode.envKey,
    'SIGNUP_FAILURE_FALLBACK_MODE'
  );
});

test('signup default template candidates must be published non-baseline scope matches', () => {
  assert.equal(
    isSubscriptionSignupDefaultTemplateCandidate(
      {
        id: 15,
        targetScope: 'organization',
        publicationStatus: 'published',
        priceCents: 1900
      } as never,
      'organization'
    ),
    true
  );

  assert.equal(
    isSubscriptionSignupDefaultTemplateCandidate(
      {
        id: 2,
        targetScope: 'organization',
        publicationStatus: 'published',
        priceCents: 0
      } as never,
      'organization'
    ),
    false
  );

  assert.equal(
    isSubscriptionSignupDefaultTemplateCandidate(
      {
        id: 18,
        targetScope: 'user',
        publicationStatus: 'draft',
        priceCents: 0
      } as never,
      'user'
    ),
    false
  );

  assert.equal(
    isSubscriptionSignupDefaultTemplateCandidate(
      {
        id: 19,
        targetScope: 'user',
        publicationStatus: 'published',
        priceCents: 0
      } as never,
      'organization'
    ),
    false
  );
});

test('public free fallback candidates must be zero-cost published public templates', () => {
  assert.equal(
    isSubscriptionPublicFreeFallbackTemplateCandidate(
      {
        id: 25,
        targetScope: 'user',
        publicationStatus: 'published',
        priceCents: 0
      } as never,
      'user'
    ),
    true
  );

  assert.equal(
    isSubscriptionPublicFreeFallbackTemplateCandidate(
      {
        id: 26,
        targetScope: 'user',
        publicationStatus: 'published',
        priceCents: 900
      } as never,
      'user'
    ),
    false
  );
});

test('subscription failure fallback mode normalizes to baseline on invalid input', () => {
  assert.equal(normalizeSubscriptionFailureFallbackMode('public_free'), 'public_free');
  assert.equal(normalizeSubscriptionFailureFallbackMode('baseline'), 'baseline');
  assert.equal(normalizeSubscriptionFailureFallbackMode(''), 'baseline');
  assert.equal(normalizeSubscriptionFailureFallbackMode('weird'), 'baseline');
  assert.equal(normalizeSubscriptionFailureFallbackMode(undefined), 'baseline');
});
