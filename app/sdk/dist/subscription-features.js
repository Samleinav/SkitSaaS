// ─── Context ─────────────────────────────────────────────────────────────────
// ─── Error ────────────────────────────────────────────────────────────────────
export class QuotaExceededError extends Error {
    featureKey;
    limit;
    used;
    constructor(featureKey, limit, used) {
        super(`Quota exceeded for feature "${featureKey}": limit ${limit}, current usage ${used}.`);
        this.featureKey = featureKey;
        this.limit = limit;
        this.used = used;
        this.name = 'QuotaExceededError';
    }
}
// ─── Service locator ──────────────────────────────────────────────────────────
let _adapter = null;
export function configureSubscriptionFeatures(adapter) {
    _adapter = adapter;
}
function readAdapter() {
    if (!_adapter) {
        throw new Error('Subscription features adapter not configured. ' +
            'Call configureSubscriptionFeatures() in sdk-server-bootstrap.');
    }
    return _adapter;
}
const TRUE_VALUES = new Set([
    '1',
    'true',
    'yes',
    'y',
    'on',
    'enabled',
    'allow',
    'allowed',
    'unlimited',
    '*'
]);
const FALSE_VALUES = new Set([
    '0',
    'false',
    'no',
    'n',
    'off',
    'disabled',
    'deny',
    'denied'
]);
function normalizeRawFeatureValue(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}
function normalizeFeatureValueType(value) {
    return value === 'text' ||
        value === 'number' ||
        value === 'boolean' ||
        value === 'null'
        ? value
        : null;
}
function parseBooleanFeatureValue(value) {
    if (!value) {
        return null;
    }
    const normalized = value.trim().toLowerCase();
    if (TRUE_VALUES.has(normalized)) {
        return true;
    }
    if (FALSE_VALUES.has(normalized)) {
        return false;
    }
    return null;
}
function parseNumberFeatureValue(value) {
    if (!value) {
        return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}
// ─── Public SDK surface ───────────────────────────────────────────────────────
/**
 * Read the raw value configured on the current subscription plan for a feature
 * key. This is the SDK path for numeric plan limits that are not usage-tracked.
 *
 * Use `checkFeature()` / `getQuotaStatus()` / `consumeQuota()` only when the
 * feature also tracks usage in `quota_usage`.
 */
export async function getPlanFeatureValue(featureKey, ctx) {
    const adapter = readAdapter();
    if (!adapter.getPlanFeatureValue) {
        throw new Error('Subscription features adapter does not provide getPlanFeatureValue(featureKey, ctx).');
    }
    const feature = await adapter.getPlanFeatureValue(featureKey, ctx);
    if (!feature?.found) {
        return {
            found: false,
            valueType: null,
            rawValue: null,
            booleanValue: null,
            numberValue: null,
            textValue: null
        };
    }
    const valueType = normalizeFeatureValueType(feature.valueType);
    const rawValue = normalizeRawFeatureValue(feature.rawValue);
    return {
        found: true,
        valueType,
        rawValue,
        booleanValue: valueType === 'boolean' ? parseBooleanFeatureValue(rawValue) : null,
        numberValue: valueType === 'number' ? parseNumberFeatureValue(rawValue) : null,
        textValue: valueType === 'text' ? rawValue : null
    };
}
/**
 * Convenience helper for module code that only needs a numeric plan limit.
 * Returns the stored numeric value without reading or mutating quota usage.
 */
export async function getPlanFeatureNumber(featureKey, ctx, fallback = null) {
    const feature = await getPlanFeatureValue(featureKey, ctx);
    return feature.valueType === 'number' && feature.numberValue !== null
        ? feature.numberValue
        : fallback;
}
/**
 * Check whether a feature is enabled and whether its quota has been reached.
 *
 * @example
 * // In an API route — gate before doing expensive work
 * const feature = await checkFeature('api_calls', { teamId, userId: null });
 * if (!feature.enabled) return forbidden('Feature not available on your plan.');
 * if (feature.exhausted) return forbidden('Monthly API call limit reached.');
 */
export async function checkFeature(featureKey, ctx) {
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
export async function getQuotaStatus(featureKey, ctx) {
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
export async function consumeQuota(featureKey, ctx, options) {
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
