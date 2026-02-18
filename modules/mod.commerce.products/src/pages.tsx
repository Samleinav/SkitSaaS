import Link from 'next/link';
import type { ModuleRouteContext } from '@skitsaas/sdk';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { getCommerceProductById, listCommerceProducts } from './data';
import type { CommerceProduct } from './types';
import {
  createCommerceProductAdminAction,
  publishCommerceProductAdminAction,
  unpublishCommerceProductAdminAction,
  updateCommerceProductAdminAction
} from './actions';
import {
  COMMERCE_PRODUCTS_ADMIN_ALIAS,
  COMMERCE_PRODUCTS_MODULE_ID
} from './constants';
import { parseProductId } from './validators';

type ProductKindFilter = 'all' | 'subscription' | 'one_time';
type ProductPublicationFilter = 'all' | 'published' | 'draft';
type ModuleMessageTree = Record<string, unknown>;

type CommerceProductsAdminMessages = {
  list: {
    eyebrow: string;
    title: string;
    description: string;
    createLabel: string;
    empty: string;
  };
  create: {
    title: string;
    description: string;
    submitLabel: string;
    backLabel: string;
  };
  edit: {
    titlePrefix: string;
    description: string;
    submitLabel: string;
    backLabel: string;
  };
  notFound: {
    title: string;
    descriptionTemplate: string;
    backLabel: string;
  };
  filters: {
    kindLabel: string;
    publicationLabel: string;
    allLabel: string;
    subscriptionLabel: string;
    oneTimeLabel: string;
    publishedLabel: string;
    draftLabel: string;
    applyLabel: string;
    resetLabel: string;
  };
  table: {
    idHeader: string;
    keyHeader: string;
    nameHeader: string;
    kindHeader: string;
    priceHeader: string;
    stateHeader: string;
    updatedHeader: string;
    actionsHeader: string;
    editLabel: string;
    publishLabel: string;
    unpublishLabel: string;
  };
  form: {
    productKeyLabel: string;
    productKeyPlaceholder: string;
    nameLabel: string;
    descriptionLabel: string;
    kindLabel: string;
    subscriptionTemplateIdLabel: string;
    subscriptionTemplateIdHint: string;
    priceCurrencyLabel: string;
    priceAmountLabel: string;
    priceProviderLabel: string;
    priceProviderPlaceholder: string;
    providerPriceIdLabel: string;
  };
  publication: {
    title: string;
    currentStateLabel: string;
  };
  kindLabels: {
    subscription: string;
    oneTime: string;
  };
  stateLabels: {
    published: string;
    draft: string;
  };
  feedback: {
    statusCreated: string;
    statusUpdated: string;
    statusPublished: string;
    statusUnpublished: string;
    operationFailedTemplate: string;
    errors: Record<string, string>;
  };
};

