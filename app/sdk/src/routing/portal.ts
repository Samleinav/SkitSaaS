import { RouteBuilder } from './builder.js';
import { ApiRouteBuilder } from './api-route.js';
import { getAreaBases, getAreaDefaults } from './area.js';
import type { RouteProxyFn } from './types.js';
import type { ComponentType, ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  component: () => Promise<{ default: ComponentType<any> }>;
};

type PortalRegistration = {
  configs: PortalConfig[];
  routeArea: PortalRouteArea;
  layout: () => Promise<{ default: ComponentType<any> }>;
  userTheme: string | false;
  /**
   * Whether to load the built-in core CSS (globals + Tailwind).
   * - `true` / `'frontend'`: loads the frontend core CSS bundle
   * - `'dashboard'`: loads the dashboard core CSS bundle
   * - `false`: no core CSS — bring your own stylesheet via `head.css`
   * Default: `'frontend'` for standalone portals, `'dashboard'` for dashboard portals.
   */
  coreCss?: boolean | 'frontend' | 'dashboard';
  head?: { css?: string[]; js?: string[] };
  redirectRoles?: string[];
  /** If true, all authenticated non-admin users land here after login (fallback before /dashboard). */
  isDefaultPortal?: boolean;
};

// ---------------------------------------------------------------------------
// Registries (module-level singletons, populated at import time)
// ---------------------------------------------------------------------------

const portalPagesByName = new Map<string, PortalPageEntry[]>();
export const portalMetaRegistry = new Map<string, PortalRegistration>();

/** Standalone portal name prefixes: `/<name>/*` */
export const portalPrefixSet = new Set<string>();
/** Dashboard area portal names: `/dashboard/<name>/*` */
export const dashboardPortalSet = new Set<string>();

export function getPortalMeta(name: string): PortalRegistration | null {
  return portalMetaRegistry.get(name) ?? null;
}

export function getAllPortalNames(): string[] {
  return [...portalMetaRegistry.keys()];
}

export function getPortalPages(name: string): PortalPageEntry[] {
  return portalPagesByName.get(name) ?? [];
}

// ---------------------------------------------------------------------------
// PortalRouteBuilder — extends RouteBuilder with .page() and .auth()
// ---------------------------------------------------------------------------

export class PortalRouteBuilder extends RouteBuilder {
  readonly portalName: string;
  /** Portal-relative path: `/<portalName>/...` — used for page registry lookup */
  readonly portalRelativePath: string;
  readonly routeArea: PortalRouteArea;

  constructor(
    portalName: string,
    /** Full URL path for the proxy chain registry (includes `/dashboard` prefix for dashboard portals) */
    registryPath: string,
    /** Portal-relative path for page lookup: always `/<portalName>/...` */
    portalRelativePath: string,
    defaultProxies: RouteProxyFn[],
    extra: RouteProxyFn[] = [],
    routeArea: PortalRouteArea = 'standalone'
  ) {
    super(registryPath, defaultProxies, extra);
    this.portalName = portalName;
    this.portalRelativePath = portalRelativePath;
    this.routeArea = routeArea;
  }

  /** Override proxy() to preserve PortalRouteBuilder return type */
  proxy(fns: RouteProxyFn[]): PortalRouteBuilder {
    return new PortalRouteBuilder(
      this.portalName,
      this.path,
      this.portalRelativePath,
      this.defaultProxies,
      [...this.extraProxies, ...fns],
      this.routeArea
    );
  }

  /**
   * Shorthand for requiring user authentication (proxyAuth).
   * Both standalone and dashboard portals use the dashboard auth proxy.
   * Override with .proxy([customFn]) for custom auth logic.
   */
  auth(): PortalRouteBuilder {
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
  page(loader: () => Promise<{ default: ComponentType<any> }>): this {
    const pages = portalPagesByName.get(this.portalName) ?? [];
    pages.push({ pathPattern: this.portalRelativePath, component: loader });
    portalPagesByName.set(this.portalName, pages);
    return this;
  }
}

// ---------------------------------------------------------------------------
// PortalRouteFactory — callable function with .proxy() and .register() methods
// ---------------------------------------------------------------------------

export type PortalRegisterOptions = {
  layout: () => Promise<{ default: ComponentType<any> }>;
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
  head?: { css?: string[]; js?: string[] };
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

function makePortalFactory(
  portalName: string,
  portalProxies: RouteProxyFn[],
  configs: PortalConfig[],
  routeArea: PortalRouteArea
): PortalRouteFactory {
  if (routeArea === 'dashboard') {
    dashboardPortalSet.add(portalName);
  } else {
    portalPrefixSet.add(portalName);
  }

  // URL prefix included in the proxy chain registry path and .name() entries
  const urlAreaPrefix = routeArea === 'dashboard' ? '/dashboard' : '';

  const factory = (path: string): PortalRouteBuilder => {
    const trimmed = path.replace(/^\/+|\/+$/g, '');
    const normalizedPath = trimmed ? `/${trimmed}` : '';
    const portalRelativePath = `/${portalName}${normalizedPath}`;
    const registryPath = `${urlAreaPrefix}${portalRelativePath}`;
    return new PortalRouteBuilder(
      portalName,
      registryPath,
      portalRelativePath,
      portalProxies,
      [],
      routeArea
    );
  };

  factory.proxy = (fns: RouteProxyFn[]): PortalRouteFactory =>
    makePortalFactory(portalName, [...portalProxies, ...fns], configs, routeArea);

  factory.register = (options: PortalRegisterOptions): void => {
    portalMetaRegistry.set(portalName, { configs, routeArea, ...options });
  };

  return factory as PortalRouteFactory;
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
 * SchoolRoute('reports').proxy([proxyRoles(['teacher'])]).name('school.reports');
 */
export function RoutePortal(
  nameOrConfigs: string | PortalConfig[],
  options?: { area?: PortalRouteArea }
): PortalRouteFactory {
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
export function RouteApiPortal(portalName: string) {
  const apiBase = getAreaBases().api;
  return (path: string): ApiRouteBuilder => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return new ApiRouteBuilder(
      `${apiBase}/${portalName}${normalizedPath}`,
      []
    );
  };
}
