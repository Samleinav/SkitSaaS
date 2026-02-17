import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { getUser } from '@skitsaas/sdk/server';
import type { ModuleRouteContext } from '@skitsaas/sdk';
import { startOneTimeProductCheckoutAction } from './actions';
import { COMMERCE_ONE_TIME_PAYMENTS_FRONTEND_ALIAS } from './constants';
import {
  getPrimaryTeamIdForUser,
  getPublishedOneTimeCatalogProduct,
  listPublishedOneTimeCatalogProducts,
  type OneTimeCatalogProduct
} from './data';

type OneTimePaymentsSessionUser = {
  id: number;
  role?: string | null;
};

function readSearchParam(
  context: ModuleRouteContext,
  key: string
): string | null {
  const value = context.searchParams?.[key];
  if (Array.isArray(value)) {
    const firstValue = value[0];
    return typeof firstValue === 'string' && firstValue.trim()
      ? firstValue.trim()
      : null;
  }

  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function parsePositiveInt(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function normalizeQuantity(value: string | null) {
  const parsed = parsePositiveInt(value);
  if (!parsed) {
    return 1;
  }

  return Math.min(100, Math.max(1, parsed));
}

function normalizeProvider(value: string | null) {
  return value === 'paypal' ? 'paypal' : 'stripe';
}

function normalizeTargetType(value: string | null) {
  if (value === 'team' || value === 'user') {
    return value;
  }

  return null;
}

function formatMoney(amountInCents: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amountInCents / 100);
  } catch {
    return `${currency.toUpperCase()} ${(amountInCents / 100).toFixed(2)}`;
  }
}

function buildPath(
  path: string,
  params: Record<string, string | number | null | undefined>
) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

function renderCatalogCard(product: OneTimeCatalogProduct) {
  const amountLabel = formatMoney(product.unitAmountCents, product.currency);
  const cartPath = buildPath(`${COMMERCE_ONE_TIME_PAYMENTS_FRONTEND_ALIAS}/cart`, {
    productId: product.productId,
    quantity: 1,
    provider: product.provider || 'stripe'
  });
  const orderPath = buildPath(
    `${COMMERCE_ONE_TIME_PAYMENTS_FRONTEND_ALIAS}/order`,
    {
      productId: product.productId,
      quantity: 1,
      provider: product.provider || 'stripe'
    }
  );

  return (
    <article
      key={product.productId}
      className="rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900"
    >
      <p className="text-xs uppercase tracking-wide text-zinc-500">
        {product.productKey}
      </p>
      <h2 className="mt-1 text-lg font-semibold">{product.name}</h2>
      <p className="mt-1 text-sm text-zinc-600">
        {product.description || 'No description.'}
      </p>
      <p className="mt-3 text-xl font-semibold">{amountLabel}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={cartPath}
          className="inline-flex rounded-md border border-zinc-300 px-3 py-2 text-sm"
        >
          Add to cart
        </Link>
        <Link
          href={orderPath}
          className="inline-flex rounded-md bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          Buy now
        </Link>
      </div>
    </article>
  );
}

function resolveOrderErrorMessage(errorCode: string | null) {
  if (!errorCode) {
    return null;
  }

  if (errorCode === 'target_team_required') {
    return 'You need an active team membership before starting checkout.';
  }

  if (errorCode === 'product_not_found') {
    return 'The selected product was not found.';
  }

  if (errorCode === 'product_not_published') {
    return 'The selected product is not published.';
  }

  if (errorCode === 'product_missing_active_price') {
    return 'The selected product has no active price.';
  }

  if (errorCode === 'target_team_forbidden') {
    return 'You cannot create an order for the selected team.';
  }

  return 'Unable to start checkout for this order.';
}

export async function renderOneTimeProductsCatalogPage() {
  const products = await listPublishedOneTimeCatalogProducts({ limit: 48 });

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          One-time products
        </p>
        <h1 className="text-3xl font-semibold text-zinc-900">Products</h1>
        <p className="text-sm text-zinc-600">
          Baseline storefront for one-time purchases connected to core checkout.
        </p>
      </header>

      {products.length === 0 ? (
        <section className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600">
          No published one-time products are available.
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {products.map((product) => renderCatalogCard(product))}
        </section>
      )}
    </main>
  );
}

export async function renderOneTimeProductsCartPage(context: ModuleRouteContext) {
  const productId = parsePositiveInt(readSearchParam(context, 'productId'));
  const quantity = normalizeQuantity(readSearchParam(context, 'quantity'));
  const targetType = normalizeTargetType(readSearchParam(context, 'targetType'));
  const product = productId
    ? await getPublishedOneTimeCatalogProduct(productId)
    : null;
  const provider = normalizeProvider(
    readSearchParam(context, 'provider') || product?.provider || null
  );

  if (!product) {
    return (
      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Cart</h1>
        <p className="text-sm text-zinc-600">
          Select a product from the catalog before continuing to order.
        </p>
        <Link
          href={COMMERCE_ONE_TIME_PAYMENTS_FRONTEND_ALIAS}
          className="inline-flex rounded-md bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          Browse products
        </Link>
      </main>
    );
  }

  const totalAmount = product.unitAmountCents * quantity;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Cart</p>
        <h1 className="text-2xl font-semibold text-zinc-900">{product.name}</h1>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-zinc-500">Unit price</dt>
            <dd className="font-medium text-zinc-900">
              {formatMoney(product.unitAmountCents, product.currency)}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-zinc-500">Quantity</dt>
            <dd className="font-medium text-zinc-900">{quantity}</dd>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-200 pt-3">
            <dt className="text-zinc-500">Total</dt>
            <dd className="text-lg font-semibold text-zinc-900">
              {formatMoney(totalAmount, product.currency)}
            </dd>
          </div>
        </dl>
      </section>

      <form
        action={`${COMMERCE_ONE_TIME_PAYMENTS_FRONTEND_ALIAS}/order`}
        method="GET"
        className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5"
      >
        <input type="hidden" name="productId" value={product.productId} />
        {targetType ? <input type="hidden" name="targetType" value={targetType} /> : null}

        <label className="block space-y-2 text-sm">
          <span className="font-medium text-zinc-800">Quantity</span>
          <input
            name="quantity"
            type="number"
            min={1}
            max={100}
            defaultValue={quantity}
            className="h-10 w-full rounded-md border border-zinc-300 px-3"
          />
        </label>

        <label className="block space-y-2 text-sm">
          <span className="font-medium text-zinc-800">Provider</span>
          <select
            name="provider"
            defaultValue={provider}
            className="h-10 w-full rounded-md border border-zinc-300 px-3"
          >
            <option value="stripe">Stripe</option>
            <option value="paypal">PayPal</option>
          </select>
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="inline-flex rounded-md bg-zinc-900 px-3 py-2 text-sm text-white"
          >
            Continue to order
          </button>
          <Link
            href={COMMERCE_ONE_TIME_PAYMENTS_FRONTEND_ALIAS}
            className="inline-flex rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800"
          >
            Back to products
          </Link>
        </div>
      </form>
    </main>
  );
}

