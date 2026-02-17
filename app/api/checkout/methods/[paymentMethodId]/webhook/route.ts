import { NextRequest, NextResponse } from 'next/server';
import { executeCheckoutPaymentMethodAction } from '@/lib/payments/payment-methods';

type RouteContext = {
  params: { paymentMethodId: string } | Promise<{ paymentMethodId: string }>;
};

function getFallbackCheckoutToken(request: NextRequest) {
  const tokenFromQuery =
    request.nextUrl.searchParams.get('checkoutToken') ||
    request.nextUrl.searchParams.get('checkout_token');
  if (tokenFromQuery) {
    return tokenFromQuery.trim();
  }

  return null;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const resolvedParams = await Promise.resolve(params);
  const paymentMethodId = resolvedParams.paymentMethodId?.trim();
  if (!paymentMethodId) {
    return NextResponse.json({ error: 'paymentMethodId is required.' }, { status: 400 });
  }

  const result = await executeCheckoutPaymentMethodAction({
    paymentMethodId,
    action: 'webhook',
    request,
    fallbackCheckoutToken: getFallbackCheckoutToken(request),
    source: 'webhook'
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
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
