'use server';

import { redirect } from 'next/navigation';
import {
  createServerActionController,
  revalidatePaths,
  requireAdmin,
  type FormReader
} from '@skitsaas/sdk/server';
import { COMMERCE_PRODUCTS_ADMIN_ALIAS } from './constants';
import {
  createCommerceProduct,
  publishCommerceProduct,
  unpublishCommerceProduct,
  updateCommerceProduct
} from './data';
import {
  parseCreateCommerceProductInput,
  parseProductId,
  parseUpdateCommerceProductInput
} from './validators';

type CommerceProductsSessionUser = {
  id: number;
  role?: string | null;
  email?: string | null;
};

const adminAction = createServerActionController<CommerceProductsSessionUser>({
  requireUser: async () => requireAdmin<CommerceProductsSessionUser>()
});

function trimToNull(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeKind(value: string) {
  return value === 'subscription' ? 'subscription' : 'one_time';
}

function normalizePriceAmountToCents(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }

  const cents = Math.round(numeric * 100);
  if (!Number.isInteger(cents) || cents < 0 || cents > 2_147_483_647) {
    return null;
  }

  return cents;
}

function buildPathWithQuery(
  path: string,
  params: Record<string, string | null | undefined>
) {
  const base = new URL(path, 'https://example.test');
  for (const [key, value] of Object.entries(params)) {
    if (!value) {
      continue;
    }

    base.searchParams.set(key, value);
  }

  const query = base.searchParams.toString();
  return query ? `${base.pathname}?${query}` : base.pathname;
}

function normalizeReturnPath(value: string, fallback: string) {
  const normalized = value.trim();
  if (!normalized) {
    return fallback;
  }

  try {
    const resolved = new URL(normalized, 'https://example.test');
    const path = `${resolved.pathname}${resolved.search}`;
    if (path.startsWith(COMMERCE_PRODUCTS_ADMIN_ALIAS)) {
      return path;
    }
  } catch {
    // ignore malformed return paths and fall back
  }

  return fallback;
}

function buildCreatePayload(form: FormReader) {
  const kind = normalizeKind(form.lower('kind'));
  const priceCurrency = form.string('priceCurrency').toUpperCase();
  const priceAmountInCents = normalizePriceAmountToCents(form.string('priceAmount'));
  const payload: Record<string, unknown> = {
    productKey: form.string('productKey'),
    name: form.string('name'),
    description: trimToNull(form.string('description')),
    kind,
    subscriptionTemplateId:
      kind === 'subscription' ? form.positiveInt('subscriptionTemplateId') : null
  };

  if (kind === 'one_time') {
    payload.price = {
      currency: priceCurrency,
      unitAmountCents: priceAmountInCents ?? -1,
      provider: null,
      providerPriceId: null
    };
  }

  return payload;
}

function buildUpdatePayload(form: FormReader) {
  const kind = normalizeKind(form.lower('kind'));
  const priceCurrency = form.string('priceCurrency').toUpperCase();
  const rawPriceAmount = form.string('priceAmount');
  const priceAmountInCents = normalizePriceAmountToCents(rawPriceAmount);
  const payload: Record<string, unknown> = {
    productKey: form.string('productKey'),
    name: form.string('name'),
    description: trimToNull(form.string('description')),
    kind,
    subscriptionTemplateId:
      kind === 'subscription' ? form.positiveInt('subscriptionTemplateId') : null
  };

  if (kind === 'one_time') {
    const hasPriceUpdate =
      Boolean(priceCurrency) ||
      Boolean(rawPriceAmount.trim());

    if (hasPriceUpdate) {
      payload.price = {
        currency: priceCurrency,
        unitAmountCents: priceAmountInCents ?? -1,
        provider: null,
        providerPriceId: null
      };
    }
  }

  return payload;
}

