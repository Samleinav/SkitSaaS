'use server';

import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import {
  createServerActionController,
  requireUser
} from '@skitsaas/sdk/server';
import { COMMERCE_ONE_TIME_PAYMENTS_FRONTEND_ALIAS } from './constants';
import { createOneTimeCheckoutIntent, getPrimaryTeamIdForUser } from './data';

type OneTimePaymentsSessionUser = {
  id: number;
  role?: string | null;
  email?: string | null;
};

const frontendAction = createServerActionController<OneTimePaymentsSessionUser>({
  requireUser: async () => requireUser<OneTimePaymentsSessionUser>()
});

function normalizeQuantity(value: number | null) {
  if (!value || !Number.isInteger(value)) {
    return 1;
  }

  return Math.min(100, Math.max(1, value));
}

function normalizeIdempotencyKey(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 160);
}

function buildOrderPath({
  productId,
  quantity,
  targetType,
  error
}: {
  productId?: number | null;
  quantity?: number | null;
  targetType?: 'team' | 'user' | null;
  error?: string | null;
}) {
  const params = new URLSearchParams();
  if (productId && Number.isInteger(productId) && productId > 0) {
    params.set('productId', String(productId));
  }
  if (quantity && Number.isInteger(quantity) && quantity > 0) {
    params.set('quantity', String(quantity));
  }
  if (targetType) {
    params.set('targetType', targetType);
  }
  if (error) {
    params.set('error', error);
  }

  const query = params.toString();
  return query
    ? `${COMMERCE_ONE_TIME_PAYMENTS_FRONTEND_ALIAS}/order?${query}`
    : `${COMMERCE_ONE_TIME_PAYMENTS_FRONTEND_ALIAS}/order`;
}

export const startOneTimeProductCheckoutAction = frontendAction(
  async ({ user, form }) => {
    const productId = form.positiveInt('productId');
    const quantity = normalizeQuantity(form.positiveInt('quantity'));
    const requestedTargetType = form.lower('targetType');
    const idempotencyKey =
      normalizeIdempotencyKey(form.string('idempotencyKey')) ??
      `otp_ui_${randomUUID().replace(/-/g, '')}`;

    if (!productId) {
      redirect(buildOrderPath({ error: 'invalid_product_id' }));
    }

    const teamId = await getPrimaryTeamIdForUser(user.id);
    const targetType =
      requestedTargetType === 'team' || requestedTargetType === 'user'
        ? requestedTargetType
        : teamId
          ? 'team'
          : 'user';

    if (targetType === 'team' && !teamId) {
      redirect(
        buildOrderPath({
          productId,
          quantity,
          targetType,
          error: 'target_team_required'
        })
      );
    }

    const result = await createOneTimeCheckoutIntent(
      {
        productId,
        quantity,
        provider: null,
        checkoutMode: 'core_checkout',
        targetType,
        targetTeamId: targetType === 'team' ? teamId : null,
        idempotencyKey,
        metadata: {
          source: 'frontend.products.order'
        },
        successUrl: null,
        cancelUrl: null
      },
      {
        userId: user.id
      }
    );

    if (!result.ok) {
      redirect(
        buildOrderPath({
          productId,
          quantity,
          targetType,
          error: result.code
        })
      );
    }

    const checkoutUrl = result.intent.checkoutUrl?.trim() || '';
    if (!checkoutUrl.startsWith('/checkout/')) {
      redirect(
        buildOrderPath({
          productId,
          quantity,
          targetType,
          error: 'operation_failed'
        })
      );
    }

    redirect(checkoutUrl);
  }
);
