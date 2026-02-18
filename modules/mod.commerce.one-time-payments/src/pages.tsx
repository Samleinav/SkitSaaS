import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { getUser } from '@skitsaas/sdk/server';
import type { ModuleRouteContext } from '@skitsaas/sdk';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { startOneTimeProductCheckoutAction } from './actions';
import {
  COMMERCE_ONE_TIME_PAYMENTS_FRONTEND_ALIAS,
  COMMERCE_ONE_TIME_PAYMENTS_MODULE_ID
} from './constants';
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
type ModuleMessageTree = Record<string, unknown>;

type OneTimeFrontendMessages = {
  common: {
    providerStripe: string;
    providerPayPal: string;
  };
  catalog: {
    eyebrow: string;
    title: string;
    description: string;
    empty: string;
    noDescription: string;
    addToCart: string;
    buyNow: string;
  };
  cart: {
    title: string;
    missingDescription: string;
    browseProducts: string;
    eyebrow: string;
    unitPriceLabel: string;
    quantityLabel: string;
    totalLabel: string;
    providerLabel: string;
    continueToOrder: string;
    backToProducts: string;
  };
  order: {
    title: string;
    missingDescription: string;
    browseProducts: string;
    eyebrow: string;
    description: string;
    unitPriceLabel: string;
    quantityLabel: string;
    totalLabel: string;
    providerLabel: string;
    targetLabel: string;
    targetTeamLabel: string;
    targetUserLabel: string;
    continueToCheckout: string;
    backToCart: string;
    oneTimeDescription: string;
    switchedToUserWarning: string;
    errors: Record<string, string>;
  };
};

const DEFAULT_ONE_TIME_FRONTEND_MESSAGES: OneTimeFrontendMessages = {
  common: {
    providerStripe: 'Stripe',
    providerPayPal: 'PayPal'
  },
  catalog: {
    eyebrow: 'One-time products',
    title: 'Products',
    description: 'Baseline storefront for one-time purchases connected to core checkout.',
    empty: 'No published one-time products are available.',
    noDescription: 'No description.',
    addToCart: 'Add to cart',
    buyNow: 'Buy now'
  },
  cart: {
    title: 'Cart',
    missingDescription: 'Select a product from the catalog before continuing to order.',
    browseProducts: 'Browse products',
    eyebrow: 'Cart',
    unitPriceLabel: 'Unit price',
    quantityLabel: 'Quantity',
    totalLabel: 'Total',
    providerLabel: 'Provider',
    continueToOrder: 'Continue to order',
    backToProducts: 'Back to products'
  },
  order: {
    title: 'Order',
    missingDescription: 'Select a product before creating an order.',
    browseProducts: 'Browse products',
    eyebrow: 'Order',
    description:
      'This baseline flow creates a module one-time intent and redirects to core checkout.',
    unitPriceLabel: 'Unit price',
    quantityLabel: 'Quantity',
    totalLabel: 'Total',
    providerLabel: 'Provider',
    targetLabel: 'Target',
    targetTeamLabel: 'Team',
    targetUserLabel: 'User',
    continueToCheckout: 'Continue to checkout',
    backToCart: 'Back to cart',
    oneTimeDescription: 'One-time order',
    switchedToUserWarning:
      'No team membership found for this account. The checkout target was switched to user automatically.',
    errors: {
      target_team_required: 'You need an active team membership before starting checkout.',
      product_not_found: 'The selected product was not found.',
      product_not_published: 'The selected product is not published.',
      product_missing_active_price: 'The selected product has no active price.',
      target_team_forbidden: 'You cannot create an order for the selected team.',
      operation_failed: 'Unable to start checkout for this order.'
    }
  }
};

function asMessageTree(value: unknown): ModuleMessageTree {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as ModuleMessageTree;
}

function readMessage(
  tree: ModuleMessageTree,
  path: string,
  fallback: string
): string {
  const segments = path.split('.');
  let current: unknown = tree;
  for (const segment of segments) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return fallback;
    }

    current = (current as ModuleMessageTree)[segment];
  }

  return typeof current === 'string' && current.trim() ? current : fallback;
}

