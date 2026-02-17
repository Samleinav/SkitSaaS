import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { getCheckoutOrderByTokenForUser } from '@/lib/payments/checkout-orders';
import {
  getCheckoutPaymentMethodRegistry,
  supportsCheckoutPaymentMethodOrderType
} from '@/lib/payments/payment-methods';
import { getPayPalClientId, isPayPalConfigured } from '@/lib/payments/paypal';
import { isStripeConfigured } from '@/lib/payments/stripe';

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 }
    );
  }

  const checkoutToken = request.nextUrl.searchParams.get('checkoutToken')?.trim();
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

  const oneTimeProvider =
    checkoutOrder?.orderType === 'one_time' &&
    typeof checkoutOrder.parsedMetadata?.oneTime?.provider === 'string'
      ? checkoutOrder.parsedMetadata.oneTime.provider.trim().toLowerCase()
      : null;

  const methods = registry.methods
    .filter((method) =>
      checkoutOrder
        ? supportsCheckoutPaymentMethodOrderType(method, checkoutOrder.orderType)
        : true
    )
    .filter((method) => {
      if (!oneTimeProvider || method.ownerType !== 'module') {
        return true;
      }

      const methodProvider =
        method.metadata &&
        typeof method.metadata.provider === 'string'
          ? method.metadata.provider.trim().toLowerCase()
          : null;
      if (!methodProvider) {
        return true;
      }

      return methodProvider === oneTimeProvider;
    })
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
}
