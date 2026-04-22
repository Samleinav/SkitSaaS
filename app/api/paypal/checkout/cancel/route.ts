import { NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { getCheckoutOrderByTokenForUser } from '@/lib/payments/checkout-orders';
import { resolveCoreCheckoutCancelAccess } from '@/lib/payments/checkout-cancel-access';
import { logLegacyCheckoutRouteUsage } from '@/lib/payments/legacy-routes';
import { executeCheckoutPaymentMethodAction } from '@/lib/payments/payment-methods';
import { getSignupIntentCheckoutAccessByToken } from '@/lib/payments/signup-intents';
import { CoreApiRoutes } from '@/core/api-routes';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';

type CancelCheckoutRequestBody = {
  checkoutToken?: unknown;
};

export const POST = withApiRouteEntries(
  CoreApiRoutes.paypal.cancel.handler(async (request: Request) => {
    await logLegacyCheckoutRouteUsage({
      request,
      routePath: '/api/paypal/checkout/cancel',
      replacementPath: '/api/checkout/methods/paypal/cancel',
      provider: 'paypal',
      source: '/api/paypal/checkout/cancel'
    });

    const user = await getUser();
    const body = (await request.json().catch(() => ({}))) as CancelCheckoutRequestBody;
    const checkoutToken =
      typeof body.checkoutToken === 'string' ? body.checkoutToken.trim() : '';

    if (!checkoutToken) {
      return NextResponse.json(
        { error: 'checkoutToken is required.' },
        { status: 400 }
      );
    }

    const checkoutAccess = user
      ? await getCheckoutOrderByTokenForUser({
          checkoutToken,
          userId: user.id
        })
      : null;
    const signupIntentAccess =
      !checkoutAccess
        ? await getSignupIntentCheckoutAccessByToken(checkoutToken)
        : null;
    const accessResult = resolveCoreCheckoutCancelAccess({
      user,
      checkoutAccess,
      signupIntentAccess
    });
    if (!accessResult.ok) {
      return NextResponse.json(
        {
          error: accessResult.error,
          redirectUrl: accessResult.redirectUrl ?? undefined
        },
        { status: accessResult.statusCode }
      );
    }

    const dispatchResult = await executeCheckoutPaymentMethodAction({
      paymentMethodId: 'paypal',
      action: 'cancel',
      request,
      fallbackCheckoutToken: checkoutToken,
      source: 'checkout'
    });
    if (!dispatchResult.ok) {
      return NextResponse.json(
        { error: dispatchResult.error },
        { status: dispatchResult.statusCode }
      );
    }

    return NextResponse.json({ ok: true });
  })
);
