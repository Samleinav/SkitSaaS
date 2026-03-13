import { RouteBuilder } from './builder.js';
import { ApiRouteBuilder } from './api-route.js';
import { getAreaBases, getAreaDefaults } from './area.js';
// ---------------------------------------------------------------------------
// Registries (module-level singletons, populated at import time)
// ---------------------------------------------------------------------------
const portalPagesByName = new Map();
export const portalMetaRegistry = new Map();
/** Standalone portal name prefixes: `/<name>/*` */
export const portalPrefixSet = new Set();
/** Dashboard area portal names: `/dashboard/<name>/*` */
export const dashboardPortalSet = new Set();
export function getPortalMeta(name) {
    return portalMetaRegistry.get(name) ?? null;
}
export function getAllPortalNames() {
    return [...portalMetaRegistry.keys()];
}
export function getPortalPages(name) {
    return portalPagesByName.get(name) ?? [];
}
// ---------------------------------------------------------------------------
// PortalRouteBuilder — extends RouteBuilder with .page() and .auth()
// ---------------------------------------------------------------------------
export class PortalRouteBuilder extends RouteBuilder {
    portalName;
    /** Portal-relative path: `/<portalName>/...` — used for page registry lookup */
    portalRelativePath;
    routeArea;
    constructor(portalName, 
    /** Full URL path for the proxy chain registry (includes `/dashboard` prefix for dashboard portals) */
    registryPath, 
    /** Portal-relative path for page lookup: always `/<portalName>/...` */
    portalRelativePath, defaultProxies, extra = [], routeArea = 'standalone') {
        super(registryPath, defaultProxies, extra);
        this.portalName = portalName;
        this.portalRelativePath = portalRelativePath;
        this.routeArea = routeArea;
    }
    /** Override proxy() to preserve PortalRouteBuilder return type */
    proxy(fns) {
        return new PortalRouteBuilder(this.portalName, this.path, this.portalRelativePath, this.defaultProxies, [...this.extraProxies, ...fns], this.routeArea);
    }
    /**
     * Shorthand for requiring user authentication (proxyAuth).
     * Both standalone and dashboard portals use the dashboard auth proxy.
     * Override with .proxy([customFn]) for custom auth logic.
     */
    auth() {
        return this.proxy(getAreaDefaults().dashboard);
    }
    /**
     * Register a lazy page component for this route (Node.js server context only).
     *
     * IMPORTANT: Call this from portal-init.ts (not routes.ts).
     * For middleware proxy enforcement, also call .name("route.key") in routes.ts.
     *
     * Security: every .page() must have a matching .name() entry in routes.ts.
     * Routes without a registered name fall back to area proxy defaults
     * (empty [] for standalone, proxyAuth for dashboard).
     */
    page(loader) {
        const pages = portalPagesByName.get(this.portalName) ?? [];
        pages.push({ pathPattern: this.portalRelativePath, component: loader });
        portalPagesByName.set(this.portalName, pages);
        return this;
    }
}
function makePortalFactory(portalName, portalProxies, configs, routeArea) {
    if (routeArea === 'dashboard') {
        dashboardPortalSet.add(portalName);
    }
    else {
        portalPrefixSet.add(portalName);
    }
    // URL prefix included in the proxy chain registry path and .name() entries
    const urlAreaPrefix = routeArea === 'dashboard' ? '/dashboard' : '';
    const factory = (path) => {
        const trimmed = path.replace(/^\/+|\/+$/g, '');
        const normalizedPath = trimmed ? `/${trimmed}` : '';
        const portalRelativePath = `/${portalName}${normalizedPath}`;
        const registryPath = `${urlAreaPrefix}${portalRelativePath}`;
        return new PortalRouteBuilder(portalName, registryPath, portalRelativePath, portalProxies, [], routeArea);
    };
    factory.proxy = (fns) => makePortalFactory(portalName, [...portalProxies, ...fns], configs, routeArea);
    factory.register = (options) => {
        portalMetaRegistry.set(portalName, { configs, routeArea, ...options });
    };
    return factory;
}
/**
 * Creates a portal route factory scoped to `portalName`.
 *
 * Portals always use their own independent layout — no area chrome is inherited.
 *
 * The `area` option controls the URL prefix:
 * - `'standalone'` (default): `/<portalName>/*` — served at the root level
 * - `'dashboard'`: `/dashboard/<portalName>/*` — inside the dashboard URL space
 *
 * Use `'dashboard'` when the portal is logically part of the authenticated user
 * experience and you want it grouped under `/dashboard/*` for deployment routing
 * (e.g. multi-server setup where dashboard and frontend run on separate instances).
 *
 * @example
 * // Standalone — at /hub/*
 * const HubRoute = RoutePortal('hub');
 * HubRoute('').name('hub.home');
 * HubRoute('members').auth().name('hub.members');
 *
 * @example
 * // Dashboard area — at /dashboard/school/*
 * const SchoolRoute = RoutePortal('school', { area: 'dashboard' });
 * SchoolRoute('').name('school.home');
 * SchoolRoute('students').name('school.students');
 * SchoolRoute('reports').roles('teacher').name('school.reports');
 */
export function RoutePortal(nameOrConfigs, options) {
    const routeArea = options?.area ?? 'standalone';
    if (Array.isArray(nameOrConfigs)) {
        const configs = nameOrConfigs;
        const portalName = configs[0].name;
        return makePortalFactory(portalName, [], configs, routeArea);
    }
    const portalName = nameOrConfigs;
    return makePortalFactory(portalName, [], [{ name: portalName }], routeArea);
}
// ---------------------------------------------------------------------------
// RouteApiPortal — scoped API route factory
// ---------------------------------------------------------------------------
/**
 * Creates a scoped API route factory for portal-specific endpoints.
 * Routes are always prefixed at `/api/<portalName>/<path>` regardless of routeArea.
 *
 * @example
 * export const SchoolApi = RouteApiPortal('school');
 * export const GetStudents = SchoolApi('/students').GET().auth('user');
 */
export function RouteApiPortal(portalName) {
    const apiBase = getAreaBases().api;
    return (path) => {
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return new ApiRouteBuilder(`${apiBase}/${portalName}${normalizedPath}`, []);
    };
}
