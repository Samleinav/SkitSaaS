/**
 * Route definitions for mod.example.portal — EDGE-SAFE.
 *
 * This file is imported by lib/routing/all-routes.ts (middleware/edge context).
 * It only defines proxy chains and route names — no React components, no handlers.
 *
 * To enable middleware proxy enforcement, uncomment this module in:
 *   lib/routing/all-routes.ts
 *
 * To register portal pages for the Node.js dispatcher, see portal-init.ts and:
 *   lib/portals/all-portals.ts
 *
 * URL structure:
 *   /hub             → home  (public)
 *   /hub/register    → registration (public)
 *   /hub/members     → members list (auth required)
 *   /hub/members/{id} → member detail (auth required)
 *   /api/hub/members → API: list members
 */
import '@/lib/routing/area-setup'; // must be first
import { RoutePortal, RouteApiPortal } from '@skitsaas/sdk';
import { EXAMPLE_PORTAL_NAME } from './constants';
// import { proxyRoles } from '@/lib/routing/proxies'; // uncomment to add role enforcement

// ---------------------------------------------------------------------------
// Page routes
// ---------------------------------------------------------------------------

/**
 * HubRoute — portal-level factory with no default proxy.
 * Proxy chain is set per route via .auth() or .proxy([...]).
 *
 * To restrict the entire portal to a specific role, add it at factory level:
 *   export const HubRoute = RoutePortal(EXAMPLE_PORTAL_NAME).proxy([proxyRoles(['member'])]);
 *
 * To restrict individual routes:
 *   HubRoute('members').proxy([proxyRoles(['member'])]).name('hub.members');
 */
export const HubRoute = RoutePortal(EXAMPLE_PORTAL_NAME);

export const HubRoutes = {
  // Public — no auth
  home:     HubRoute('').name('hub.home'),
  register: HubRoute('register').name('hub.register'),

  // Auth required — .auth() adds the configured proxyAuth (dashboard area default)
  members:  HubRoute('members').auth().name('hub.members'),
  member:   HubRoute('members/{id}').auth().name('hub.member'),
} as const;

// ---------------------------------------------------------------------------
// API routes  →  /api/hub/*
// Module creates handler files at app/api/hub/... that use these builders.
// ---------------------------------------------------------------------------
export const HubApi = RouteApiPortal(EXAMPLE_PORTAL_NAME);

export const HubApiRoutes = {
  membersList:   HubApi('/members').GET().auth('user').name('hub.api.members.list'),
  memberDetail:  HubApi('/members/{id}').GET().auth('user').name('hub.api.members.detail'),
} as const;
