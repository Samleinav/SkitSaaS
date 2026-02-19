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

type OneTimeCheckoutLineItemPayload = {
  productId: number;
  quantity: number;
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

function normalizeCartItemsQueryParam(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 4000);
}

function parseLineItemsPayload(value: string): {
  provided: boolean;
  ok: boolean;
  lineItems: OneTimeCheckoutLineItemPayload[] | null;
} {
  const normalized = value.trim();
  if (!normalized) {
    return {
      provided: false,
      ok: true,
      lineItems: null
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    return {
      provided: true,
      ok: false,
      lineItems: null
    };
  }

  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 100) {
    return {
      provided: true,
      ok: false,
      lineItems: null
    };
  }

  const normalizedLineItems: OneTimeCheckoutLineItemPayload[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return {
        provided: true,
        ok: false,
        lineItems: null
      };
    }

    const source = entry as Record<string, unknown>;
    const productId =
      typeof source.productId === 'number' &&
      Number.isInteger(source.productId) &&
      source.productId > 0
        ? source.productId
        : null;
    const quantityValue =
      source.quantity === undefined || source.quantity === null ? 1 : source.quantity;
    const quantity =
      typeof quantityValue === 'number' &&
      Number.isInteger(quantityValue) &&
      quantityValue > 0 &&
      quantityValue <= 100
        ? quantityValue
        : null;

    if (!productId || !quantity) {
      return {
        provided: true,
        ok: false,
        lineItems: null
      };
    }

    normalizedLineItems.push({
      productId,
      quantity
    });
  }

  return {
    provided: true,
    ok: true,
    lineItems: normalizedLineItems
  };
}

function buildOrderPath({
  productId,
  quantity,
  items,
  targetType,
  error
}: {
  productId?: number | null;
  quantity?: number | null;
  items?: string | null;
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
  if (items) {
    params.set('items', items);
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

function buildCatalogPath(error?: string | null) {
  if (!error) {
    return COMMERCE_ONE_TIME_PAYMENTS_FRONTEND_ALIAS;
  }

  const params = new URLSearchParams();
  params.set('error', error);
  return `${COMMERCE_ONE_TIME_PAYMENTS_FRONTEND_ALIAS}?${params.toString()}`;
}

function resolveRedirectPath({
  source,
  productId,
  quantity,
  items,
  targetType,
  error
}: {
  source: 'buy_now' | 'order';
  productId?: number | null;
  quantity?: number | null;
  items?: string | null;
  targetType?: 'team' | 'user' | null;
  error?: string | null;
}) {
  if (source === 'buy_now') {
    return buildCatalogPath(error);
  }

  return buildOrderPath({
    productId,
    quantity,
    items,
    targetType,
    error
  });
}

export const startOneTimeProductCheckoutAction = frontendAction(
  async ({ user, form }) => {
    const parsedLineItemsPayload = parseLineItemsPayload(
      form.string('lineItemsPayload')
    );
    const source =
      form.lower('checkoutSource') === 'buy_now' ? 'buy_now' : 'order';
    const cartItemsQueryParam = normalizeCartItemsQueryParam(
      form.string('cartItems')
    );

    if (parsedLineItemsPayload.provided && !parsedLineItemsPayload.ok) {
      redirect(
        resolveRedirectPath({
          source,
          items: cartItemsQueryParam,
          error: 'invalid_line_items'
        })
      );
    }

    const lineItems = parsedLineItemsPayload.lineItems;
    const productId = lineItems ? null : form.positiveInt('productId');
    const quantity = lineItems
      ? null
      : normalizeQuantity(form.positiveInt('quantity'));
    const requestedTargetType = form.lower('targetType');
    const idempotencyKey =
      normalizeIdempotencyKey(form.string('idempotencyKey')) ??
      `otp_ui_${randomUUID().replace(/-/g, '')}`;

    if (!lineItems && !productId) {
      redirect(
        resolveRedirectPath({
          source,
          items: cartItemsQueryParam,
          error: 'invalid_product_id'
        })
      );
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
        resolveRedirectPath({
          source,
          productId,
          quantity,
          items: cartItemsQueryParam,
          targetType,
          error: 'target_team_required'
        })
      );
    }

    const result = await createOneTimeCheckoutIntent(
      {
        productId,
        quantity,
        lineItems,
        provider: null,
        checkoutMode: 'core_checkout',
        targetType,
        targetTeamId: targetType === 'team' ? teamId : null,
        idempotencyKey,
        metadata: {
          source:
            source === 'buy_now'
              ? 'frontend.products.buy_now'
              : 'frontend.products.order'
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
        resolveRedirectPath({
          source,
          productId,
          quantity,
          items: cartItemsQueryParam,
          targetType,
          error: result.code
        })
      );
    }

    const checkoutUrl = result.intent.checkoutUrl?.trim() || '';
    if (!checkoutUrl.startsWith('/checkout/')) {
      redirect(
        resolveRedirectPath({
          source,
          productId,
          quantity,
          items: cartItemsQueryParam,
          targetType,
          error: 'operation_failed'
        })
      );
    }

    redirect(checkoutUrl);
  }
);
