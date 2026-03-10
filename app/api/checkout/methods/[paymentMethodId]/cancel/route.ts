import { NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { getCheckoutOrderByTokenForUser } from '@/lib/payments/checkout-orders';
import {
  executeCheckoutPaymentMethodAction,
  getCheckoutPaymentMethodById
} from '@/lib/payments/payment-methods';
import { CoreApiRoutes } from '@/core/api-routes';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';

function getFallbackCheckoutToken(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const tokenFromQuery =
    searchParams.get('checkoutToken') ||
    searchParams.get('checkout_token');
  if (tokenFromQuery) {
    return tokenFromQuery.trim();
  }

  return null;
}

function resolveRedirectTarget(request: Request, redirectUrl: string) {
  try {
    return new URL(redirectUrl, request.url);
  } catch {
    return null;
  }
}

async function handleCancel(request: Request, params: Record<string, string>) {
  const paymentMethodId = params.paymentMethodId?.trim();
  if (!paymentMethodId) {
    return NextResponse.json({ error: 'paymentMethodId is required.' }, { status: 400 });
  }
  const fallbackCheckoutToken = getFallbackCheckoutToken(request);

  const resolvedPaymentMethod = await getCheckoutPaymentMethodById(paymentMethodId);
  if (!resolvedPaymentMethod.method) {
    return NextResponse.json(
      { error: resolvedPaymentMethod.issue?.message || 'Payment method not found.' },
      { status: 404 }
    );
  }

  if (resolvedPaymentMethod.method.ownerType === 'core') {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required.', redirectUrl: '/login?redirect=pricing' },
        { status: 401 }
      );
    }

    if (!fallbackCheckoutToken) {
      return NextResponse.json(
        { error: 'checkoutToken is required for core payment method cancel.' },
        { status: 400 }
      );
    }

    const checkoutAccess = await getCheckoutOrderByTokenForUser({
      checkoutToken: fallbackCheckoutToken,
      userId: user.id
    });
    if (!checkoutAccess) {
      return NextResponse.json(
        { error: 'Checkout order not found.' },
        { status: 404 }
      );
    }

    if (
      checkoutAccess.checkoutOrder.targetType === 'team' &&
      checkoutAccess.teamRole !== 'owner'
    ) {
      return NextResponse.json(
        { error: 'Only owners can manage team checkout.' },
        { status: 403 }
      );
    }
  }

  const result = await executeCheckoutPaymentMethodAction({
    paymentMethodId,
    action: 'cancel',
    request,
    fallbackCheckoutToken,
    source: 'checkout'
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }

  if (result.result.redirectUrl && request.method === 'GET') {
    const target = resolveRedirectTarget(request, result.result.redirectUrl);
    if (target) {
      return NextResponse.redirect(target);
    }
  }

  return NextResponse.json({
    ok: true,
    result: result.result,
    checkoutOrder: result.checkoutOrder
      ? {
          id: result.checkoutOrder.id,
          checkoutToken: result.checkoutOrder.checkoutToken,
          status: result.checkoutOrder.status
        }
      : null
  });
}

export const GET = withApiRouteEntries(
  CoreApiRoutes.checkout.cancel.get.handler(handleCancel)
);
export const POST = withApiRouteEntries(
  CoreApiRoutes.checkout.cancel.post.handler(handleCancel)
);
