// ─── Context ─────────────────────────────────────────────────────────────────

/**
 * Scope context for quota checks.
 * Exactly one of teamId / userId must be non-null.
 */
export type QuotaContext = {
  teamId: number | null;
  userId: number | null;
};

// ─── Result types ─────────────────────────────────────────────────────────────

/**
 * Result of checkFeature — tells the caller whether the feature is enabled
 * and, if it has a numeric limit, what the current usage is.
 */
export type FeatureCheckResult = {
  /** Whether the feature flag is enabled for the current subscription plan. */
  enabled: boolean;
  /** Numeric limit from the plan, or null if the feature is unlimited / boolean. */
  limit: number | null;
  /** Current usage count this period, or null if usage is not tracked. */
  used: number | null;
  /** Whether the quota has been reached (used >= limit). false if limit is null. */
  exhausted: boolean;
};

/**
 * Current quota standing for a trackable feature.
 */
export type QuotaStatus = {
  /** Numeric limit from the plan. null means unlimited. */
  limit: number | null;
  /** Current usage count this period. */
  used: number;
  /** Remaining units, or null if unlimited. */
  remaining: number | null;
  /** When the usage counter resets (e.g. monthly). Undefined if no reset cycle. */
  resetAt?: Date;
};

/**
 * Options for consumeQuota.
 */
export type ConsumeOptions = {
  /** How many units to consume. Defaults to 1. */
  amount?: number;
  /**
   * If true, the call throws QuotaExceededError when the quota would be exceeded
   * instead of incrementing and returning exhausted:true.
   * Defaults to false.
   */
  strict?: boolean;
};

/**
 * Result returned by consumeQuota.
 */
export type ConsumeResult = {
  /** Whether consumption was recorded (always true unless strict mode throws). */
  consumed: boolean;
  /** Updated usage count after this consumption. */
  used: number;
  /** Whether the quota is now fully exhausted after this consumption. */
  exhausted: boolean;
  /** Remaining units, or null if unlimited. */
  remaining: number | null;
};

// ─── Error ────────────────────────────────────────────────────────────────────

export class QuotaExceededError extends Error {
  constructor(
    public readonly featureKey: string,
    public readonly limit: number,
    public readonly used: number
  ) {
    super(
      `Quota exceeded for feature "${featureKey}": limit ${limit}, current usage ${used}.`
    );
    this.name = 'QuotaExceededError';
  }
}

// ─── Adapter interface ────────────────────────────────────────────────────────

/**
 * Host-implemented adapter that bridges the SDK to the billing/subscription DB.
 * Registered once via configureSubscriptionFeatures() in sdk-server-bootstrap.
 */
export interface SubscriptionFeaturesAdapter {
  /**
   * Return the feature flag / limit for a given feature key within
   * the current subscription plan of the target scope.
   * - enabled: false  → feature not available on this plan
   * - limit: null      → feature enabled with no numeric limit
   * - limit: number    → feature enabled up to N units per period
   */
  getFeatureLimit(
    featureKey: string,
    ctx: QuotaContext
  ): Promise<{ enabled: boolean; limit: number | null }>;

  /**
   * Return the current usage count for a trackable feature in this period.
   * Only called when limit is non-null.
   */
  getUsage(
    featureKey: string,
    ctx: QuotaContext
  ): Promise<{ used: number; resetAt?: Date }>;

  /**
   * Increment the usage counter by `amount` (default 1).
   * Should be idempotent enough to be safe on retry.
   * Returns the updated usage count.
   */
  incrementUsage(
    featureKey: string,
    ctx: QuotaContext,
    amount: number
  ): Promise<{ used: number }>;
}

// ─── Service locator ──────────────────────────────────────────────────────────

let _adapter: SubscriptionFeaturesAdapter | null = null;

export function configureSubscriptionFeatures(
  adapter: SubscriptionFeaturesAdapter
): void {
  _adapter = adapter;
}

