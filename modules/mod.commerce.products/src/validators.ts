import type {
  CommerceProductKind,
  CommerceProductPriceInput,
  CommerceProductPublicationPayload,
  CommerceProductValidationErrorCode,
  CommerceProductValidationResult,
  CreateCommerceProductInput,
  UpdateCommerceProductInput
} from './types';

const PRODUCT_KEY_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

function success<T>(value: T): CommerceProductValidationResult<T> {
  return {
    ok: true,
    value
  };
}

function failure<T>(
  code: CommerceProductValidationErrorCode,
  message: string
): CommerceProductValidationResult<T> {
  return {
    ok: false,
    code,
    message
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(source: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(source, key);
}

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function normalizeNullableText(value: unknown, maxLength: number) {
  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function normalizeProductKey(value: unknown) {
  const normalized = normalizeText(value, 120)?.toLowerCase() ?? null;
  if (!normalized || !PRODUCT_KEY_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeProductKind(value: unknown): CommerceProductKind | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'subscription' || normalized === 'one_time') {
    return normalized;
  }

  return null;
}

function normalizePositiveInt(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function normalizeCurrency(value: unknown) {
  const normalized = normalizeText(value, 10)?.toUpperCase() ?? null;
  if (!normalized || normalized.length < 3) {
    return null;
  }

  if (!/^[A-Z]{3,10}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeAmount(value: unknown) {
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 0) {
      return null;
    }
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return null;
    }
    return parsed;
  }

  return null;
}

function normalizeMetadata(value: unknown) {
  if (value === null) {
    return null;
  }

  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    return null;
  }

  return value;
}

function parsePriceInput(
  value: unknown
): CommerceProductValidationResult<CommerceProductPriceInput> {
  if (!isRecord(value)) {
    return failure('invalid_price', 'Field "price" must be an object.');
  }

  const currency = normalizeCurrency(value.currency);
  if (!currency) {
    return failure(
      'invalid_price_currency',
      'Field "price.currency" must be a valid currency code.'
    );
  }

  const unitAmountCents = normalizeAmount(value.unitAmountCents);
  if (unitAmountCents === null) {
    return failure(
      'invalid_price_amount',
      'Field "price.unitAmountCents" must be an integer >= 0.'
    );
  }

  const provider = normalizeText(value.provider, 30);
  if (value.provider !== undefined && value.provider !== null && !provider) {
    return failure(
      'invalid_price_provider',
      'Field "price.provider" must be a non-empty string when provided.'
    );
  }

  const providerPriceId = normalizeText(value.providerPriceId, 255);
  if (
    value.providerPriceId !== undefined &&
    value.providerPriceId !== null &&
    !providerPriceId
  ) {
    return failure(
      'invalid_price_provider_id',
      'Field "price.providerPriceId" must be a non-empty string when provided.'
    );
  }

  const metadata = normalizeMetadata(value.metadata);
  if (value.metadata !== undefined && metadata === null) {
    return failure(
      'invalid_metadata',
      'Field "price.metadata" must be an object or null when provided.'
    );
  }

  return success({
    currency,
    unitAmountCents,
    provider: provider || null,
    providerPriceId: providerPriceId || null,
    metadata: (metadata as Record<string, unknown> | null | undefined) ?? null
  });
}

export function parseProductId(
  value: unknown
): CommerceProductValidationResult<number> {
  const parsed = normalizePositiveInt(value);
  if (!parsed) {
    return failure('invalid_product_id', 'Invalid product id.');
  }

  return success(parsed);
}

export function parseCreateCommerceProductInput(
  body: unknown
): CommerceProductValidationResult<CreateCommerceProductInput> {
  if (!isRecord(body)) {
    return failure('invalid_json_body', 'Invalid JSON body.');
  }

  const productKey = normalizeProductKey(body.productKey);
  if (!productKey) {
    return failure(
      'invalid_product_key',
      'Field "productKey" is required and must be slug-compatible.'
    );
  }

  const name = normalizeText(body.name, 160);
  if (!name) {
    return failure('invalid_name', 'Field "name" is required.');
  }

  const kind = normalizeProductKind(body.kind);
  if (!kind) {
    return failure(
      'invalid_kind',
      'Field "kind" must be "subscription" or "one_time".'
    );
  }

  if (body.description !== undefined) {
    if (
      body.description !== null &&
      (typeof body.description !== 'string' || !body.description.trim())
    ) {
      return failure(
        'invalid_description',
        'Field "description" must be a non-empty string or null when provided.'
      );
    }
  }

  const description = normalizeNullableText(body.description, 2000);

  const metadata = normalizeMetadata(body.metadata);
  if (body.metadata !== undefined && metadata === null) {
    return failure(
      'invalid_metadata',
      'Field "metadata" must be an object or null when provided.'
    );
  }

  const subscriptionTemplateId = normalizePositiveInt(body.subscriptionTemplateId);
  if (
    body.subscriptionTemplateId !== undefined &&
    body.subscriptionTemplateId !== null &&
    !subscriptionTemplateId
  ) {
    return failure(
      'invalid_subscription_template_id',
      'Field "subscriptionTemplateId" must be a positive integer when provided.'
    );
  }

  let initialPrice: CommerceProductPriceInput | null = null;
  if (kind === 'one_time') {
    if (!hasOwn(body, 'price')) {
      return failure(
        'one_time_price_required',
        'Field "price" is required for one_time products.'
      );
    }

    const parsedPrice = parsePriceInput(body.price);
    if (!parsedPrice.ok) {
      return parsedPrice;
    }
    initialPrice = parsedPrice.value;

    if (subscriptionTemplateId) {
      return failure(
        'subscription_template_not_allowed_for_one_time',
        'subscriptionTemplateId is not allowed for one_time products.'
      );
    }
  } else {
    if (!subscriptionTemplateId) {
      return failure(
        'subscription_template_required',
        'subscriptionTemplateId is required for subscription products.'
      );
    }

    if (hasOwn(body, 'price')) {
      return failure(
        'price_not_allowed_for_subscription',
        'Field "price" is not allowed for subscription products.'
      );
    }
  }

  return success({
    productKey,
    name,
    description: description ?? null,
    kind,
    subscriptionTemplateId: subscriptionTemplateId ?? null,
    metadata: (metadata as Record<string, unknown> | null | undefined) ?? null,
    initialPrice
  });
}

export function parseUpdateCommerceProductInput(
  body: unknown
): CommerceProductValidationResult<UpdateCommerceProductInput> {
  if (!isRecord(body)) {
    return failure('invalid_json_body', 'Invalid JSON body.');
  }

  const patch: UpdateCommerceProductInput = {};
  let touched = false;

  if (hasOwn(body, 'productKey')) {
    const productKey = normalizeProductKey(body.productKey);
    if (!productKey) {
      return failure(
        'invalid_product_key',
        'Field "productKey" must be slug-compatible when provided.'
      );
    }
    patch.productKey = productKey;
    touched = true;
  }

  if (hasOwn(body, 'name')) {
    const name = normalizeText(body.name, 160);
    if (!name) {
      return failure(
        'invalid_name',
        'Field "name" must be a non-empty string when provided.'
      );
    }
    patch.name = name;
    touched = true;
  }

  if (hasOwn(body, 'description')) {
    if (
      body.description !== null &&
      (typeof body.description !== 'string' || !body.description.trim())
    ) {
      return failure(
        'invalid_description',
        'Field "description" must be a non-empty string or null when provided.'
      );
    }
    patch.description = normalizeNullableText(body.description, 2000);
    touched = true;
  }

  if (hasOwn(body, 'kind')) {
    const kind = normalizeProductKind(body.kind);
    if (!kind) {
      return failure(
        'invalid_kind',
        'Field "kind" must be "subscription" or "one_time".'
      );
    }
    patch.kind = kind;
    touched = true;
  }

  if (hasOwn(body, 'subscriptionTemplateId')) {
    if (body.subscriptionTemplateId === null) {
      patch.subscriptionTemplateId = null;
      touched = true;
    } else {
      const subscriptionTemplateId = normalizePositiveInt(body.subscriptionTemplateId);
      if (!subscriptionTemplateId) {
        return failure(
          'invalid_subscription_template_id',
          'Field "subscriptionTemplateId" must be a positive integer or null.'
        );
      }
      patch.subscriptionTemplateId = subscriptionTemplateId;
      touched = true;
    }
  }

  if (hasOwn(body, 'metadata')) {
    const metadata = normalizeMetadata(body.metadata);
    if (metadata === null && body.metadata !== null) {
      return failure(
        'invalid_metadata',
        'Field "metadata" must be an object or null when provided.'
      );
    }
    patch.metadata = (metadata as Record<string, unknown> | null | undefined) ?? null;
    touched = true;
  }

  if (hasOwn(body, 'price')) {
    const parsedPrice = parsePriceInput(body.price);
    if (!parsedPrice.ok) {
      return parsedPrice;
    }
    patch.nextPrice = parsedPrice.value;
    touched = true;
  }

  if (!touched) {
    return failure(
      'no_updates_provided',
      'No valid fields were provided for update.'
    );
  }

  if (patch.kind === 'subscription' && patch.nextPrice) {
    return failure(
      'price_not_allowed_for_subscription',
      'Field "price" is not allowed when kind is "subscription".'
    );
  }

  if (patch.kind === 'one_time' && patch.subscriptionTemplateId) {
    return failure(
      'subscription_template_not_allowed_for_one_time',
      'subscriptionTemplateId is not allowed when kind is "one_time".'
    );
  }

  return success(patch);
}

export function parseCommerceProductPublicationPayload(
  body: unknown
): CommerceProductValidationResult<CommerceProductPublicationPayload> {
  if (body === null || body === undefined) {
    return success({});
  }

  if (!isRecord(body)) {
    return failure('invalid_json_body', 'Invalid JSON body.');
  }

  if (!hasOwn(body, 'metadata')) {
    return success({});
  }

  const metadata = normalizeMetadata(body.metadata);
  if (metadata === null && body.metadata !== null) {
    return failure(
      'invalid_metadata',
      'Field "metadata" must be an object or null when provided.'
    );
  }

  return success({
    metadata: (metadata as Record<string, unknown> | null | undefined) ?? null
  });
}