async function revalidateCommerceProductsPaths(productId?: number | null) {
  const paths = [
    COMMERCE_PRODUCTS_ADMIN_ALIAS,
    `${COMMERCE_PRODUCTS_ADMIN_ALIAS}/create`
  ];
  if (productId && Number.isInteger(productId) && productId > 0) {
    paths.push(`${COMMERCE_PRODUCTS_ADMIN_ALIAS}/${productId}/edit`);
  }

  await revalidatePaths(paths);
}

export const createCommerceProductAdminAction = adminAction(
  async ({ user, form }) => {
    const createPath = `${COMMERCE_PRODUCTS_ADMIN_ALIAS}/create`;
    const parsedInput = parseCreateCommerceProductInput(buildCreatePayload(form));
    if (!parsedInput.ok) {
      redirect(buildPathWithQuery(createPath, { error: parsedInput.code }));
    }

    const result = await createCommerceProduct(parsedInput.value, {
      actorUserId: user.id
    });
    if (!result.ok) {
      redirect(buildPathWithQuery(createPath, { error: result.code }));
    }

    await revalidateCommerceProductsPaths(result.product.id);
    redirect(
      buildPathWithQuery(`${COMMERCE_PRODUCTS_ADMIN_ALIAS}/${result.product.id}/edit`, {
        status: 'created'
      })
    );
  }
);

export const updateCommerceProductAdminAction = adminAction(
  async ({ user, form }) => {
    const parsedProductId = parseProductId(form.value('productId'));
    if (!parsedProductId.ok) {
      redirect(
        buildPathWithQuery(COMMERCE_PRODUCTS_ADMIN_ALIAS, {
          error: parsedProductId.code
        })
      );
    }

    const productId = parsedProductId.value;
    const editPath = `${COMMERCE_PRODUCTS_ADMIN_ALIAS}/${productId}/edit`;
    const parsedInput = parseUpdateCommerceProductInput(buildUpdatePayload(form));
    if (!parsedInput.ok) {
      redirect(buildPathWithQuery(editPath, { error: parsedInput.code }));
    }

    const result = await updateCommerceProduct(productId, parsedInput.value, {
      actorUserId: user.id
    });
    if (!result.ok) {
      redirect(buildPathWithQuery(editPath, { error: result.code }));
    }

    await revalidateCommerceProductsPaths(productId);
    redirect(buildPathWithQuery(editPath, { status: 'updated' }));
  }
);

export const publishCommerceProductAdminAction = adminAction(
  async ({ user, form }) => {
    const parsedProductId = parseProductId(form.value('productId'));
    if (!parsedProductId.ok) {
      redirect(
        buildPathWithQuery(COMMERCE_PRODUCTS_ADMIN_ALIAS, {
          error: parsedProductId.code
        })
      );
    }

    const productId = parsedProductId.value;
    const returnPath = normalizeReturnPath(
      form.string('returnTo'),
      COMMERCE_PRODUCTS_ADMIN_ALIAS
    );
    const result = await publishCommerceProduct(productId, {}, {
      actorUserId: user.id
    });
    if (!result.ok) {
      redirect(buildPathWithQuery(returnPath, { error: result.code }));
    }

    await revalidateCommerceProductsPaths(productId);
    redirect(buildPathWithQuery(returnPath, { status: 'published' }));
  }
);

export const unpublishCommerceProductAdminAction = adminAction(
  async ({ user, form }) => {
    const parsedProductId = parseProductId(form.value('productId'));
    if (!parsedProductId.ok) {
      redirect(
        buildPathWithQuery(COMMERCE_PRODUCTS_ADMIN_ALIAS, {
          error: parsedProductId.code
        })
      );
    }

    const productId = parsedProductId.value;
    const returnPath = normalizeReturnPath(
      form.string('returnTo'),
      COMMERCE_PRODUCTS_ADMIN_ALIAS
    );
    const result = await unpublishCommerceProduct(productId, {}, {
      actorUserId: user.id
    });
    if (!result.ok) {
      redirect(buildPathWithQuery(returnPath, { error: result.code }));
    }

    await revalidateCommerceProductsPaths(productId);
    redirect(buildPathWithQuery(returnPath, { status: 'unpublished' }));
  }
);