function getOneTimeFrontendMessages(tree: ModuleMessageTree): OneTimeFrontendMessages {
  const defaults = DEFAULT_ONE_TIME_FRONTEND_MESSAGES;
  return {
    common: {
      providerStripe: readMessage(
        tree,
        'products.common.providerStripe',
        defaults.common.providerStripe
      ),
      providerPayPal: readMessage(
        tree,
        'products.common.providerPayPal',
        defaults.common.providerPayPal
      )
    },
    catalog: {
      eyebrow: readMessage(tree, 'products.catalog.eyebrow', defaults.catalog.eyebrow),
      title: readMessage(tree, 'products.catalog.title', defaults.catalog.title),
      description: readMessage(
        tree,
        'products.catalog.description',
        defaults.catalog.description
      ),
      empty: readMessage(tree, 'products.catalog.empty', defaults.catalog.empty),
      noDescription: readMessage(
        tree,
        'products.catalog.noDescription',
        defaults.catalog.noDescription
      ),
      addToCart: readMessage(tree, 'products.catalog.addToCart', defaults.catalog.addToCart),
      buyNow: readMessage(tree, 'products.catalog.buyNow', defaults.catalog.buyNow)
    },
    cart: {
      title: readMessage(tree, 'products.cart.title', defaults.cart.title),
      missingDescription: readMessage(
        tree,
        'products.cart.missingDescription',
        defaults.cart.missingDescription
      ),
      browseProducts: readMessage(
        tree,
        'products.cart.browseProducts',
        defaults.cart.browseProducts
      ),
      eyebrow: readMessage(tree, 'products.cart.eyebrow', defaults.cart.eyebrow),
      unitPriceLabel: readMessage(
        tree,
        'products.cart.unitPriceLabel',
        defaults.cart.unitPriceLabel
      ),
      quantityLabel: readMessage(
        tree,
        'products.cart.quantityLabel',
        defaults.cart.quantityLabel
      ),
      totalLabel: readMessage(tree, 'products.cart.totalLabel', defaults.cart.totalLabel),
      providerLabel: readMessage(
        tree,
        'products.cart.providerLabel',
        defaults.cart.providerLabel
      ),
      continueToOrder: readMessage(
        tree,
        'products.cart.continueToOrder',
        defaults.cart.continueToOrder
      ),
      backToProducts: readMessage(
        tree,
        'products.cart.backToProducts',
        defaults.cart.backToProducts
      )
    },
    order: {
      title: readMessage(tree, 'products.order.title', defaults.order.title),
      missingDescription: readMessage(
        tree,
        'products.order.missingDescription',
        defaults.order.missingDescription
      ),
      browseProducts: readMessage(
        tree,
        'products.order.browseProducts',
        defaults.order.browseProducts
      ),
      eyebrow: readMessage(tree, 'products.order.eyebrow', defaults.order.eyebrow),
      description: readMessage(
        tree,
        'products.order.description',
        defaults.order.description
      ),
      unitPriceLabel: readMessage(
        tree,
        'products.order.unitPriceLabel',
        defaults.order.unitPriceLabel
      ),
      quantityLabel: readMessage(
        tree,
        'products.order.quantityLabel',
        defaults.order.quantityLabel
      ),
      totalLabel: readMessage(tree, 'products.order.totalLabel', defaults.order.totalLabel),
      providerLabel: readMessage(
        tree,
        'products.order.providerLabel',
        defaults.order.providerLabel
      ),
      targetLabel: readMessage(tree, 'products.order.targetLabel', defaults.order.targetLabel),
      targetTeamLabel: readMessage(
        tree,
        'products.order.targetTeamLabel',
        defaults.order.targetTeamLabel
      ),
      targetUserLabel: readMessage(
        tree,
        'products.order.targetUserLabel',
        defaults.order.targetUserLabel
      ),
      continueToCheckout: readMessage(
        tree,
        'products.order.continueToCheckout',
        defaults.order.continueToCheckout
      ),
      backToCart: readMessage(tree, 'products.order.backToCart', defaults.order.backToCart),
      oneTimeDescription: readMessage(
        tree,
        'products.order.oneTimeDescription',
        defaults.order.oneTimeDescription
      ),
      switchedToUserWarning: readMessage(
        tree,
        'products.order.switchedToUserWarning',
        defaults.order.switchedToUserWarning
      ),
      errors: Object.fromEntries(
        Object.entries(defaults.order.errors).map(([code, fallback]) => [
          code,
          readMessage(tree, `products.order.errors.${code}`, fallback)
        ])
      )
    }
  };
}