const DEFAULT_COMMERCE_PRODUCTS_ADMIN_MESSAGES: CommerceProductsAdminMessages = {
  list: {
    eyebrow: 'Commerce products',
    title: 'Products',
    description: 'Admin management for subscription and one-time catalog products.',
    createLabel: 'Create product',
    empty: 'No products found for current filters.'
  },
  create: {
    title: 'Create Product',
    description: 'Create a catalog product for subscription or one-time checkout.',
    submitLabel: 'Create product',
    backLabel: 'Back'
  },
  edit: {
    titlePrefix: 'Edit Product #',
    description: 'Update product fields and publication state.',
    submitLabel: 'Save changes',
    backLabel: 'Back'
  },
  notFound: {
    title: 'Product Not Found',
    descriptionTemplate: 'Product id {productId} was not found.',
    backLabel: 'Back to products'
  },
  filters: {
    kindLabel: 'Kind',
    publicationLabel: 'Publication',
    allLabel: 'All',
    subscriptionLabel: 'subscription',
    oneTimeLabel: 'one_time',
    publishedLabel: 'published',
    draftLabel: 'draft',
    applyLabel: 'Apply',
    resetLabel: 'Reset'
  },
  table: {
    idHeader: 'Id',
    keyHeader: 'Key',
    nameHeader: 'Name',
    kindHeader: 'Kind',
    priceHeader: 'Price',
    stateHeader: 'State',
    updatedHeader: 'Updated',
    actionsHeader: 'Actions',
    editLabel: 'Edit',
    publishLabel: 'Publish',
    unpublishLabel: 'Unpublish'
  },
  form: {
    productKeyLabel: 'Product key',
    productKeyPlaceholder: 'coffee-mug',
    nameLabel: 'Name',
    descriptionLabel: 'Description',
    kindLabel: 'Kind',
    subscriptionTemplateIdLabel: 'Subscription template id',
    subscriptionTemplateIdHint: 'Required only when kind is subscription.',
    priceCurrencyLabel: 'Price currency',
    priceAmountLabel: 'Price amount (cents)',
    priceProviderLabel: 'Price provider',
    priceProviderPlaceholder: 'stripe | paypal',
    providerPriceIdLabel: 'Provider price id'
  },
  publication: {
    title: 'Publication',
    currentStateLabel: 'Current state'
  },
  kindLabels: {
    subscription: 'subscription',
    oneTime: 'one_time'
  },
  stateLabels: {
    published: 'published',
    draft: 'draft'
  },
  feedback: {
    statusCreated: 'Product created successfully.',
    statusUpdated: 'Product updated successfully.',
    statusPublished: 'Product published successfully.',
    statusUnpublished: 'Product unpublished successfully.',
    operationFailedTemplate: 'Operation failed ({code}).',
    errors: {
      invalid_product_id: 'Invalid product id.',
      invalid_product_key: 'Product key is required and must be slug-compatible.',
      invalid_name: 'Product name is required.',
      invalid_kind: 'Product type must be subscription or one_time.',
      invalid_subscription_template_id:
        'Subscription template id must be a positive integer.',
      invalid_price: 'Price payload is invalid.',
      invalid_price_currency: 'Price currency must be a valid code.',
      invalid_price_amount: 'Price amount must be an integer >= 0.',
      invalid_price_provider: 'Price provider is invalid.',
      invalid_price_provider_id: 'Provider price id is invalid.',
      one_time_price_required: 'One-time products require an active price.',
      price_not_allowed_for_subscription:
        'Price is not allowed for subscription products.',
      subscription_template_required:
        'Subscription products require a subscription template id.',
      subscription_template_not_found: 'Subscription template was not found.',
      subscription_template_not_allowed_for_one_time:
        'subscriptionTemplateId is not allowed for one_time products.',
      duplicate_product_key: 'Product key is already in use.',
      one_time_product_missing_active_price:
        'Cannot publish one_time product without an active price.',
      no_updates_provided: 'No updates were provided.',
      not_found: 'Product was not found.',
      operation_failed: 'Operation failed. Try again.'
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

function getCommerceProductsAdminMessages(
  tree: ModuleMessageTree
): CommerceProductsAdminMessages {
  const defaults = DEFAULT_COMMERCE_PRODUCTS_ADMIN_MESSAGES;
  return {
    list: {
      eyebrow: readMessage(tree, 'products.page.list.eyebrow', defaults.list.eyebrow),
      title: readMessage(tree, 'products.page.list.title', defaults.list.title),
      description: readMessage(
        tree,
        'products.page.list.description',
        defaults.list.description
      ),
      createLabel: readMessage(
        tree,
        'products.page.list.createLabel',
        defaults.list.createLabel
      ),
      empty: readMessage(tree, 'products.page.list.empty', defaults.list.empty)
    },
    create: {
      title: readMessage(tree, 'products.page.create.title', defaults.create.title),
      description: readMessage(
        tree,
        'products.page.create.description',
        defaults.create.description
      ),
      submitLabel: readMessage(
        tree,
        'products.page.create.submitLabel',
        defaults.create.submitLabel
      ),
      backLabel: readMessage(
        tree,
        'products.page.create.backLabel',
        defaults.create.backLabel
      )
    },
    edit: {
      titlePrefix: readMessage(
        tree,
        'products.page.edit.titlePrefix',
        defaults.edit.titlePrefix
      ),
      description: readMessage(
        tree,
        'products.page.edit.description',
        defaults.edit.description
      ),
      submitLabel: readMessage(
        tree,
        'products.page.edit.submitLabel',
        defaults.edit.submitLabel
      ),
      backLabel: readMessage(tree, 'products.page.edit.backLabel', defaults.edit.backLabel)
    },
    notFound: {
      title: readMessage(tree, 'products.page.notFound.title', defaults.notFound.title),
      descriptionTemplate: readMessage(
        tree,
        'products.page.notFound.descriptionTemplate',
        defaults.notFound.descriptionTemplate
      ),
      backLabel: readMessage(
        tree,
        'products.page.notFound.backLabel',
        defaults.notFound.backLabel
      )
    },
    filters: {
      kindLabel: readMessage(tree, 'products.filters.kindLabel', defaults.filters.kindLabel),
      publicationLabel: readMessage(
        tree,
        'products.filters.publicationLabel',
        defaults.filters.publicationLabel
      ),
      allLabel: readMessage(tree, 'products.filters.allLabel', defaults.filters.allLabel),
      subscriptionLabel: readMessage(
        tree,
        'products.filters.subscriptionLabel',
        defaults.filters.subscriptionLabel
      ),
      oneTimeLabel: readMessage(
        tree,
        'products.filters.oneTimeLabel',
        defaults.filters.oneTimeLabel
      ),
      publishedLabel: readMessage(
        tree,
        'products.filters.publishedLabel',
        defaults.filters.publishedLabel
      ),
      draftLabel: readMessage(
        tree,
        'products.filters.draftLabel',
        defaults.filters.draftLabel
      ),
      applyLabel: readMessage(tree, 'products.filters.applyLabel', defaults.filters.applyLabel),
      resetLabel: readMessage(tree, 'products.filters.resetLabel', defaults.filters.resetLabel)
    },
    table: {
      idHeader: readMessage(tree, 'products.table.idHeader', defaults.table.idHeader),
      keyHeader: readMessage(tree, 'products.table.keyHeader', defaults.table.keyHeader),
      nameHeader: readMessage(tree, 'products.table.nameHeader', defaults.table.nameHeader),
      kindHeader: readMessage(tree, 'products.table.kindHeader', defaults.table.kindHeader),
      priceHeader: readMessage(tree, 'products.table.priceHeader', defaults.table.priceHeader),
      stateHeader: readMessage(tree, 'products.table.stateHeader', defaults.table.stateHeader),
      updatedHeader: readMessage(
        tree,
        'products.table.updatedHeader',
        defaults.table.updatedHeader
      ),
      actionsHeader: readMessage(
        tree,
        'products.table.actionsHeader',
        defaults.table.actionsHeader
      ),
      editLabel: readMessage(tree, 'products.table.editLabel', defaults.table.editLabel),
      publishLabel: readMessage(
        tree,
        'products.table.publishLabel',
        defaults.table.publishLabel
      ),
      unpublishLabel: readMessage(
        tree,
        'products.table.unpublishLabel',
        defaults.table.unpublishLabel
      )
    },
    form: {
      productKeyLabel: readMessage(
        tree,
        'products.form.productKeyLabel',
        defaults.form.productKeyLabel
      ),
      productKeyPlaceholder: readMessage(
        tree,
        'products.form.productKeyPlaceholder',
        defaults.form.productKeyPlaceholder
      ),
      nameLabel: readMessage(tree, 'products.form.nameLabel', defaults.form.nameLabel),
      descriptionLabel: readMessage(
        tree,
        'products.form.descriptionLabel',
        defaults.form.descriptionLabel
      ),
      kindLabel: readMessage(tree, 'products.form.kindLabel', defaults.form.kindLabel),
      subscriptionTemplateIdLabel: readMessage(
        tree,
        'products.form.subscriptionTemplateIdLabel',
        defaults.form.subscriptionTemplateIdLabel
      ),
      subscriptionTemplateIdHint: readMessage(
        tree,
        'products.form.subscriptionTemplateIdHint',
        defaults.form.subscriptionTemplateIdHint
      ),
      priceCurrencyLabel: readMessage(
        tree,
        'products.form.priceCurrencyLabel',
        defaults.form.priceCurrencyLabel
      ),
      priceAmountLabel: readMessage(
        tree,
        'products.form.priceAmountLabel',
        defaults.form.priceAmountLabel
      ),
      priceProviderLabel: readMessage(
        tree,
        'products.form.priceProviderLabel',
        defaults.form.priceProviderLabel
      ),
      priceProviderPlaceholder: readMessage(
        tree,
        'products.form.priceProviderPlaceholder',
        defaults.form.priceProviderPlaceholder
      ),
      providerPriceIdLabel: readMessage(
        tree,
        'products.form.providerPriceIdLabel',
        defaults.form.providerPriceIdLabel
      )
    },
    publication: {
      title: readMessage(tree, 'products.publication.title', defaults.publication.title),
      currentStateLabel: readMessage(
        tree,
        'products.publication.currentStateLabel',
        defaults.publication.currentStateLabel
      )
    },
    kindLabels: {
      subscription: readMessage(
        tree,
        'products.kind.subscription',
        defaults.kindLabels.subscription
      ),
      oneTime: readMessage(tree, 'products.kind.oneTime', defaults.kindLabels.oneTime)
    },
    stateLabels: {
      published: readMessage(
        tree,
        'products.state.published',
        defaults.stateLabels.published
      ),
      draft: readMessage(tree, 'products.state.draft', defaults.stateLabels.draft)
    },
    feedback: {
      statusCreated: readMessage(
        tree,
        'products.feedback.status.created',
        defaults.feedback.statusCreated
      ),
      statusUpdated: readMessage(
        tree,
        'products.feedback.status.updated',
        defaults.feedback.statusUpdated
      ),
      statusPublished: readMessage(
        tree,
        'products.feedback.status.published',
        defaults.feedback.statusPublished
      ),
      statusUnpublished: readMessage(
        tree,
        'products.feedback.status.unpublished',
        defaults.feedback.statusUnpublished
      ),
      operationFailedTemplate: readMessage(
        tree,
        'products.feedback.operationFailedTemplate',
        defaults.feedback.operationFailedTemplate
      ),
      errors: Object.fromEntries(
        Object.entries(defaults.feedback.errors).map(([code, fallback]) => [
          code,
          readMessage(tree, `products.feedback.errors.${code}`, fallback)
        ])
      )
    }
  };
}

function formatTemplate(
  template: string,
  values: Record<string, string | number | null | undefined>
) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key) => {
    const value = values[key];
    return value === null || value === undefined ? '' : String(value);
  });
}

