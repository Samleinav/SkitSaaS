/**
 * Next.js v16+ proxy (formerly middleware).
 *
 * Proxy chains are composable: each route carries area-level defaults
 * (proxyAdmin for /admin/*, proxyAuth for /dashboard/*) plus any per-route
 * extras registered via RouteBuilder.proxy([...]).
 *
 * The registry is populated via lib/routing/all-routes.ts.
 * Add module route files there to include their custom proxy chains.
 */
import '@/lib/routing/all-routes';

import type { NextRequest } from 'next/server';
import type { AppSurfaceMode } from '@/lib/config/runtime-surface';
import {
  getAppSurfaceMode
} from '@/lib/config/runtime-surface';
import { matchRouteProxyChain } from '@skitsaas/sdk';
import { executeProxyChain } from '@/lib/routing/proxies';

// ---------------------------------------------------------------------------
// Legacy helper exports — kept for backward compatibility with existing tests
// ---------------------------------------------------------------------------

const DASHBOARD_ROOT = '/dashboard';
const ADMIN_ROOT = '/admin';
const LEGACY_SIGN_IN = '/sign-in';
const ADMIN_LOGIN = '/admin/login';
const PUBLIC_AUTH_ROUTES = new Set(['/login', '/sign-in', '/sign-up', ADMIN_LOGIN]);

function matchesAreaRoute(pathname: string, basePath: string) {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

export function isPathDisabledBySurfaceMode(
  pathname: string,
  mode: AppSurfaceMode = getAppSurfaceMode()
) {
  if (mode === 'dashboard-only') {
    return matchesAreaRoute(pathname, ADMIN_ROOT);
  }

  if (mode === 'admin-only') {
    return !matchesAreaRoute(pathname, ADMIN_ROOT);
  }

  return false;
}

export function isPublicAuthRoute(pathname: string) {
  return PUBLIC_AUTH_ROUTES.has(pathname);
}

export function resolveUnauthenticatedRedirect(pathname: string) {
  if (matchesAreaRoute(pathname, ADMIN_ROOT) && !isPublicAuthRoute(pathname)) {
    return ADMIN_LOGIN;
  }

  if (matchesAreaRoute(pathname, DASHBOARD_ROOT)) {
    return LEGACY_SIGN_IN;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Proxy function
// ---------------------------------------------------------------------------

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Surface mode gating (disabled areas → 404 before any auth check)
  if (isPathDisabledBySurfaceMode(pathname)) {
    const { NextResponse } = await import('next/server');
    return new NextResponse('Not Found', { status: 404 });
  }

  // Resolve and execute the proxy chain for this path.
  // matchRouteProxyChain returns area-level defaults if no named route matches.
  const chain = matchRouteProxyChain(pathname);
  return executeProxyChain(chain, request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
