export type OneTimeCheckoutProvider = 'stripe' | 'paypal';
export type OneTimeCheckoutMode = 'core_checkout';

export type OneTimeIntentTargetType = 'user' | 'team';

export type OneTimeCheckoutLineItemInput = {
  productId: number;
  quantity: number;
};

export type OneTimeFulfillmentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'canceled'
  | 'refunded';

export type OneTimeIntentStatus =
  | 'session_created'
  | OneTimeFulfillmentStatus;

export type CreateOneTimeCheckoutIntentInput = {
  productId: number | null;
  quantity: number | null;
  lineItems: OneTimeCheckoutLineItemInput[] | null;
  provider: OneTimeCheckoutProvider | null;
  checkoutMode: OneTimeCheckoutMode;
  targetType: OneTimeIntentTargetType;
  targetTeamId: number | null;
  idempotencyKey: string | null;
  metadata: Record<string, unknown> | null;
  successUrl: string | null;
  cancelUrl: string | null;
};

export type OneTimeIntent = {
  id: number;
  intentKey: string;
  productId: number;
  provider: OneTimeCheckoutProvider | null;
  status: OneTimeIntentStatus;
  targetType: OneTimeIntentTargetType;
  targetUserId: number | null;
  targetTeamId: number | null;
  amount: number;
  currency: string;
  sessionId: string | null;
  providerIntentId: string | null;
  checkoutUrl: string | null;
  idempotencyKey: string | null;
  productSnapshot: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OneTimeFulfillment = {
  id: number;
  intentId: number;
  orderId: number | null;
  status: OneTimeFulfillmentStatus;
  providerEventId: string | null;
  externalPaymentId: string | null;
  amount: number | null;
  currency: string | null;
  payload: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OneTimeIntentErrorCode =
  | 'not_found'
  | 'forbidden'
  | 'product_not_found'
  | 'product_not_published'
  | 'one_time_only_product_required'
  | 'product_missing_active_price'
  | 'target_team_required'
  | 'target_team_not_found'
  | 'target_team_forbidden'
  | 'invalid_amount'
  | 'provider_not_configured'
  | 'provider_session_create_failed'
  | 'provider_webhook_invalid_signature'
  | 'operation_failed';

export type OneTimeIntentMutationResult =
  | {
      ok: true;
      intent: OneTimeIntent;
      idempotencyReused: boolean;
    }
  | {
      ok: false;
      code: OneTimeIntentErrorCode;
      message: string;
    };

export type OneTimeIntentLookupResult =
  | {
      ok: true;
      intent: OneTimeIntent;
      fulfillment: OneTimeFulfillment | null;
    }
  | {
      ok: false;
      code: Extract<OneTimeIntentErrorCode, 'not_found' | 'forbidden'>;
      message: string;
    };

export type OneTimeFulfillmentMutationResult =
  | {
      ok: true;
      alreadyProcessed: boolean;
      transitionApplied: boolean;
      requestedStatus: Exclude<OneTimeFulfillmentStatus, 'pending'>;
      status: OneTimeFulfillmentStatus;
      intent: OneTimeIntent | null;
      fulfillment: OneTimeFulfillment | null;
    }
  | {
      ok: false;
      code: Extract<OneTimeIntentErrorCode, 'not_found' | 'operation_failed'>;
      message: string;
    };

export type OneTimeIntentValidationErrorCode =
  | 'invalid_json_body'
  | 'invalid_intent_id'
  | 'invalid_product_id'
  | 'invalid_quantity'
  | 'invalid_line_items'
  | 'invalid_provider'
  | 'invalid_checkout_mode'
  | 'invalid_target_type'
  | 'target_team_required'
  | 'invalid_target_team_id'
  | 'target_team_not_allowed_for_user_target'
  | 'invalid_idempotency_key'
  | 'invalid_metadata'
  | 'invalid_success_url'
  | 'invalid_cancel_url';

export type OneTimeIntentValidationResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      code: OneTimeIntentValidationErrorCode;
      message: string;
    };
