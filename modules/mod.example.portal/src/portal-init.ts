/**
 * Portal page registration for mod.example.portal — NODE.JS SERVER CONTEXT ONLY.
 *
 * This file is imported by lib/portals/all-portals.ts (Node.js server context).
 * It registers page components and portal metadata in the portal page registry
 * so the [...moduleAlias] dispatcher can resolve them.
 *
 * To enable, uncomment this module in lib/portals/all-portals.ts:
 *   import '@/../modules/mod.example.portal/src/portal-init';
 *
 * IMPORTANT: Do NOT import this file from routes.ts or any edge-safe file.
 * Use routes.ts for middleware proxy enforcement (.name()), this file for
 * page resolution (.page() + .register()).
 */
import { HubRoute } from './routes';
import { EXAMPLE_PORTAL_NAME } from './constants';

// Register page components (lazy imports — not executed at import time)
HubRoute('').page(
  () => import('../portal/hub/home/page')
);

HubRoute('members').page(
  () => import('../portal/hub/members/page')
);

HubRoute('members/{id}').page(
  () => import('../portal/hub/members/[id]/page')
);

// Register portal metadata: layout, theme, redirect roles
HubRoute.register({
  layout: () => import('../portal/hub/layout'),
  userTheme: false,
  head: {
    // Add portal-specific CSS here if not using a theme
    css: [],
    js: [],
  },
  // Users with 'member' role are redirected here after login
  // redirectRoles: ['member'],
});

export { EXAMPLE_PORTAL_NAME };