async function getOneTimeModuleMessages() {
  const messages = await getServerMessages('global');
  return getOneTimeFrontendMessages(
    asMessageTree(messages.mod?.[COMMERCE_ONE_TIME_PAYMENTS_MODULE_ID])
  );
}

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

function renderCatalogCardTemplate(
  product: OneTimeCatalogProduct,
  themeId: string | null,
  messages: OneTimeFrontendMessages
) {
  const amountLabel = formatMoney(product.unitAmountCents, product.currency);
  const cartPath = buildPath(`${COMMERCE_ONE_TIME_PAYMENTS_FRONTEND_ALIAS}/cart`, {
    productId: product.productId,
    quantity: 1
  });

  const fallback = (
    <article
      key={product.productId}
      className="rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900"
    >
      <p className="text-xs uppercase tracking-wide text-zinc-500">
        {product.productKey}
      </p>
      <h2 className="mt-1 text-lg font-semibold">{product.name}</h2>
      <p className="mt-1 text-sm text-zinc-600">
        {product.description || messages.catalog.noDescription}
      </p>
      <p className="mt-3 text-xl font-semibold">{amountLabel}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={cartPath}
          className="inline-flex rounded-md border border-zinc-300 px-3 py-2 text-sm"
        >
          {messages.catalog.addToCart}
        </Link>
        <form action={startOneTimeProductCheckoutAction}>
          <input type="hidden" name="productId" value={product.productId} />
          <input type="hidden" name="quantity" value={1} />
          <button
            type="submit"
            className="inline-flex rounded-md bg-zinc-900 px-3 py-2 text-sm text-white"
          >
            {messages.catalog.buyNow}
          </button>
        </form>
      </div>
    </article>
  );

  if (!themeId) {
    return fallback;
  }

  return (
    <ThemeCodeTemplate
      id="section.frontend.products.catalog.card"
      themeId={themeId}
      data={{
        productId: product.productId,
        productKey: product.productKey,
        name: product.name,
        priceLabel: amountLabel,
        provider: product.provider
      }}
      fallback={fallback}
    >
      {fallback}
    </ThemeCodeTemplate>
  );
}

function resolveOrderErrorMessage(
  errorCode: string | null,
  messages: OneTimeFrontendMessages
) {
  if (!errorCode) {
    return null;
  }

  return (
    messages.order.errors[errorCode] ||
    messages.order.errors.operation_failed
  );
}

export async function renderOneTimeProductsCatalogPage() {
  const moduleMessages = await getOneTimeModuleMessages();
  const products = await listPublishedOneTimeCatalogProducts({ limit: 48 });
  const themeSelection = await getThemeSelectionForArea('frontend');
  const themeId = themeSelection?.themeKey ?? null;

  const fallback = (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          {moduleMessages.catalog.eyebrow}
        </p>
        <h1 className="text-3xl font-semibold text-zinc-900">
          {moduleMessages.catalog.title}
        </h1>
        <p className="text-sm text-zinc-600">{moduleMessages.catalog.description}</p>
      </header>

      {products.length === 0 ? (
        <section className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600">
          {moduleMessages.catalog.empty}
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {products.map((product) =>
            renderCatalogCardTemplate(product, themeId, moduleMessages)
          )}
        </section>
      )}
    </main>
  );

  if (!themeId) {
    return fallback;
  }

  return (
    <ThemeCodeTemplate
      id="page.frontend.products.catalog"
      themeId={themeId}
      data={{
        title: moduleMessages.catalog.title,
        description: moduleMessages.catalog.description,
        total: products.length,
        hasProducts: products.length > 0
      }}
      fallback={fallback}
    >
      {fallback}
    </ThemeCodeTemplate>
  );
}