async function getCommerceProductsModuleMessages() {
  const messages = await getServerMessages('admin');
  return getCommerceProductsAdminMessages(
    asMessageTree(messages.mod?.[COMMERCE_PRODUCTS_MODULE_ID])
  );
}

function readSearchParam(context: ModuleRouteContext, key: string) {
  const value = context.searchParams?.[key];
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === 'string' ? first.trim() : '';
  }

  return typeof value === 'string' ? value.trim() : '';
}

function normalizeKindFilter(value: string): ProductKindFilter {
  if (value === 'subscription' || value === 'one_time') {
    return value;
  }

  return 'all';
}

function normalizePublicationFilter(value: string): ProductPublicationFilter {
  if (value === 'published' || value === 'draft') {
    return value;
  }

  return 'all';
}

function buildProductsListPath(filters: {
  kind: ProductKindFilter;
  publication: ProductPublicationFilter;
}) {
  const params = new URLSearchParams();
  if (filters.kind !== 'all') {
    params.set('kind', filters.kind);
  }
  if (filters.publication !== 'all') {
    params.set('published', filters.publication);
  }

  const query = params.toString();
  return query
    ? `${COMMERCE_PRODUCTS_ADMIN_ALIAS}?${query}`
    : COMMERCE_PRODUCTS_ADMIN_ALIAS;
}

