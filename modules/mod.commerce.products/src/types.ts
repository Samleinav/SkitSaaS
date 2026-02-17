export const COMMERCE_PRODUCT_KINDS = ['subscription', 'one_time'] as const;

export type CommerceProductKind = (typeof COMMERCE_PRODUCT_KINDS)[number];

export type CommerceProductPriceInput = {
  currency: string;
  unitAmountCents: number;
  provider: string | null;
  providerPriceId: string | null;
  metadata: Record<string, unknown> | null;
};

export type CreateCommerceProductInput = {
  productKey: string;
  name: string;
  description: string | null;
  kind: CommerceProductKind;
  subscriptionTemplateId: number | null;
  metadata: Record<string, unknown> | null;
  initialPrice: CommerceProductPriceInput | null;
};

export type UpdateCommerceProductInput = {
  productKey?: string;
  name?: string;
  description?: string | null;
  kind?: CommerceProductKind;
  subscriptionTemplateId?: number | null;
  metadata?: Record<string, unknown> | null;
  nextPrice?: CommerceProductPriceInput;
};

export type CommerceProductPublicationPayload = {
  metadata?: Record<string, unknown> | null;
};

export type CommerceProductPrice = {
  id: number;
  productId: number;
  currency: string;
  unitAmountCents: number;
  isActive: boolean;
  provider: string | null;
  providerPriceId: string | null;
  metadata: Record<string, unknown> | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CommerceProductPublication = {
  id: number;
  productId: number;
  isPublished: boolean;
  publishedAt: Date | null;
  unpublishedAt: Date | null;
  publishedByUserId: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CommerceProduct = {
  id: number;
  productKey: string;
  name: string;
  description: string | null;
  kind: CommerceProductKind;
  subscriptionTemplateId: number | null;
  metadata: Record<string, unknown> | null;
  createdByUserId: number | null;
  updatedByUserId: number | null;
  createdAt: Date;
  updatedAt: Date;
  currentPrice: CommerceProductPrice | null;
  publication: CommerceProductPublication | null;
};

export type CommerceProductMutationErrorCode =
  | 'not_found'
  | 'duplicate_product_key'
  | 'subscription_template_required'
  | 'subscription_template_not_found'
  | 'subscription_template_not_allowed_for_one_time'
  | 'one_time_price_required'
  | 'price_not_allowed_for_subscription'
  | 'one_time_product_missing_active_price'
  | 'operation_failed';

export type CommerceProductMutationResult =
  | {
      ok: true;
      product: CommerceProduct;
    }
  | {
      ok: false;
      code: CommerceProductMutationErrorCode;
      message: string;
    };

export type CommerceProductValidationErrorCode =
  | 'invalid_json_body'
  | 'invalid_product_id'
  | 'invalid_product_key'
  | 'invalid_name'
  | 'invalid_kind'
  | 'invalid_subscription_template_id'
  | 'invalid_description'
  | 'invalid_metadata'
  | 'invalid_price'
  | 'invalid_price_currency'
  | 'invalid_price_amount'
  | 'invalid_price_provider'
  | 'invalid_price_provider_id'
  | 'one_time_price_required'
  | 'price_not_allowed_for_subscription'
  | 'subscription_template_required'
  | 'subscription_template_not_allowed_for_one_time'
  | 'no_updates_provided';

export type CommerceProductValidationResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      code: CommerceProductValidationErrorCode;
      message: string;
    };
