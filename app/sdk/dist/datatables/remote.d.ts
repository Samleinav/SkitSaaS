import type { BuildTableQueryState, BuildTableRemoteSourceDefinition, BuildTableRequestDefinition } from './definition.js';
export type BuildTableRemoteListResult<TItem extends Record<string, unknown>> = {
    items: TItem[];
    total: number;
    page?: number;
    pageSize?: number;
    payload: unknown;
};
export declare function resolveBuildTableRemoteListUrl(source: BuildTableRemoteSourceDefinition, query: BuildTableQueryState): string;
export declare function resolveBuildTableRemoteListResult<TItem extends Record<string, unknown>>(payload: unknown, source?: BuildTableRemoteSourceDefinition): BuildTableRemoteListResult<TItem>;
export declare function createBuildTableRequestDescriptor(request: BuildTableRequestDefinition): {
    url: string;
    init: RequestInit;
};
