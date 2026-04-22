export type CoreCheckoutCancelAccess = {
  checkoutOrder: {
    targetType: string | null;
  };
  teamRole: string | null;
} | null;

export type CoreSignupIntentCancelAccess = {
  checkoutOrder: {
    targetType: string | null;
  };
} | null;

export function resolveCoreCheckoutCancelAccess({
  user,
  checkoutAccess,
  signupIntentAccess
}: {
  user: { id: number } | null;
  checkoutAccess: CoreCheckoutCancelAccess;
  signupIntentAccess: CoreSignupIntentCancelAccess;
}) {
  if (!checkoutAccess && !signupIntentAccess) {
    if (!user) {
      return {
        ok: false as const,
        statusCode: 401,
        error: 'Authentication required.',
        redirectUrl: '/login?redirect=pricing'
      };
    }

    return {
      ok: false as const,
      statusCode: 404,
      error: 'Checkout order not found.'
    };
  }

  if (
    checkoutAccess?.checkoutOrder.targetType === 'team' &&
    checkoutAccess.teamRole !== 'owner'
  ) {
    return {
      ok: false as const,
      statusCode: 403,
      error: 'Only owners can manage team checkout.'
    };
  }

  return {
    ok: true as const
  };
}
