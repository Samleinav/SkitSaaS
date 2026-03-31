import type {
  SearchProvider,
  SearchProviderResult,
  SearchResultItem,
  SearchStaticEntry
} from './types.js';

export function defineSearchEntry(entry: SearchStaticEntry): SearchStaticEntry {
  return entry;
}

export function defineSearchProvider(provider: SearchProvider): SearchProvider {
  return provider;
}

export function createSearchResult(
  result: SearchProviderResult
): SearchProviderResult {
  return result;
}

export function composeSearchEntries(
  ...entries: Array<
    SearchStaticEntry | SearchStaticEntry[] | null | undefined | false
  >
): SearchStaticEntry[] {
  const normalized: SearchStaticEntry[] = [];

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

export function composeSearchResults(
  ...results: Array<
    SearchResultItem | SearchResultItem[] | null | undefined | false
  >
): SearchResultItem[] {
  const normalized: SearchResultItem[] = [];

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

