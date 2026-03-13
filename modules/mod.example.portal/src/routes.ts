/**
 * Route definitions for mod.example.portal - EDGE-SAFE.
 *
 * This file is imported by lib/routing/all-routes.generated.ts (middleware/edge context)
 * after `pnpm modules:prepare` picks up `module.json.routesEntry`.
 * It only defines proxy chains and route names - no React components, no handlers.
 *
 * To register portal pages for the Node.js dispatcher, pair this file with
 * `portal-init.ts` and declare both `routesEntry` and `portalInit` in `module.json`.
 *
 * URL structure:
 *   /hub               -> home (public)
 *   /hub/register      -> registration (public)
 *   /hub/members       -> members list (auth required)
 *   /hub/members/{id}  -> member detail (auth required)
 *
 * RouteApiPortal metadata below can be bridged to /api/hub/* from host app/api files.
 */
import { RoutePortal, RouteApiPortal } from '@skitsaas/sdk';
import { EXAMPLE_PORTAL_NAME } from './constants';

// Route builders returned by HubRoute(path) support .roles(...) when a path needs role enforcement.

// ---------------------------------------------------------------------------
// Page routes
// ---------------------------------------------------------------------------

/**
 * HubRoute - portal-level factory with no default proxy.
 * Proxy chain is set per route via .auth() or .proxy([...]).
 *
 * To restrict the entire portal to a specific role, apply the same .roles(...)
 * guard to each declared route, or wrap HubRoute(path) in a small local helper
 * that adds .roles('member') before .name().
 */
export const HubRoute = RoutePortal(EXAMPLE_PORTAL_NAME);

export const HubRoutes = {
  // Public - no auth
  home: HubRoute('').name('hub.home'),
  register: HubRoute('register').name('hub.register'),

  // Auth required - .auth() adds the configured proxyAuth (dashboard area default)
  members: HubRoute('members').auth().name('hub.members'),
  member: HubRoute('members/{id}').auth().name('hub.member'),
} as const;

// ---------------------------------------------------------------------------
// Portal API metadata -> /api/hub/*
// Host bridge files under app/api/hub/... can use these builders via withApiRouteEntries(...).
// ---------------------------------------------------------------------------
export const HubApi = RouteApiPortal(EXAMPLE_PORTAL_NAME);

export const HubApiRoutes = {
  membersList: HubApi('/members').GET().auth('user').name('hub.api.members.list'),
  memberDetail: HubApi('/members/{id}').GET().auth('user').name('hub.api.members.detail'),
} as const;
