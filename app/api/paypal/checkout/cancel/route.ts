import { NextRequest, NextResponse } from 'next/server';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import {
  getCheckoutOrderByTokenForTeam,
  isCheckoutOrderPayable
} from '@/lib/payments/checkout-orders';
import { logLegacyCheckoutRouteUsage } from '@/lib/payments/legacy-routes';
import { executeCheckoutPaymentMethodAction } from '@/lib/payments/payment-methods';

type CancelCheckoutRequestBody = {
  checkoutToken?: unknown;
};

export async function POST(request: NextRequest) {
  await logLegacyCheckoutRouteUsage({
    request,
    routePath: '/api/paypal/checkout/cancel',
    replacementPath: '/api/checkout/methods/paypal/cancel',
    provider: 'paypal',
    source: '/api/paypal/checkout/cancel'
  });

  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required.', redirectUrl: '/login?redirect=pricing' },
      { status: 401 }
    );
  }

  const team = await getTeamForUser();
  if (!team) {
    return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
  }

  const membership = team.teamMembers.find((member) => member.userId === user.id);
  if (!membership || membership.role !== 'owner') {
    return NextResponse.json(
      { error: 'Only owners can manage checkout.' },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as CancelCheckoutRequestBody;
  const checkoutToken =
    typeof body.checkoutToken === 'string' ? body.checkoutToken.trim() : '';

  if (!checkoutToken) {
    return NextResponse.json(
      { error: 'checkoutToken is required.' },
      { status: 400 }
    );
  }

  const checkoutOrder = await getCheckoutOrderByTokenForTeam({
    checkoutToken,
    teamId: team.id
  });
  if (!checkoutOrder) {
    return NextResponse.json(
      { error: 'Checkout order not found.' },
      { status: 404 }
    );
  }

  if (!isCheckoutOrderPayable(checkoutOrder)) {
    return NextResponse.json({ ok: true });
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
}
