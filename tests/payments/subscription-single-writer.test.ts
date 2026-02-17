import assert from 'node:assert/strict';
import test from 'node:test';

import { isSubscriptionMutationBlocked } from '@/lib/payments/subscription-single-writer';

test('single-writer guard blocks legacy mutations', () => {
  assert.equal(
    isSubscriptionMutationBlocked('tests.subscription_single_writer.always_on'),
    true
  );
});
