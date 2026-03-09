import type { RouteProxyFn, RouteParamMap } from './types.js';
/**
 * Immutable route builder. Behaves as a string in coercion contexts so it can
 * be used directly in JSX hrefs, template literals, etc.
 *
 * @example
 * const r = RouteAdmin('/users').name('admin.users')
 * `${r}`          // "/admin/users"
 * String(r)       // "/admin/users"
 * r.with({id: 5}) // "/admin/users/5"  (if path is "/admin/users/{id}")
 */
export declare class RouteBuilder {
    readonly path: string;
    readonly defaultProxies: RouteProxyFn[];
    readonly extraProxies: RouteProxyFn[];
    constructor(path: string, defaultProxies?: RouteProxyFn[], extra?: RouteProxyFn[]);
    /**
     * Returns the full proxy chain: area defaults first, then per-route extras.
     */
    get allProxies(): RouteProxyFn[];
    /**
     * Add extra proxy functions on top of the area defaults.
     * Returns a new RouteBuilder — does not mutate the original.
     */
    proxy(fns: RouteProxyFn[]): RouteBuilder;
    /**
     * Register this route under a name in the global registry.
     * Returns `this` so it can be chained.
     *
     * @example
     * RouteAdmin('/users').name('admin.users')
     */
    name(routeName: string): this;
    /**
     * Interpolate `{param}` placeholders in the path.
     *
     * @example
     * RouteAdmin('/users/{id}').with({ id: 5 }) // "/admin/users/5"
     */
    with(params: RouteParamMap): string;
    toString(): string;
    valueOf(): string;
    [Symbol.toPrimitive](_hint: string): string;
}
