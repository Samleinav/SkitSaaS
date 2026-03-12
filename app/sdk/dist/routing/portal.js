import { RouteBuilder } from './builder.js';
import { ApiRouteBuilder } from './api-route.js';
import { getAreaBases, getAreaDefaults } from './area.js';
// ---------------------------------------------------------------------------
// Registries (module-level singletons, populated at import time)
// ---------------------------------------------------------------------------
const portalPagesByName = new Map();
export const portalMetaRegistry = new Map();
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
    constructor(portalName, path, defaultProxies, extra = []) {
        super(path, defaultProxies, extra);
        this.portalName = portalName;
    }
    /** Override proxy() to preserve PortalRouteBuilder return type */
    proxy(fns) {
        return new PortalRouteBuilder(this.portalName, this.path, this.defaultProxies, [...this.extraProxies, ...fns]);
    }
    /**
     * Shorthand for adding the configured user session proxy.
     * Uses the same proxy registered for the 'dashboard' area via configureAreaDefaults().
     * Override with .proxy([customFn]) for custom auth logic.
     */
    auth() {
        return this.proxy(getAreaDefaults().dashboard);
    }
    /**
     * Register a lazy page component for this route (Node.js server context only).
     *
     * IMPORTANT: Call this from portal-init.ts (not routes.ts), which is imported
     * by lib/portals/all-portals.ts → ensures the page registry is populated in the
     * Node.js server context used by the portal dispatcher.
     *
     * For middleware proxy enforcement, call .name("my.route") in routes.ts — that
     * registers the proxy chain in the edge-context route registry via registerRoute().
     */
    page(loader) {
        const pages = portalPagesByName.get(this.portalName) ?? [];
        pages.push({ pathPattern: this.path, component: loader });
        portalPagesByName.set(this.portalName, pages);
        return this;
    }
}
function makePortalFactory(portalName, portalProxies, configs) {
    const factory = (path) => {
        const trimmed = path.replace(/^\/+|\/+$/g, '');
        const normalizedPath = trimmed ? `/${trimmed}` : '';
        return new PortalRouteBuilder(portalName, `/${portalName}${normalizedPath}`, portalProxies);
    };
    factory.proxy = (fns) => makePortalFactory(portalName, [...portalProxies, ...fns], configs);
    factory.register = (options) => {
        portalMetaRegistry.set(portalName, { configs, ...options });
    };
    return factory;
}
/**
 * Creates a portal route factory scoped to `portalName`.
 * The portal is served at `/<portalName>/*` via the frontend catch-all dispatcher.
 * No default proxies — add them via .proxy([...]) at factory or individual route level.
 *
 * Accepts either a string name or an array of PortalConfig objects (for shared layout/theme).
 *
 * @example
 * // Simple usage
 * const SchoolRoute = RoutePortal("school").proxy([proxyAuth, proxyRoles(['teacher'])]);
 * SchoolRoute("home").page(() => import('./portal/school/home/page')).name("school.home");
 * SchoolRoute("students/{id}").auth().page(() => import('./portal/school/students/[id]/page'));
 * SchoolRoute.register({ layout: () => import('./portal/school/layout'), userTheme: false, redirectRoles: ['teacher'] });
 *
 * @example
 * // With config object (area/context metadata)
 * const TeacherRoute = RoutePortal([{ name: "teacher", area: "school", context: "teacher" }]);
 */
export function RoutePortal(nameOrConfigs) {
    if (Array.isArray(nameOrConfigs)) {
        const configs = nameOrConfigs;
        const portalName = configs[0].name;
        return makePortalFactory(portalName, [], configs);
    }
    const portalName = nameOrConfigs;
    return makePortalFactory(portalName, [], [{ name: portalName }]);
}
// ---------------------------------------------------------------------------
// RouteApiPortal — scoped API route factory
// ---------------------------------------------------------------------------
/**
 * Creates a scoped API route factory for portal-specific endpoints.
 * Routes are prefixed at `/api/<portalName>/<path>`.
 *
 * The module is responsible for creating the actual Next.js route handler files.
 * This builder defines the typed route metadata (auth, rate limits) used in those handlers.
 *
 * @example
 * export const SchoolApi = RouteApiPortal("school");
 * export const GetStudents = SchoolApi.GET("/students").auth('user');
 * export const PostEnroll = SchoolApi.POST("/enroll").auth('user').rateLimit({ limit: 5, windowSeconds: 60 });
 *
 * // In the module's API route file (app/api/school/students/route.ts):
 * import { GetStudents } from '@/../modules/mod.school/src/routes';
 * export const GET = GetStudents.handler(async (req, ctx) => { ... }).nextHandler;
 */
export function RouteApiPortal(portalName) {
    const apiBase = getAreaBases().api;
    return (path) => {
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return new ApiRouteBuilder(`${apiBase}/${portalName}${normalizedPath}`, []);
    };
}
