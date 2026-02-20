export function mergeClassNames(...values) {
    return values.filter(Boolean).join(' ');
}
export function readString(data, key, fallback = '') {
    return toStringOrFallback(data?.[key], fallback);
}
export function toStringOrNull(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
}
export function toStringOrFallback(value, fallback) {
    return toStringOrNull(value) ?? fallback;
}
export function toNumberOrFallback(value, fallback) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
