import { registerRoute } from './registry.js';
const routeBuilderProxyConfig = {
    roleCheck: null,
};
export function configureRouteBuilderProxies(config) {
    if (config.roleCheck !== undefined) {
        routeBuilderProxyConfig.roleCheck = config.roleCheck;
    }
}
export function getRouteBuilderProxyConfig() {
    return routeBuilderProxyConfig;
}
function createLazyRoleProxy(allowedRoles) {
    return async (request) => {
        const roleCheck = routeBuilderProxyConfig.roleCheck;
        if (!roleCheck) {
            const { NextResponse } = await import('next/server.js');
            return new NextResponse('Route role guard is not configured.', {
                status: 500,
            });
        }
        return roleCheck(allowedRoles)(request);
    };
}
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
export class RouteBuilder {
    path;
    defaultProxies;
    extraProxies;
    constructor(path, defaultProxies = [], extra = []) {
        this.path = path;
        this.defaultProxies = defaultProxies;
        this.extraProxies = extra;
    }
    /**
     * Returns the full proxy chain: area defaults first, then per-route extras.
     */
    get allProxies() {
        return [...this.defaultProxies, ...this.extraProxies];
    }
    /**
     * Add extra proxy functions on top of the area defaults.
     * Returns a new RouteBuilder — does not mutate the original.
     */
    proxy(fns) {
        return new RouteBuilder(this.path, this.defaultProxies, [
            ...this.extraProxies,
            ...fns
        ]);
    }
    /**
     * Restrict the route to one or more user roles.
     *
     * This is a host-injected guard, similar to API `.roles(...)`, and is meant
     * to keep page/portal route definitions SDK-only. The host must configure the
     * role-check proxy factory during routing bootstrap.
     *
     * Unlike `.auth()`, this guard already implies authentication.
     */
    roles(...allowedRoles) {
        const normalizedRoles = Array.from(new Set(allowedRoles
            .map((value) => String(value).trim())
            .filter(Boolean)));
        if (normalizedRoles.length === 0) {
            return this;
        }
        return this.proxy([createLazyRoleProxy(normalizedRoles)]);
    }
    /**
     * Register this route under a name in the global registry.
     * Returns `this` so it can be chained.
     *
     * @example
     * RouteAdmin('/users').name('admin.users')
     */
    name(routeName) {
        registerRoute(routeName, this.path, this.allProxies);
        return this;
    }
    /**
     * Interpolate `{param}` placeholders in the path.
     *
     * @example
     * RouteAdmin('/users/{id}').with({ id: 5 }) // "/admin/users/5"
     */
    with(params) {
        return this.path.replace(/\{(\w+)\}/g, (_, key) => {
            const value = params[key];
            if (value === undefined) {
                throw new Error(`Route "${this.path}" requires param "${key}" but it was not provided.`);
            }
            return String(value);
        });
    }
    toString() {
        return this.path;
    }
    valueOf() {
        return this.path;
    }
    [Symbol.toPrimitive](_hint) {
        return this.path;
    }
}
