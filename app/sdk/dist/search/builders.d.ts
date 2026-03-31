import type { SearchProvider, SearchProviderResult, SearchResultItem, SearchStaticEntry } from './types.js';
export declare function defineSearchEntry(entry: SearchStaticEntry): SearchStaticEntry;
export declare function defineSearchProvider(provider: SearchProvider): SearchProvider;
export declare function createSearchResult(result: SearchProviderResult): SearchProviderResult;
export declare function composeSearchEntries(...entries: Array<SearchStaticEntry | SearchStaticEntry[] | null | undefined | false>): SearchStaticEntry[];
export declare function composeSearchResults(...results: Array<SearchResultItem | SearchResultItem[] | null | undefined | false>): SearchResultItem[];