export async function renderOneTimeProductsCartPage(context: ModuleRouteContext) {
  const moduleMessages = await getOneTimeModuleMessages();
  const productId = parsePositiveInt(readSearchParam(context, 'productId'));
  const quantity = normalizeQuantity(readSearchParam(context, 'quantity'));
  const targetType = normalizeTargetType(readSearchParam(context, 'targetType'));
  const product = productId
    ? await getPublishedOneTimeCatalogProduct(productId)
    : null;

  if (!product) {
    return (
      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8">
        <h1 className="text-2xl font-semibold text-zinc-900">{moduleMessages.cart.title}</h1>
        <p className="text-sm text-zinc-600">{moduleMessages.cart.missingDescription}</p>
        <Link
          href={COMMERCE_ONE_TIME_PAYMENTS_FRONTEND_ALIAS}
          className="inline-flex rounded-md bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          {moduleMessages.cart.browseProducts}
        </Link>
      </main>
    );
  }

  const totalAmount = product.unitAmountCents * quantity;
  const themeSelection = await getThemeSelectionForArea('frontend');
  const themeId = themeSelection?.themeKey ?? null;

  const cartSummaryFallback = (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-zinc-500">{moduleMessages.cart.unitPriceLabel}</dt>
          <dd className="font-medium text-zinc-900">
            {formatMoney(product.unitAmountCents, product.currency)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-zinc-500">{moduleMessages.cart.quantityLabel}</dt>
          <dd className="font-medium text-zinc-900">{quantity}</dd>
        </div>
        <div className="flex items-center justify-between border-t border-zinc-200 pt-3">
          <dt className="text-zinc-500">{moduleMessages.cart.totalLabel}</dt>
          <dd className="text-lg font-semibold text-zinc-900">
            {formatMoney(totalAmount, product.currency)}
          </dd>
        </div>
      </dl>
    </section>
  );

  const cartSummary = !themeId ? (
    cartSummaryFallback
  ) : (
    <ThemeCodeTemplate
      id="section.frontend.products.cart.summary"
      themeId={themeId}
      data={{
        productId: product.productId,
        quantity,
        unitAmount: product.unitAmountCents,
        totalAmount,
        currency: product.currency
      }}
      fallback={cartSummaryFallback}
    >
      {cartSummaryFallback}
    </ThemeCodeTemplate>
  );

  const fallback = (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          {moduleMessages.cart.eyebrow}
        </p>
        <h1 className="text-2xl font-semibold text-zinc-900">{product.name}</h1>
      </header>

      {cartSummary}

      <form
        action={`${COMMERCE_ONE_TIME_PAYMENTS_FRONTEND_ALIAS}/order`}
        method="GET"
        className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5"
      >
        <input type="hidden" name="productId" value={product.productId} />
        {targetType ? <input type="hidden" name="targetType" value={targetType} /> : null}

        <label className="block space-y-2 text-sm">
          <span className="font-medium text-zinc-800">{moduleMessages.cart.quantityLabel}</span>
          <input
            name="quantity"
            type="number"
            min={1}
            max={100}
            defaultValue={quantity}
            className="h-10 w-full rounded-md border border-zinc-300 px-3"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="inline-flex rounded-md bg-zinc-900 px-3 py-2 text-sm text-white"
          >
            {moduleMessages.cart.continueToOrder}
          </button>
          <Link
            href={COMMERCE_ONE_TIME_PAYMENTS_FRONTEND_ALIAS}
            className="inline-flex rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800"
          >
            {moduleMessages.cart.backToProducts}
          </Link>
        </div>
      </form>
    </main>
  );

  if (!themeId) {
    return fallback;
  }

  return (
    <ThemeCodeTemplate
      id="page.frontend.products.cart"
      themeId={themeId}
      data={{
        title: moduleMessages.cart.title,
        description: product.name,
        productId: product.productId,
        quantity
      }}
      fallback={fallback}
    >
      {fallback}
    </ThemeCodeTemplate>
  );
}

export async function renderOneTimeProductsOrderPage(context: ModuleRouteContext) {
  const moduleMessages = await getOneTimeModuleMessages();
  const productId = parsePositiveInt(readSearchParam(context, 'productId'));
  const quantity = normalizeQuantity(readSearchParam(context, 'quantity'));
  const product = productId
    ? await getPublishedOneTimeCatalogProduct(productId)
    : null;
  const provider = product?.provider ?? null;
  const errorMessage = resolveOrderErrorMessage(
    readSearchParam(context, 'error'),
    moduleMessages
  );

  if (!product) {
    return (
      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8">
        <h1 className="text-2xl font-semibold text-zinc-900">{moduleMessages.order.title}</h1>
        <p className="text-sm text-zinc-600">{moduleMessages.order.missingDescription}</p>
        <Link
          href={COMMERCE_ONE_TIME_PAYMENTS_FRONTEND_ALIAS}
          className="inline-flex rounded-md bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          {moduleMessages.order.browseProducts}
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
    targetType: resolvedTargetType
  });
  const themeSelection = await getThemeSelectionForArea('frontend');
  const themeId = themeSelection?.themeKey ?? null;

  const orderSummaryFallback = (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-zinc-500">{moduleMessages.order.unitPriceLabel}</dt>
          <dd className="font-medium text-zinc-900">
            {formatMoney(product.unitAmountCents, product.currency)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-zinc-500">{moduleMessages.order.quantityLabel}</dt>
          <dd className="font-medium text-zinc-900">{quantity}</dd>
        </div>
        <div className="flex items-center justify-between border-t border-zinc-200 pt-3">
          <dt className="text-zinc-500">{moduleMessages.order.totalLabel}</dt>
          <dd className="text-lg font-semibold text-zinc-900">
            {formatMoney(totalAmount, product.currency)}
          </dd>
        </div>
      </dl>
    </section>
  );

  const orderSummary = !themeId ? (
    orderSummaryFallback
  ) : (
    <ThemeCodeTemplate
      id="section.frontend.products.cart.summary"
      themeId={themeId}
      data={{
        productId: product.productId,
        quantity,
        unitAmount: product.unitAmountCents,
        totalAmount,
        currency: product.currency
      }}
      fallback={orderSummaryFallback}
    >
      {orderSummaryFallback}
    </ThemeCodeTemplate>
  );

  const orderFormFallback = (
    <form
      action={startOneTimeProductCheckoutAction}
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5"
    >
      <input type="hidden" name="productId" value={product.productId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <label className="block space-y-2 text-sm">
        <span className="font-medium text-zinc-800">{moduleMessages.order.quantityLabel}</span>
        <input
          name="quantity"
          type="number"
          min={1}
          max={100}
          defaultValue={quantity}
          className="h-10 w-full rounded-md border border-zinc-300 px-3"
        />
      </label>

      {teamId ? (
        <label className="block space-y-2 text-sm">
          <span className="font-medium text-zinc-800">{moduleMessages.order.targetLabel}</span>
          <select
            name="targetType"
            defaultValue={resolvedTargetType}
            className="h-10 w-full rounded-md border border-zinc-300 px-3"
          >
            <option value="team">{moduleMessages.order.targetTeamLabel}</option>
            <option value="user">{moduleMessages.order.targetUserLabel}</option>
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
          {moduleMessages.order.continueToCheckout}
        </button>
        <Link
          href={cartPath}
          className="inline-flex rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800"
        >
          {moduleMessages.order.backToCart}
        </Link>
      </div>
    </form>
  );

  const orderForm = !themeId ? (
    orderFormFallback
  ) : (
    <ThemeCodeTemplate
      id="section.frontend.products.order.form"
      themeId={themeId}
      data={{
        productId: product.productId,
        provider,
        targetType: resolvedTargetType,
        canUseTeamTarget: Boolean(teamId)
      }}
      fallback={orderFormFallback}
    >
      {orderFormFallback}
    </ThemeCodeTemplate>
  );

  const fallback = (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          {moduleMessages.order.eyebrow}
        </p>
        <h1 className="text-2xl font-semibold text-zinc-900">{product.name}</h1>
        <p className="text-sm text-zinc-600">{moduleMessages.order.description}</p>
      </header>

      {errorMessage ? (
        <section className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </section>
      ) : null}

      {!teamId && targetType === 'team' ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {moduleMessages.order.switchedToUserWarning}
        </section>
      ) : null}

      {orderSummary}
      {orderForm}
    </main>
  );

  if (!themeId) {
    return fallback;
  }

  return (
    <ThemeCodeTemplate
      id="page.frontend.products.order"
      themeId={themeId}
      data={{
        title: product.name,
        description: moduleMessages.order.oneTimeDescription,
        provider,
        targetType: resolvedTargetType
      }}
      fallback={fallback}
    >
      {fallback}
    </ThemeCodeTemplate>
  );
}
