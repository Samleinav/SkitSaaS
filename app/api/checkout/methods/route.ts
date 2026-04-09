import { NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import {
  getCheckoutOrderByTokenForUser,
  resolveCheckoutOrderEffectiveTargetType
} from '@/lib/payments/checkout-orders';
import {
  getCheckoutPaymentMethodRegistry,
  supportsCheckoutPaymentMethodOrderType,
  supportsCheckoutPaymentMethodTargetType
} from '@/lib/payments/payment-methods';
import { getPayPalClientId, isPayPalConfigured } from '@/lib/payments/paypal';
import { getSignupIntentCheckoutAccessByToken } from '@/lib/payments/signup-intents';
import { isStripeConfigured } from '@/lib/payments/stripe';
import { CoreApiRoutes } from '@/core/api-routes';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';

export const GET = withApiRouteEntries(
  CoreApiRoutes.checkout.methods.handler(async (request: Request) => {
    const user = await getUser();
    const searchParams = new URL(request.url).searchParams;
    const checkoutToken = searchParams.get('checkoutToken')?.trim();
    if (!user && !checkoutToken) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }

    const checkoutAccess = checkoutToken && user
      ? await getCheckoutOrderByTokenForUser({
          checkoutToken,
          userId: user.id
        })
      : null;
    const signupIntentAccess =
      checkoutToken && !checkoutAccess
        ? await getSignupIntentCheckoutAccessByToken(checkoutToken)
      : null;
    const checkoutOrder =
      checkoutAccess?.checkoutOrder ?? signupIntentAccess?.checkoutOrder ?? null;

    if (checkoutToken && !checkoutOrder) {
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required.' },
          { status: 401 }
        );
      }

      return NextResponse.json({ error: 'Checkout order not found.' }, { status: 404 });
    }

    if (checkoutOrder?.targetType === 'team' && checkoutAccess?.teamRole !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can access team checkout methods.' },
        { status: 403 }
      );
    }

    const [registry, stripeEnabled, payPalEnabled, payPalClientId] =
      await Promise.all([
        getCheckoutPaymentMethodRegistry(),
        isStripeConfigured(),
        isPayPalConfigured(),
        getPayPalClientId()
      ]);

    const methods = registry.methods
      .filter((method) =>
        checkoutOrder
          ? supportsCheckoutPaymentMethodOrderType(method, checkoutOrder.orderType)
          : true
      )
      .filter((method) =>
        checkoutOrder
          ? supportsCheckoutPaymentMethodTargetType(
              method,
              resolveCheckoutOrderEffectiveTargetType(checkoutOrder)
            )
          : true
      )
      .filter((method) =>
        signupIntentAccess ? method.ownerType === 'core' : true
      )
      .filter((method) => {
        if (method.ownerType !== 'core') {
          return true;
        }

        if (method.paymentMethodId === 'stripe') {
          return stripeEnabled;
        }

        if (method.paymentMethodId === 'paypal') {
          return payPalEnabled && Boolean(payPalClientId);
        }

        return true;
      });

    return NextResponse.json({
      ok: true,
      checkoutToken: checkoutOrder?.checkoutToken ?? null,
      orderType: checkoutOrder?.orderType ?? null,
      methods,
      issues: registry.issues
    });
  })
);
