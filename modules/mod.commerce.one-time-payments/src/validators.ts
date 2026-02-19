import type {
  OneTimeCheckoutMode,
  CreateOneTimeCheckoutIntentInput,
  OneTimeCheckoutLineItemInput,
  OneTimeCheckoutProvider,
  OneTimeIntentValidationErrorCode,
  OneTimeIntentTargetType,
  OneTimeIntentValidationResult
} from './types';

function success<T>(value: T): OneTimeIntentValidationResult<T> {
  return {
    ok: true,
    value
  };
}

function failure<T>(
  code: OneTimeIntentValidationErrorCode,
  message: string
): OneTimeIntentValidationResult<T> {
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
  if (value === null || value === undefined) {
    return null;
  }

  return normalizeText(value, maxLength);
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

function normalizeProvider(value: unknown): OneTimeCheckoutProvider | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'stripe') {
    return 'stripe';
  }
  if (normalized === 'paypal') {
    return 'paypal';
  }

  return null;
}

function normalizeCheckoutMode({
  value
}: {
  value: unknown;
}): OneTimeCheckoutMode | null {
  if (value === undefined || value === null) {
    return 'core_checkout';
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'core_checkout') {
    return normalized;
  }

  return null;
}

function normalizeTargetType(value: unknown): OneTimeIntentTargetType | null {
  if (value === undefined || value === null) {
    return 'user';
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'user' || normalized === 'team') {
    return normalized;
  }

  return null;
}

function normalizeMetadata(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  return value;
}

function normalizeLineItems(
  value: unknown
): OneTimeCheckoutLineItemInput[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  if (value.length === 0 || value.length > 100) {
    return [];
  }

  const normalized: OneTimeCheckoutLineItemInput[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) {
      return null;
    }

    const productId = normalizePositiveInt(entry.productId);
    if (!productId) {
      return null;
    }

    const quantity = hasOwn(entry, 'quantity')
      ? normalizePositiveInt(entry.quantity)
      : 1;
    if (!quantity || quantity > 100) {
      return null;
    }

    normalized.push({
      productId,
      quantity
    });
  }

  return normalized;
}

export function parseOneTimeIntentId(
  value: unknown
): OneTimeIntentValidationResult<number> {
  const intentId = normalizePositiveInt(value);
  if (!intentId) {
    return failure('invalid_intent_id', 'Invalid intent id.');
  }

  return success(intentId);
}

export function parseCreateOneTimeCheckoutIntentInput(
  body: unknown
): OneTimeIntentValidationResult<CreateOneTimeCheckoutIntentInput> {
  if (!isRecord(body)) {
    return failure('invalid_json_body', 'Invalid JSON body.');
  }

  let lineItems: OneTimeCheckoutLineItemInput[] | null = null;
  if (hasOwn(body, 'lineItems')) {
    const parsedLineItems = normalizeLineItems(body.lineItems);
    if (!parsedLineItems) {
      return failure(
        'invalid_line_items',
        'Field "lineItems" must be an array of { productId, quantity? } entries.'
      );
    }
    if (parsedLineItems.length === 0) {
      return failure(
        'invalid_line_items',
        'Field "lineItems" must contain 1-100 items when provided.'
      );
    }

    lineItems = parsedLineItems;
  }

  let productId: number | null = null;
  let quantity: number | null = null;
  if (!lineItems) {
    productId = normalizePositiveInt(body.productId);
    if (!productId) {
      return failure(
        'invalid_product_id',
        'Field "productId" is required and must be a positive integer when "lineItems" is not provided.'
      );
    }

    quantity = hasOwn(body, 'quantity')
      ? normalizePositiveInt(body.quantity)
      : 1;
    if (!quantity) {
      return failure(
        'invalid_quantity',
        'Field "quantity" must be a positive integer when provided.'
      );
    }

    if (quantity > 100) {
      return failure(
        'invalid_quantity',
        'Field "quantity" must be <= 100.'
      );
    }
  }

  const parsedProvider = normalizeProvider(body.provider);
  if (body.provider !== undefined && body.provider !== null && !parsedProvider) {
    return failure(
      'invalid_provider',
      'Field "provider" must be "stripe" or "paypal" when provided.'
    );
  }
  if (parsedProvider) {
    return failure(
      'invalid_provider',
      'Field "provider" is no longer supported. Select payment method during checkout.'
    );
  }
  const checkoutMode = normalizeCheckoutMode({
    value: body.checkoutMode
  });
  if (!checkoutMode) {
    return failure(
      'invalid_checkout_mode',
      'Field "checkoutMode" must be "core_checkout" when provided.'
    );
  }
  const provider = null;

  const targetType = normalizeTargetType(body.targetType);
  if (!targetType) {
    return failure(
      'invalid_target_type',
      'Field "targetType" must be "user" or "team" when provided.'
    );
  }

  let targetTeamId: number | null = null;
  if (targetType === 'team') {
    targetTeamId = normalizePositiveInt(body.targetTeamId);
    if (!targetTeamId) {
      return failure(
        'target_team_required',
        'Field "targetTeamId" is required when targetType is "team".'
      );
    }
  } else if (hasOwn(body, 'targetTeamId') && body.targetTeamId !== null) {
    return failure(
      'target_team_not_allowed_for_user_target',
      'Field "targetTeamId" is only allowed when targetType is "team".'
    );
  }

  const idempotencyKey = normalizeNullableText(body.idempotencyKey, 160);
  if (
    body.idempotencyKey !== undefined &&
    body.idempotencyKey !== null &&
    !idempotencyKey
  ) {
    return failure(
      'invalid_idempotency_key',
      'Field "idempotencyKey" must be a non-empty string when provided.'
    );
  }

  const metadata = normalizeMetadata(body.metadata);
  if (
    body.metadata !== undefined &&
    body.metadata !== null &&
    metadata === null
  ) {
    return failure(
      'invalid_metadata',
      'Field "metadata" must be an object or null when provided.'
    );
  }

  const successUrl = normalizeNullableText(body.successUrl, 2000);
  if (
    body.successUrl !== undefined &&
    body.successUrl !== null &&
    !successUrl
  ) {
    return failure(
      'invalid_success_url',
      'Field "successUrl" must be a non-empty string when provided.'
    );
  }

  const cancelUrl = normalizeNullableText(body.cancelUrl, 2000);
  if (
    body.cancelUrl !== undefined &&
    body.cancelUrl !== null &&
    !cancelUrl
  ) {
    return failure(
      'invalid_cancel_url',
      'Field "cancelUrl" must be a non-empty string when provided.'
    );
  }

  return success({
    productId,
    quantity,
    lineItems,
    provider,
    checkoutMode,
    targetType,
    targetTeamId,
    idempotencyKey: idempotencyKey || null,
    metadata: (metadata as Record<string, unknown> | null | undefined) ?? null,
    successUrl: successUrl || null,
    cancelUrl: cancelUrl || null
  });
}