function readAdapter(): SubscriptionFeaturesAdapter {
  if (!_adapter) {
    throw new Error(
      'Subscription features adapter not configured. ' +
        'Call configureSubscriptionFeatures() in sdk-server-bootstrap.'
    );
  }
  return _adapter;
}

// ─── Public SDK surface ───────────────────────────────────────────────────────

/**
 * Check whether a feature is enabled and whether its quota has been reached.
 *
 * @example
 * // In an API route — gate before doing expensive work
 * const feature = await checkFeature('api_calls', { teamId, userId: null });
 * if (!feature.enabled) return forbidden('Feature not available on your plan.');
 * if (feature.exhausted) return forbidden('Monthly API call limit reached.');
 */
export async function checkFeature(
  featureKey: string,
  ctx: QuotaContext
): Promise<FeatureCheckResult> {
  const adapter = readAdapter();
  const { enabled, limit } = await adapter.getFeatureLimit(featureKey, ctx);

  if (!enabled) {
    return { enabled: false, limit, used: null, exhausted: false };
  }

  if (limit === null) {
    // Unlimited — no usage tracking needed
    return { enabled: true, limit: null, used: null, exhausted: false };
  }

  const { used } = await adapter.getUsage(featureKey, ctx);
  const exhausted = used >= limit;

  return { enabled: true, limit, used, exhausted };
}

/**
 * Return full quota standing (limit, used, remaining, resetAt) for a feature.
 * The feature must be enabled and have a numeric limit.
 *
 * @example
 * // In a dashboard widget
 * const status = await getQuotaStatus('projects', { teamId, userId: null });
 * // → { limit: 10, used: 4, remaining: 6, resetAt: undefined }
 */
export async function getQuotaStatus(
  featureKey: string,
  ctx: QuotaContext
): Promise<QuotaStatus> {
  const adapter = readAdapter();
  const { enabled, limit } = await adapter.getFeatureLimit(featureKey, ctx);

  if (!enabled) {
    return { limit: 0, used: 0, remaining: 0 };
  }

  if (limit === null) {
    return { limit: null, used: 0, remaining: null };
  }

  const { used, resetAt } = await adapter.getUsage(featureKey, ctx);
  const remaining = Math.max(0, limit - used);

  return { limit, used, remaining, resetAt };
}

/**
 * Consume quota units for a feature. Optionally throws QuotaExceededError
 * in strict mode instead of allowing over-consumption.
 *
 * **Intent-based pattern** — consume before the action:
 * ```ts
 * await consumeQuota('api_calls', ctx, { strict: true });
 * // ... perform the API call
 * ```
 *
 * **Success-only pattern** — consume after confirming success:
 * ```ts
 * const result = await doAction();
 * if (result.ok) await consumeQuota('exports', ctx);
 * ```
 *
 * **Async / event-handler pattern** — consume inside an event handler:
 * ```ts
 * // In eventHandlers:
 * run: async (payload) => {
 *   await consumeQuota('proxy_requests', { teamId: payload.teamId, userId: null });
 * }
 * ```
 */
export async function consumeQuota(
  featureKey: string,
  ctx: QuotaContext,
  options?: ConsumeOptions
): Promise<ConsumeResult> {
  const adapter = readAdapter();
  const amount = options?.amount ?? 1;
  const strict = options?.strict ?? false;

  const { enabled, limit } = await adapter.getFeatureLimit(featureKey, ctx);

  if (!enabled) {
    throw new QuotaExceededError(featureKey, 0, 0);
  }

  if (limit !== null) {
    const { used } = await adapter.getUsage(featureKey, ctx);

    if (strict && used + amount > limit) {
      throw new QuotaExceededError(featureKey, limit, used);
    }
  }

  const { used: updatedUsed } = await adapter.incrementUsage(featureKey, ctx, amount);
  const exhausted = limit !== null && updatedUsed >= limit;
  const remaining = limit !== null ? Math.max(0, limit - updatedUsed) : null;

  return { consumed: true, used: updatedUsed, exhausted, remaining };
}
