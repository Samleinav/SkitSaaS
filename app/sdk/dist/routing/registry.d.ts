import type { RouteProxyFn, RouteParamMap } from './types.js';
export type RouteRegistryEntry = {
    path: string;
    proxies: RouteProxyFn[];
};
export declare function registerRoute(name: string, path: string, proxies: RouteProxyFn[]): void;
export declare function getRegisteredRoute(name: string): RouteRegistryEntry | null;
export declare function getAllRegisteredRoutes(): ReadonlyMap<string, RouteRegistryEntry>;
export declare class RouteNotFoundError extends Error {
    constructor(name: string);
}
/**
 * Build a URL by named route — like Laravel's route() helper.
 *
 * @example
 * route('admin.users')                        // "/admin/users"
 * route('example.admin.edit', { id: 5 })     // "/admin/custom/example-suite/edit/5"
 */
export declare function route(name: string, params?: RouteParamMap): string;