function formatDate(value: Date) {
  return value.toISOString().replace('T', ' ').slice(0, 16);
}

function formatMoney(currency: string, amountInCents: number) {
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

function resolveStatusMessage(
  status: string,
  messages: CommerceProductsAdminMessages
) {
  if (status === 'created') {
    return messages.feedback.statusCreated;
  }

  if (status === 'updated') {
    return messages.feedback.statusUpdated;
  }

  if (status === 'published') {
    return messages.feedback.statusPublished;
  }

  if (status === 'unpublished') {
    return messages.feedback.statusUnpublished;
  }

  return null;
}

function resolveErrorMessage(
  errorCode: string,
  messages: CommerceProductsAdminMessages
) {
  if (!errorCode) {
    return null;
  }

  const message =
    messages.feedback.errors[errorCode] ||
    formatTemplate(messages.feedback.operationFailedTemplate, { code: errorCode });

  return message;
}

function renderFeedback(
  context: ModuleRouteContext,
  messages: CommerceProductsAdminMessages
) {
  const status = readSearchParam(context, 'status');
  const error = readSearchParam(context, 'error');
  const statusMessage = resolveStatusMessage(status, messages);
  const errorMessage = resolveErrorMessage(error, messages);

  if (!statusMessage && !errorMessage) {
    return null;
  }

  return (
    <section className="space-y-2">
      {statusMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {statusMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {errorMessage}
        </div>
      ) : null}
    </section>
  );
}

function renderKindLabel(
  product: CommerceProduct,
  messages: CommerceProductsAdminMessages
) {
  return product.kind === 'subscription'
    ? messages.kindLabels.subscription
    : messages.kindLabels.oneTime;
}

function renderPublicationLabel(
  product: CommerceProduct,
  messages: CommerceProductsAdminMessages
) {
  if (product.publication?.isPublished) {
    return messages.stateLabels.published;
  }

  return messages.stateLabels.draft;
}

function matchesFilters(
  product: CommerceProduct,
  filters: {
    kind: ProductKindFilter;
    publication: ProductPublicationFilter;
  }
) {
  if (filters.kind !== 'all' && product.kind !== filters.kind) {
    return false;
  }

  if (filters.publication === 'published' && !product.publication?.isPublished) {
    return false;
  }

  if (filters.publication === 'draft' && product.publication?.isPublished) {
    return false;
  }

  return true;
}

export async function renderCommerceProductsAdminHomePage(
  context: ModuleRouteContext
) {
  const moduleMessages = await getCommerceProductsModuleMessages();
  const filters = {
    kind: normalizeKindFilter(readSearchParam(context, 'kind')),
    publication: normalizePublicationFilter(readSearchParam(context, 'published'))
  };
  const currentPath = buildProductsListPath(filters);
  const products = (await listCommerceProducts({ limit: 300 })).filter((product) =>
    matchesFilters(product, filters)
  );
  const themeSelection = await getThemeSelectionForArea('admin');
  const themeId = themeSelection?.themeKey ?? null;

  const filtersFallback = (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <form method="GET" action={COMMERCE_PRODUCTS_ADMIN_ALIAS}>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-zinc-700">
              {moduleMessages.filters.kindLabel}
            </span>
            <select
              name="kind"
              defaultValue={filters.kind}
              className="h-10 w-full rounded-md border border-zinc-300 px-3"
            >
              <option value="all">{moduleMessages.filters.allLabel}</option>
              <option value="subscription">
                {moduleMessages.filters.subscriptionLabel}
              </option>
              <option value="one_time">{moduleMessages.filters.oneTimeLabel}</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-zinc-700">
              {moduleMessages.filters.publicationLabel}
            </span>
            <select
              name="published"
              defaultValue={filters.publication}
              className="h-10 w-full rounded-md border border-zinc-300 px-3"
            >
              <option value="all">{moduleMessages.filters.allLabel}</option>
              <option value="published">
                {moduleMessages.filters.publishedLabel}
              </option>
              <option value="draft">{moduleMessages.filters.draftLabel}</option>
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center rounded-md bg-zinc-900 px-4 text-sm text-white"
            >
              {moduleMessages.filters.applyLabel}
            </button>
            <Link
              href={COMMERCE_PRODUCTS_ADMIN_ALIAS}
              className="inline-flex h-10 items-center rounded-md border border-zinc-300 px-4 text-sm text-zinc-700"
            >
              {moduleMessages.filters.resetLabel}
            </Link>
          </div>
        </div>
      </form>
    </section>
  );
  const filtersSection = !themeId ? (
    filtersFallback
  ) : (
    <ThemeCodeTemplate
      id="section.admin.products.filters"
      themeId={themeId}
      data={{
        hasFilters: filters.kind !== 'all' || filters.publication !== 'all',
        selectedType: filters.kind,
        selectedStatus: filters.publication
      }}
      fallback={filtersFallback}
    >
      {filtersFallback}
    </ThemeCodeTemplate>
  );

  const tableFallback = (
    <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
      {products.length === 0 ? (
        <div className="px-4 py-8 text-sm text-zinc-600">
          {moduleMessages.list.empty}
        </div>
      ) : (
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50">
            <tr className="text-zinc-600">
              <th className="px-4 py-3 font-medium">{moduleMessages.table.idHeader}</th>
              <th className="px-4 py-3 font-medium">{moduleMessages.table.keyHeader}</th>
              <th className="px-4 py-3 font-medium">{moduleMessages.table.nameHeader}</th>
              <th className="px-4 py-3 font-medium">{moduleMessages.table.kindHeader}</th>
              <th className="px-4 py-3 font-medium">{moduleMessages.table.priceHeader}</th>
              <th className="px-4 py-3 font-medium">{moduleMessages.table.stateHeader}</th>
              <th className="px-4 py-3 font-medium">{moduleMessages.table.updatedHeader}</th>
              <th className="px-4 py-3 font-medium">{moduleMessages.table.actionsHeader}</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const isPublished = Boolean(product.publication?.isPublished);
              const editPath = `${COMMERCE_PRODUCTS_ADMIN_ALIAS}/${product.id}/edit`;
              const priceLabel = product.currentPrice
                ? formatMoney(
                    product.currentPrice.currency,
                    product.currentPrice.unitAmountCents
                  )
                : '-';

              return (
                <tr
                  key={product.id}
                  className="border-b border-zinc-100 text-zinc-800 last:border-0"
                >
                  <td className="px-4 py-3 font-mono text-xs">{product.id}</td>
                  <td className="px-4 py-3 font-mono text-xs">{product.productKey}</td>
                  <td className="px-4 py-3">{product.name}</td>
                  <td className="px-4 py-3">
                    {renderKindLabel(product, moduleMessages)}
                  </td>
                  <td className="px-4 py-3">{priceLabel}</td>
                  <td className="px-4 py-3">
                    {renderPublicationLabel(product, moduleMessages)}
                  </td>
                  <td className="px-4 py-3">{formatDate(product.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={editPath}
                        className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-3 text-xs"
                      >
                        {moduleMessages.table.editLabel}
                      </Link>
                      <form
                        action={
                          isPublished
                            ? unpublishCommerceProductAdminAction
                            : publishCommerceProductAdminAction
                        }
                      >
                        <input type="hidden" name="productId" value={product.id} />
                        <input type="hidden" name="returnTo" value={currentPath} />
                        <button
                          type="submit"
                          className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-3 text-xs"
                        >
                          {isPublished
                            ? moduleMessages.table.unpublishLabel
                            : moduleMessages.table.publishLabel}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
  const tableSection = !themeId ? (
    tableFallback
  ) : (
    <ThemeCodeTemplate
      id="section.admin.products.table"
      themeId={themeId}
      data={{
        total: products.length,
        columns: ['id', 'key', 'name', 'kind', 'price', 'state', 'updated', 'actions'],
        rowCount: products.length
      }}
      fallback={tableFallback}
    >
      {tableFallback}
    </ThemeCodeTemplate>
  );

  const fallbackPage = (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            {moduleMessages.list.eyebrow}
          </p>
          <h1 className="text-2xl font-semibold text-zinc-900">{moduleMessages.list.title}</h1>
          <p className="text-sm text-zinc-600">{moduleMessages.list.description}</p>
        </div>
        <Link
          href={`${COMMERCE_PRODUCTS_ADMIN_ALIAS}/create`}
          className="inline-flex h-10 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white"
        >
          {moduleMessages.list.createLabel}
        </Link>
      </header>

      {renderFeedback(context, moduleMessages)}
      {filtersSection}
      {tableSection}
    </main>
  );

  if (!themeId) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      id="page.admin.products"
      themeId={themeId}
      data={{
        title: moduleMessages.list.title,
        description: moduleMessages.list.description,
        createHref: `${COMMERCE_PRODUCTS_ADMIN_ALIAS}/create`,
        createLabel: moduleMessages.list.createLabel
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}

export async function renderCommerceProductsAdminCreatePage(
  context: ModuleRouteContext
) {
  const moduleMessages = await getCommerceProductsModuleMessages();
  const themeSelection = await getThemeSelectionForArea('admin');
  const themeId = themeSelection?.themeKey ?? null;
  const formFallback = (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <form action={createCommerceProductAdminAction} className="space-y-4">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-700">
            {moduleMessages.form.productKeyLabel}
          </span>
          <input
            name="productKey"
            required
            maxLength={120}
            placeholder={moduleMessages.form.productKeyPlaceholder}
            className="h-10 w-full rounded-md border border-zinc-300 px-3"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-700">{moduleMessages.form.nameLabel}</span>
          <input
            name="name"
            required
            maxLength={160}
            className="h-10 w-full rounded-md border border-zinc-300 px-3"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-700">
            {moduleMessages.form.descriptionLabel}
          </span>
          <textarea
            name="description"
            rows={4}
            className="w-full rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-700">{moduleMessages.form.kindLabel}</span>
          <select
            name="kind"
            defaultValue="one_time"
            className="h-10 w-full rounded-md border border-zinc-300 px-3"
          >
            <option value="one_time">{moduleMessages.kindLabels.oneTime}</option>
            <option value="subscription">{moduleMessages.kindLabels.subscription}</option>
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-700">
            {moduleMessages.form.subscriptionTemplateIdLabel}
          </span>
          <input
            name="subscriptionTemplateId"
            type="number"
            min={1}
            className="h-10 w-full rounded-md border border-zinc-300 px-3"
          />
          <span className="text-xs text-zinc-500">
            {moduleMessages.form.subscriptionTemplateIdHint}
          </span>
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-zinc-700">
              {moduleMessages.form.priceCurrencyLabel}
            </span>
            <input
              name="priceCurrency"
              defaultValue="USD"
              maxLength={10}
              className="h-10 w-full rounded-md border border-zinc-300 px-3"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-zinc-700">
              {moduleMessages.form.priceAmountLabel}
            </span>
            <input
              name="priceUnitAmountCents"
              type="number"
              min={0}
              className="h-10 w-full rounded-md border border-zinc-300 px-3"
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-zinc-700">
              {moduleMessages.form.priceProviderLabel}
            </span>
            <input
              name="priceProvider"
              maxLength={30}
              placeholder={moduleMessages.form.priceProviderPlaceholder}
              className="h-10 w-full rounded-md border border-zinc-300 px-3"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-zinc-700">
              {moduleMessages.form.providerPriceIdLabel}
            </span>
            <input
              name="priceProviderId"
              maxLength={255}
              className="h-10 w-full rounded-md border border-zinc-300 px-3"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white"
          >
            {moduleMessages.create.submitLabel}
          </button>
          <Link
            href={COMMERCE_PRODUCTS_ADMIN_ALIAS}
            className="inline-flex h-10 items-center rounded-md border border-zinc-300 px-4 text-sm text-zinc-700"
          >
            {moduleMessages.create.backLabel}
          </Link>
        </div>
      </form>
    </section>
  );
  const formSection = !themeId ? (
    formFallback
  ) : (
    <ThemeCodeTemplate
      id="section.admin.products.form"
      themeId={themeId}
      data={{
        mode: 'create',
        productType: 'one_time',
        provider: null,
        canPublish: false
      }}
      fallback={formFallback}
    >
      {formFallback}
    </ThemeCodeTemplate>
  );
  const fallbackPage = (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          {moduleMessages.list.eyebrow}
        </p>
        <h1 className="text-2xl font-semibold text-zinc-900">{moduleMessages.create.title}</h1>
        <p className="text-sm text-zinc-600">{moduleMessages.create.description}</p>
      </header>

      {renderFeedback(context, moduleMessages)}
      {formSection}
    </main>
  );

  if (!themeId) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      id="page.admin.products.create"
      themeId={themeId}
      data={{
        title: moduleMessages.create.title,
        description: moduleMessages.create.description,
        submitLabel: moduleMessages.create.submitLabel
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}

export async function renderCommerceProductsAdminEditPage({
  context,
  productId
}: {
  context: ModuleRouteContext;
  productId: number;
}) {
  const moduleMessages = await getCommerceProductsModuleMessages();
  const product = await getCommerceProductById(productId);
  if (!product) {
    return (
      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {moduleMessages.notFound.title}
        </h1>
        <p className="text-sm text-zinc-600">
          {formatTemplate(moduleMessages.notFound.descriptionTemplate, { productId })}
        </p>
        <Link
          href={COMMERCE_PRODUCTS_ADMIN_ALIAS}
          className="inline-flex h-10 items-center rounded-md bg-zinc-900 px-4 text-sm text-white"
        >
          {moduleMessages.notFound.backLabel}
        </Link>
      </main>
    );
  }

  const editPath = `${COMMERCE_PRODUCTS_ADMIN_ALIAS}/${product.id}/edit`;
  const isPublished = Boolean(product.publication?.isPublished);
  const themeSelection = await getThemeSelectionForArea('admin');
  const themeId = themeSelection?.themeKey ?? null;
  const formFallback = (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <form action={updateCommerceProductAdminAction} className="space-y-4">
        <input type="hidden" name="productId" value={product.id} />

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-700">
            {moduleMessages.form.productKeyLabel}
          </span>
          <input
            name="productKey"
            required
            maxLength={120}
            defaultValue={product.productKey}
            className="h-10 w-full rounded-md border border-zinc-300 px-3"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-700">{moduleMessages.form.nameLabel}</span>
          <input
            name="name"
            required
            maxLength={160}
            defaultValue={product.name}
            className="h-10 w-full rounded-md border border-zinc-300 px-3"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-700">
            {moduleMessages.form.descriptionLabel}
          </span>
          <textarea
            name="description"
            rows={4}
            defaultValue={product.description || ''}
            className="w-full rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-700">{moduleMessages.form.kindLabel}</span>
          <select
            name="kind"
            defaultValue={product.kind}
            className="h-10 w-full rounded-md border border-zinc-300 px-3"
          >
            <option value="one_time">{moduleMessages.kindLabels.oneTime}</option>
            <option value="subscription">{moduleMessages.kindLabels.subscription}</option>
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-700">
            {moduleMessages.form.subscriptionTemplateIdLabel}
          </span>
          <input
            name="subscriptionTemplateId"
            type="number"
            min={1}
            defaultValue={product.subscriptionTemplateId || undefined}
            className="h-10 w-full rounded-md border border-zinc-300 px-3"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-zinc-700">
              {moduleMessages.form.priceCurrencyLabel}
            </span>
            <input
              name="priceCurrency"
              defaultValue={product.currentPrice?.currency || ''}
              maxLength={10}
              className="h-10 w-full rounded-md border border-zinc-300 px-3"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-zinc-700">
              {moduleMessages.form.priceAmountLabel}
            </span>
            <input
              name="priceUnitAmountCents"
              type="number"
              min={0}
              defaultValue={product.currentPrice?.unitAmountCents || undefined}
              className="h-10 w-full rounded-md border border-zinc-300 px-3"
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-zinc-700">
              {moduleMessages.form.priceProviderLabel}
            </span>
            <input
              name="priceProvider"
              defaultValue={product.currentPrice?.provider || ''}
              maxLength={30}
              className="h-10 w-full rounded-md border border-zinc-300 px-3"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-zinc-700">
              {moduleMessages.form.providerPriceIdLabel}
            </span>
            <input
              name="priceProviderId"
              defaultValue={product.currentPrice?.providerPriceId || ''}
              maxLength={255}
              className="h-10 w-full rounded-md border border-zinc-300 px-3"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white"
          >
            {moduleMessages.edit.submitLabel}
          </button>
          <Link
            href={COMMERCE_PRODUCTS_ADMIN_ALIAS}
            className="inline-flex h-10 items-center rounded-md border border-zinc-300 px-4 text-sm text-zinc-700"
          >
            {moduleMessages.edit.backLabel}
          </Link>
        </div>
      </form>
    </section>
  );
  const formSection = !themeId ? (
    formFallback
  ) : (
    <ThemeCodeTemplate
      id="section.admin.products.form"
      themeId={themeId}
      data={{
        mode: 'edit',
        productType: product.kind,
        provider: product.currentPrice?.provider || null,
        canPublish: true
      }}
      fallback={formFallback}
    >
      {formFallback}
    </ThemeCodeTemplate>
  );
  const fallbackPage = (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          {moduleMessages.list.eyebrow}
        </p>
        <h1 className="text-2xl font-semibold text-zinc-900">
          {moduleMessages.edit.titlePrefix}
          {product.id}
        </h1>
        <p className="text-sm text-zinc-600">{moduleMessages.edit.description}</p>
      </header>

      {renderFeedback(context, moduleMessages)}
      {formSection}

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-900">
          {moduleMessages.publication.title}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          {moduleMessages.publication.currentStateLabel}:{' '}
          {isPublished
            ? moduleMessages.stateLabels.published
            : moduleMessages.stateLabels.draft}
        </p>
        <div className="mt-3 flex gap-2">
          <form
            action={
              isPublished
                ? unpublishCommerceProductAdminAction
                : publishCommerceProductAdminAction
            }
          >
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="returnTo" value={editPath} />
            <button
              type="submit"
              className="inline-flex h-10 items-center rounded-md border border-zinc-300 px-4 text-sm text-zinc-800"
            >
              {isPublished
                ? moduleMessages.table.unpublishLabel
                : moduleMessages.table.publishLabel}
            </button>
          </form>
        </div>
      </section>
    </main>
  );

  if (!themeId) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      id="page.admin.products.edit"
      themeId={themeId}
      data={{
        title: `${moduleMessages.edit.titlePrefix}${product.id}`,
        description: moduleMessages.edit.description,
        productId: product.id,
        submitLabel: moduleMessages.edit.submitLabel
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}

export function parseCommerceProductsAdminProductId(value: string) {
  return parseProductId(value);
}
