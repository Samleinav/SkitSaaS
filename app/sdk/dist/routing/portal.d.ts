import { RouteBuilder } from './builder.js';
import { ApiRouteBuilder } from './api-route.js';
import type { RouteProxyFn } from './types.js';
import type { ComponentType, ReactNode } from 'react';
export type PortalConfig = {
    name: string;
    area?: string;
    context?: string;
};
export type PortalLayoutProps = {
    children: ReactNode;
    portalCtx: {
        name: string;
        area?: string;
        context?: string;
        userTheme: string | false;
    };
};
type PortalPageEntry = {
    pathPattern: string;
    component: () => Promise<{
        default: ComponentType<any>;
    }>;
};
type PortalRegistration = {
    configs: PortalConfig[];
    layout: () => Promise<{
        default: ComponentType<any>;
    }>;
    userTheme: string | false;
    head?: {
        css?: string[];
        js?: string[];
    };
    redirectRoles?: string[];
};
export declare const portalMetaRegistry: Map<string, PortalRegistration>;
export declare function getPortalMeta(name: string): PortalRegistration | null;
export declare function getAllPortalNames(): string[];
export declare function getPortalPages(name: string): PortalPageEntry[];
export declare class PortalRouteBuilder extends RouteBuilder {
    readonly portalName: string;
    constructor(portalName: string, path: string, defaultProxies: RouteProxyFn[], extra?: RouteProxyFn[]);
    /** Override proxy() to preserve PortalRouteBuilder return type */
    proxy(fns: RouteProxyFn[]): PortalRouteBuilder;
    /**
     * Shorthand for adding the configured user session proxy.
     * Uses the same proxy registered for the 'dashboard' area via configureAreaDefaults().
     * Override with .proxy([customFn]) for custom auth logic.
     */
    auth(): PortalRouteBuilder;
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
    page(loader: () => Promise<{
        default: ComponentType<any>;
    }>): this;
}
export type PortalRegisterOptions = {
    layout: () => Promise<{
        default: ComponentType<any>;
    }>;
    userTheme: string | false;
    head?: {
        css?: string[];
        js?: string[];
    };
    /**
     * Roles that should be redirected to this portal after login.
     * e.g. redirectRoles: ['teacher'] → users with role 'teacher' land at /portalName
     */
    redirectRoles?: string[];
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
export declare function RoutePortal(nameOrConfigs: string | PortalConfig[]): PortalRouteFactory;
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
export declare function RouteApiPortal(portalName: string): (path: string) => ApiRouteBuilder;
export {};
