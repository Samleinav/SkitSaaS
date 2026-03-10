import { NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { getCheckoutOrderByTokenForUser } from '@/lib/payments/checkout-orders';
import {
  getCheckoutPaymentMethodRegistry,
  supportsCheckoutPaymentMethodOrderType
} from '@/lib/payments/payment-methods';
import { getPayPalClientId, isPayPalConfigured } from '@/lib/payments/paypal';
import { isStripeConfigured } from '@/lib/payments/stripe';
import { CoreApiRoutes } from '@/core/api-routes';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';

export const GET = withApiRouteEntries(
  CoreApiRoutes.checkout.methods.handler(async (request: Request) => {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }

    const searchParams = new URL(request.url).searchParams;
    const checkoutToken = searchParams.get('checkoutToken')?.trim();
    const checkoutAccess = checkoutToken
      ? await getCheckoutOrderByTokenForUser({
          checkoutToken,
          userId: user.id
        })
      : null;
    const checkoutOrder = checkoutAccess?.checkoutOrder ?? null;

    if (checkoutToken && !checkoutOrder) {
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