export async function renderOneTimeProductsOrderPage(context: ModuleRouteContext) {
  const productId = parsePositiveInt(readSearchParam(context, 'productId'));
  const quantity = normalizeQuantity(readSearchParam(context, 'quantity'));
  const product = productId
    ? await getPublishedOneTimeCatalogProduct(productId)
    : null;
  const provider = normalizeProvider(
    readSearchParam(context, 'provider') || product?.provider || null
  );
  const errorMessage = resolveOrderErrorMessage(readSearchParam(context, 'error'));

  if (!product) {
    return (
      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Order</h1>
        <p className="text-sm text-zinc-600">
          Select a product before creating an order.
        </p>
        <Link
          href={COMMERCE_ONE_TIME_PAYMENTS_FRONTEND_ALIAS}
          className="inline-flex rounded-md bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          Browse products
        </Link>
      </main>
    );
  }

  const user = await getUser<OneTimePaymentsSessionUser>();
  if (!user) {
    return null;
  }

  const teamId = await getPrimaryTeamIdForUser(user.id);
  const requestedTargetType = normalizeTargetType(
    readSearchParam(context, 'targetType')
  );
  const targetType =
    requestedTargetType === 'team' || requestedTargetType === 'user'
      ? requestedTargetType
      : teamId
        ? 'team'
        : 'user';
  const resolvedTargetType =
    targetType === 'team' && !teamId ? 'user' : targetType;
  const idempotencyKey = `otp_ui_${randomUUID().replace(/-/g, '')}`;
  const totalAmount = product.unitAmountCents * quantity;
  const cartPath = buildPath(`${COMMERCE_ONE_TIME_PAYMENTS_FRONTEND_ALIAS}/cart`, {
    productId: product.productId,
    quantity,
    provider,
    targetType: resolvedTargetType
  });

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Order</p>
        <h1 className="text-2xl font-semibold text-zinc-900">{product.name}</h1>
        <p className="text-sm text-zinc-600">
          This baseline flow creates a module one-time intent and redirects to
          core checkout.
        </p>
      </header>

      {errorMessage ? (
        <section className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </section>
      ) : null}

      {!teamId && targetType === 'team' ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          No team membership found for this account. The checkout target was
          switched to user automatically.
        </section>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-zinc-500">Unit price</dt>
            <dd className="font-medium text-zinc-900">
              {formatMoney(product.unitAmountCents, product.currency)}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-zinc-500">Quantity</dt>
            <dd className="font-medium text-zinc-900">{quantity}</dd>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-200 pt-3">
            <dt className="text-zinc-500">Total</dt>
            <dd className="text-lg font-semibold text-zinc-900">
              {formatMoney(totalAmount, product.currency)}
            </dd>
          </div>
        </dl>
      </section>

      <form
        action={startOneTimeProductCheckoutAction}
        className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5"
      >
        <input type="hidden" name="productId" value={product.productId} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

        <label className="block space-y-2 text-sm">
          <span className="font-medium text-zinc-800">Quantity</span>
          <input
            name="quantity"
            type="number"
            min={1}
            max={100}
            defaultValue={quantity}
            className="h-10 w-full rounded-md border border-zinc-300 px-3"
          />
        </label>

        <label className="block space-y-2 text-sm">
          <span className="font-medium text-zinc-800">Provider</span>
          <select
            name="provider"
            defaultValue={provider}
            className="h-10 w-full rounded-md border border-zinc-300 px-3"
          >
            <option value="stripe">Stripe</option>
            <option value="paypal">PayPal</option>
          </select>
        </label>

        {teamId ? (
          <label className="block space-y-2 text-sm">
            <span className="font-medium text-zinc-800">Target</span>
            <select
              name="targetType"
              defaultValue={resolvedTargetType}
              className="h-10 w-full rounded-md border border-zinc-300 px-3"
            >
              <option value="team">Team</option>
              <option value="user">User</option>
            </select>
          </label>
        ) : (
          <input type="hidden" name="targetType" value="user" />
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="inline-flex rounded-md bg-zinc-900 px-3 py-2 text-sm text-white"
          >
            Continue to checkout
          </button>
          <Link
            href={cartPath}
            className="inline-flex rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800"
          >
            Back to cart
          </Link>
        </div>
      </form>
    </main>
  );
}
