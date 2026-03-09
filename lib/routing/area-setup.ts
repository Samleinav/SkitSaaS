/**
 * Area proxy setup — must be imported BEFORE any file that calls
 * RouteAdmin() or RouteDashboard(), so the area defaults are in place
 * when routes capture their proxy chains.
 *
 * This module has side-effects:
 *  - Configures the global area defaults (proxy chains per area)
 *  - Configures area base URLs from env vars (for multi-service deployments)
 *  - Injects API auth proxies for ApiMethodRouteBuilder .auth() support
 *  - Configures API CORS when ROUTE_API_CORS_ORIGINS is set
 */
import {
  configureAreaDefaults,
  configureAreaBases,
  configureApiAuthProxies,
  configureApiCors,
} from '@skitsaas/sdk';
import type { NextRequest } from 'next/server';
import { proxyAdmin, proxyAuth, proxyApiAdmin, proxyApiAuth } from './proxies';

configureAreaDefaults({
  admin: [proxyAdmin],
  dashboard: [proxyAuth]
});

// ---------------------------------------------------------------------------
// Area base URLs — configurable for multi-service deployments.
// Each env var overrides the default same-host prefix for that area.
//
// NEXT_PUBLIC_ prefix: values must be available in both server and client
// bundles (for URL generation in React components / Link hrefs).
//
// Examples:
//   NEXT_PUBLIC_ROUTE_BASE_API=https://api.myapp.com
//   NEXT_PUBLIC_ROUTE_BASE_ADMIN=https://admin.myapp.com
// ---------------------------------------------------------------------------
configureAreaBases({
  ...(process.env.NEXT_PUBLIC_ROUTE_BASE_ADMIN
    ? { admin: process.env.NEXT_PUBLIC_ROUTE_BASE_ADMIN }
    : {}),
  ...(process.env.NEXT_PUBLIC_ROUTE_BASE_DASHBOARD
    ? { dashboard: process.env.NEXT_PUBLIC_ROUTE_BASE_DASHBOARD }
    : {}),
  ...(process.env.NEXT_PUBLIC_ROUTE_BASE_FRONTEND
    ? { frontend: process.env.NEXT_PUBLIC_ROUTE_BASE_FRONTEND }
    : {}),
  ...(process.env.NEXT_PUBLIC_ROUTE_BASE_API
    ? { api: process.env.NEXT_PUBLIC_ROUTE_BASE_API }
    : {}),
});

// ---------------------------------------------------------------------------
// API CORS — configure when the API is on a separate origin.
// ROUTE_API_CORS_ORIGINS: comma-separated allowed origins.
//   e.g. https://app.myapp.com,https://admin.myapp.com
// Use '*' for a fully public API.
// ---------------------------------------------------------------------------
const corsOrigins = process.env.ROUTE_API_CORS_ORIGINS;
if (corsOrigins) {
  configureApiCors({
    allowedOrigins: corsOrigins.split(',').map((o) => o.trim()).filter(Boolean),
  });
}

// Inject auth proxies for typed API routes (.auth('user') / .auth('admin')).
// Cast through Request because proxyApiAdmin/proxyApiAuth accept NextRequest,
// but ApiRouteProxyFn uses the standard Request type for module compatibility.
configureApiAuthProxies({
  user:  (req) => proxyApiAuth(req as NextRequest),
  admin: (req) => proxyApiAdmin(req as NextRequest),
});
