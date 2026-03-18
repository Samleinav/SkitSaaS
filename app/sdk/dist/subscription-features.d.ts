/**
 * Scope context for quota checks.
 * Exactly one of teamId / userId must be non-null.
 */
export type QuotaContext = {
    teamId: number | null;
    userId: number | null;
};
export type SubscriptionFeatureValueType = 'text' | 'number' | 'boolean' | 'null';
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
 * Raw feature value resolved from the current subscription plan. This is the
 * read-only path for plan configuration, independent from quota usage.
 */
export type PlanFeatureValueResult = {
    /** Whether the current plan defines a row for this feature key. */
    found: boolean;
    /** Stored value type from `subscription_template_features`. */
    valueType: SubscriptionFeatureValueType | null;
    /** Raw stored value after trimming. */
    rawValue: string | null;
    /** Parsed boolean value when `valueType === 'boolean'`. */
    booleanValue: boolean | null;
    /** Parsed numeric value when `valueType === 'number'`. */
    numberValue: number | null;
    /** Parsed text value when `valueType === 'text'`. */
    textValue: string | null;
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
export declare class QuotaExceededError extends Error {
    readonly featureKey: string;
    readonly limit: number;
    readonly used: number;
    constructor(featureKey: string, limit: number, used: number);
}
/**
 * Host-implemented adapter that bridges the SDK to the billing/subscription DB.
 * Registered once via configureSubscriptionFeatures() in sdk-server-bootstrap.
 */
export interface SubscriptionFeaturesAdapter {
    /**
     * Return the raw feature value defined on the current subscription plan.
     * This does not inspect or mutate quota usage.
     */
    getPlanFeatureValue?: (featureKey: string, ctx: QuotaContext) => Promise<{
        found: boolean;
        valueType: SubscriptionFeatureValueType | null;
        rawValue: string | null;
    }>;
    /**
     * Return the feature flag / limit for a given feature key within
     * the current subscription plan of the target scope.
     * - enabled: false  → feature not available on this plan
     * - limit: null      → feature enabled with no numeric limit
     * - limit: number    → feature enabled up to N units per period
     */
    getFeatureLimit(featureKey: string, ctx: QuotaContext): Promise<{
        enabled: boolean;
        limit: number | null;
    }>;
    /**
     * Return the current usage count for a trackable feature in this period.
     * Only called when limit is non-null.
     */
    getUsage(featureKey: string, ctx: QuotaContext): Promise<{
        used: number;
        resetAt?: Date;
    }>;
    /**
     * Increment the usage counter by `amount` (default 1).
     * Should be idempotent enough to be safe on retry.
     * Returns the updated usage count.
     */
    incrementUsage(featureKey: string, ctx: QuotaContext, amount: number): Promise<{
        used: number;
    }>;
}
export declare function configureSubscriptionFeatures(adapter: SubscriptionFeaturesAdapter): void;
/**
 * Read the raw value configured on the current subscription plan for a feature
 * key. This is the SDK path for numeric plan limits that are not usage-tracked.
 *
 * Use `checkFeature()` / `getQuotaStatus()` / `consumeQuota()` only when the
 * feature also tracks usage in `quota_usage`.
 */
export declare function getPlanFeatureValue(featureKey: string, ctx: QuotaContext): Promise<PlanFeatureValueResult>;
/**
 * Convenience helper for module code that only needs a numeric plan limit.
 * Returns the stored numeric value without reading or mutating quota usage.
 */
export declare function getPlanFeatureNumber(featureKey: string, ctx: QuotaContext, fallback?: number | null): Promise<number | null>;
/**
 * Check whether a feature is enabled and whether its quota has been reached.
 *
 * @example
 * // In an API route — gate before doing expensive work
 * const feature = await checkFeature('api_calls', { teamId, userId: null });
 * if (!feature.enabled) return forbidden('Feature not available on your plan.');
 * if (feature.exhausted) return forbidden('Monthly API call limit reached.');
 */
export declare function checkFeature(featureKey: string, ctx: QuotaContext): Promise<FeatureCheckResult>;
/**
 * Return full quota standing (limit, used, remaining, resetAt) for a feature.
 * The feature must be enabled and have a numeric limit.
 *
 * @example
 * // In a dashboard widget
 * const status = await getQuotaStatus('projects', { teamId, userId: null });
 * // → { limit: 10, used: 4, remaining: 6, resetAt: undefined }
 */
export declare function getQuotaStatus(featureKey: string, ctx: QuotaContext): Promise<QuotaStatus>;
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
export declare function consumeQuota(featureKey: string, ctx: QuotaContext, options?: ConsumeOptions): Promise<ConsumeResult>;
