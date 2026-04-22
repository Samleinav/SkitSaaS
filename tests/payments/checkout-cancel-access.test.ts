import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveCoreCheckoutCancelAccess } from '../../lib/payments/checkout-cancel-access';

test('resolveCoreCheckoutCancelAccess requires auth or signup-intent access', () => {
  const guestDenied = resolveCoreCheckoutCancelAccess({
    user: null,
    checkoutAccess: null,
    signupIntentAccess: null
  });

  assert.equal(guestDenied.ok, false);
  if (guestDenied.ok) {
    return;
  }

  assert.equal(guestDenied.statusCode, 401);
  assert.equal(guestDenied.error, 'Authentication required.');
  assert.equal(guestDenied.redirectUrl, '/login?redirect=pricing');
});

test('resolveCoreCheckoutCancelAccess rejects authenticated users without checkout access', () => {
  const missingOrder = resolveCoreCheckoutCancelAccess({
    user: { id: 7 },
    checkoutAccess: null,
    signupIntentAccess: null
  });

  assert.equal(missingOrder.ok, false);
  if (missingOrder.ok) {
    return;
  }

  assert.equal(missingOrder.statusCode, 404);
  assert.equal(missingOrder.error, 'Checkout order not found.');
});

test('resolveCoreCheckoutCancelAccess enforces team ownership for team checkout', () => {
  const teamMemberDenied = resolveCoreCheckoutCancelAccess({
    user: { id: 7 },
    checkoutAccess: {
      checkoutOrder: {
        targetType: 'team'
      },
      teamRole: 'member'
    },
    signupIntentAccess: null
  });

  assert.equal(teamMemberDenied.ok, false);
  if (teamMemberDenied.ok) {
    return;
  }

  assert.equal(teamMemberDenied.statusCode, 403);
  assert.equal(teamMemberDenied.error, 'Only owners can manage team checkout.');
});

test('resolveCoreCheckoutCancelAccess allows user-scope and signup-intent cancel access', () => {
  const userScope = resolveCoreCheckoutCancelAccess({
    user: { id: 7 },
    checkoutAccess: {
      checkoutOrder: {
        targetType: 'user'
      },
      teamRole: null
    },
    signupIntentAccess: null
  });
  assert.equal(userScope.ok, true);

  const signupIntentGuest = resolveCoreCheckoutCancelAccess({
    user: null,
    checkoutAccess: null,
    signupIntentAccess: {
      checkoutOrder: {
        targetType: null
      }
    }
  });
  assert.equal(signupIntentGuest.ok, true);
});
