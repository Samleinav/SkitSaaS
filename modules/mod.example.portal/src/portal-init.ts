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

HubRoute('register').page(
  () => import('../portal/hub/register/page')
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
  // coreCss: true        → default: loads frontend core CSS (globals + Tailwind)
  // coreCss: 'dashboard' → loads dashboard core CSS instead
  // coreCss: false       → no core CSS, bring your own via head.css
  // head: { css: ['/my-portal.css'], js: [] },  // extra CSS/JS after core
  coreCss: true,
  // Users with role 'hubrole' are redirected here directly after login
  redirectRoles: ['hubrole'],
});

export { EXAMPLE_PORTAL_NAME };
