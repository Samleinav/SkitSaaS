export function defineSearchEntry(entry) {
    return entry;
}
export function defineSearchProvider(provider) {
    return provider;
}
export function createSearchResult(result) {
    return result;
}
export function composeSearchEntries(...entries) {
    const normalized = [];
    for (const entry of entries) {
        if (!entry) {
            continue;
        }
        if (Array.isArray(entry)) {
            normalized.push(...entry);
            continue;
        }
        normalized.push(entry);
    }
    return normalized;
}
export function composeSearchResults(...results) {
    const normalized = [];
    for (const result of results) {
        if (!result) {
            continue;
        }
        if (Array.isArray(result)) {
            normalized.push(...result);
            continue;
        }
        normalized.push(result);
    }
    return normalized;
}
