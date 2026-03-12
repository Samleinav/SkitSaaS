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
import { matchRouteProxyChain, portalPrefixSet } from '@skitsaas/sdk';
import { executeProxyChain } from '@/lib/routing/proxies';

const PORTAL_INTERNAL_PREFIX = '/portal-internal';

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
  const { NextResponse } = await import('next/server');

  // Block direct access to internal portal dispatch path (only reachable via internal rewrite)
  if (pathname === PORTAL_INTERNAL_PREFIX || pathname.startsWith(`${PORTAL_INTERNAL_PREFIX}/`)) {
    return new NextResponse(null, { status: 404 });
  }

  // Surface mode gating (disabled areas → 404 before any auth check)
  if (isPathDisabledBySurfaceMode(pathname)) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Resolve and execute the proxy chain for this path.
  // matchRouteProxyChain returns area-level defaults if no named route matches.
  const chain = matchRouteProxyChain(pathname);

  // Portal routes — run auth proxy chain, then rewrite to internal dispatcher
  // so the portal page is served without the (frontend) marketing layout.
  const firstSegment = pathname.split('/').filter(Boolean)[0] ?? '';
  if (firstSegment && portalPrefixSet.has(firstSegment)) {
    const proxyResult = await executeProxyChain(chain, request);
    // Honor blocking responses (redirects to login, 4xx, etc.)
    if (proxyResult.headers.get('x-middleware-next') !== '1') {
      return proxyResult;
    }
    // Pass-through → rewrite to internal portal dispatcher
    const url = request.nextUrl.clone();
    url.pathname = `${PORTAL_INTERNAL_PREFIX}${pathname}`;
    const rewriteResponse = NextResponse.rewrite(url);
    // Forward any cookies set by the proxy chain (e.g., refreshed session)
    proxyResult.cookies.getAll().forEach(c => rewriteResponse.cookies.set(c));
    return rewriteResponse;
  }

  return executeProxyChain(chain, request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
