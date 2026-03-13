import { RouteBuilder } from './builder.js';
import { ApiRouteBuilder } from './api-route.js';
import type { RouteProxyFn } from './types.js';
import type { ComponentType, ReactNode } from 'react';
export type PortalConfig = {
    name: string;
    area?: string;
    context?: string;
};
/**
 * Where in the app's URL space the portal is served.
 * - `standalone` (default): `/<portalName>/*` — at the root, e.g. /hub/*
 * - `dashboard`: `/dashboard/<portalName>/*` — inside the dashboard URL space
 *
 * Both options serve the portal with its own independent layout — no area chrome
 * (no dashboard sidebar, no frontend marketing nav) is inherited.
 * The choice affects URL prefix, default CSS bundle, and multi-server deployment routing.
 */
export type PortalRouteArea = 'standalone' | 'dashboard';
export type PortalLayoutProps = {
    children: ReactNode;
    portalCtx: {
        name: string;
        area?: string;
        context?: string;
        userTheme: string | false;
        /** URL area the portal is registered in */
        routeArea: PortalRouteArea;
    };
};
type PortalPageEntry = {
    /** Portal-relative path pattern: `/<portalName>/...` — used for page lookup */
    pathPattern: string;
    component: () => Promise<{
        default: ComponentType<any>;
    }>;
};
type PortalRegistration = {
    configs: PortalConfig[];
    routeArea: PortalRouteArea;
    layout: () => Promise<{
        default: ComponentType<any>;
    }>;
    userTheme: string | false;
    /**
     * Whether to load the built-in core CSS (globals + Tailwind).
     * - `true` / `'frontend'`: loads the frontend core CSS bundle
     * - `'dashboard'`: loads the dashboard core CSS bundle
     * - `false`: no core CSS — bring your own stylesheet via `head.css`
     * Default: `'frontend'` for standalone portals, `'dashboard'` for dashboard portals.
     */
    coreCss?: boolean | 'frontend' | 'dashboard';
    head?: {
        css?: string[];
        js?: string[];
    };
    redirectRoles?: string[];
    /** If true, all authenticated non-admin users land here after login (fallback before /dashboard). */
    isDefaultPortal?: boolean;
};
export declare const portalMetaRegistry: Map<string, PortalRegistration>;
/** Standalone portal name prefixes: `/<name>/*` */
export declare const portalPrefixSet: Set<string>;
/** Dashboard area portal names: `/dashboard/<name>/*` */
export declare const dashboardPortalSet: Set<string>;
export declare function getPortalMeta(name: string): PortalRegistration | null;
export declare function getAllPortalNames(): string[];
export declare function getPortalPages(name: string): PortalPageEntry[];
export declare class PortalRouteBuilder extends RouteBuilder {
    readonly portalName: string;
    /** Portal-relative path: `/<portalName>/...` — used for page registry lookup */
    readonly portalRelativePath: string;
    readonly routeArea: PortalRouteArea;
    constructor(portalName: string, 
    /** Full URL path for the proxy chain registry (includes `/dashboard` prefix for dashboard portals) */
    registryPath: string, 
    /** Portal-relative path for page lookup: always `/<portalName>/...` */
    portalRelativePath: string, defaultProxies: RouteProxyFn[], extra?: RouteProxyFn[], routeArea?: PortalRouteArea);
    /** Override proxy() to preserve PortalRouteBuilder return type */
    proxy(fns: RouteProxyFn[]): PortalRouteBuilder;
    /**
     * Shorthand for requiring user authentication (proxyAuth).
     * Both standalone and dashboard portals use the dashboard auth proxy.
     * Override with .proxy([customFn]) for custom auth logic.
     */
    auth(): PortalRouteBuilder;
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
    page(loader: () => Promise<{
        default: ComponentType<any>;
    }>): this;
}
export type PortalRegisterOptions = {
    layout: () => Promise<{
        default: ComponentType<any>;
    }>;
    userTheme: string | false;
    /**
     * Whether to load the built-in core CSS (globals + Tailwind).
     * - `true` / `'frontend'`: loads the frontend core CSS bundle
     * - `'dashboard'`: loads the dashboard core CSS bundle
     * - `false`: no core CSS — bring your own stylesheet via `head.css`
     * Default: `'frontend'` for standalone portals; `'dashboard'` for dashboard portals.
     */
    coreCss?: boolean | 'frontend' | 'dashboard';
    /**
     * Extra CSS and JS URLs injected into the page head after the core bundle.
     */
    head?: {
        css?: string[];
        js?: string[];
    };
    /**
     * Roles redirected to this portal after login.
     * e.g. redirectRoles: ['teacher'] → users with role 'teacher' land at the portal URL
     */
    redirectRoles?: string[];
    /**
     * If true, all authenticated non-admin users are redirected here after login
     * when no specific role match is found. Acts as the global fallback destination.
     */
    isDefaultPortal?: boolean;
};
export interface PortalRouteFactory {
    /** Creates a PortalRouteBuilder for the given path under this portal. */
    (path: string): PortalRouteBuilder;
    /** Adds portal-level default proxies (applied to all routes). Returns new factory. */
    proxy(fns: RouteProxyFn[]): PortalRouteFactory;
    /** Registers portal metadata: layout, theme, head assets, redirect roles. */
    register(options: PortalRegisterOptions): void;
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
export declare function RoutePortal(nameOrConfigs: string | PortalConfig[], options?: {
    area?: PortalRouteArea;
}): PortalRouteFactory;
/**
 * Creates a scoped API route factory for portal-specific endpoints.
 * Routes are always prefixed at `/api/<portalName>/<path>` regardless of routeArea.
 *
 * @example
 * export const SchoolApi = RouteApiPortal('school');
 * export const GetStudents = SchoolApi('/students').GET().auth('user');
 */
export declare function RouteApiPortal(portalName: string): (path: string) => ApiRouteBuilder;
export {};
