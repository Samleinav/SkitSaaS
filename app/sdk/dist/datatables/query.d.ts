import type { BuildTableQueryParamOptions, BuildTableQueryState } from './definition.js';
export declare function parseBuildTableQueryState(input: URLSearchParams | string, options?: BuildTableQueryParamOptions): BuildTableQueryState;
export declare function createBuildTableQuerySearchParams(query: BuildTableQueryState, options?: BuildTableQueryParamOptions): URLSearchParams;
