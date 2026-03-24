/**
 * Built-in proxy functions for route authentication and authorization.
 *
 * These live in the host project because they need access to the DB,
 * session management, and runtime config.
 *
 * Use them with RouteBuilder.proxy([...]) or via configureAreaDefaults().
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { ApiRouteProxyFn, RateLimitConfig, RouteProxyFn } from '@skitsaas/sdk';
import { enrichUser } from '@skitsaas/sdk';
import { createAuthAuditLog } from '@/lib/auth/audit';
import {
  getOrCreateRequestId,
  setResponseRequestIdHeader
} from '@/lib/observability/request-id';

const SESSION_COOKIE = 'session';
const ADMIN_LOGIN = '/admin/login';
const SIGN_IN = '/sign-in';

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

async function verifySessionCookie(
  cookieValue: string
): Promise<{ userId: number; jti?: string | null } | null> {
  try {
    const authSecret = process.env.AUTH_SECRET?.trim();
    if (!authSecret) return null;

    const { jwtVerify } = await import('jose');
    const key = new TextEncoder().encode(authSecret);
    const { payload } = await jwtVerify(cookieValue, key, {
      algorithms: ['HS256']
    });

    const userId = (payload as { user?: { id?: unknown } }).user?.id;
    if (typeof userId !== 'number') return null;

    const expires = (payload as { expires?: unknown }).expires;
    if (typeof expires === 'string' && new Date(expires) <= new Date()) {
      return null;
    }

    return { userId, jti: (payload as { jti?: string }).jti ?? null };
  } catch {
    return null;
  }
}

async function refreshSessionCookie(
  cookieValue: string,
  request: Request,
  response: NextResponse
): Promise<void> {
  try {
    const { refreshSignedSessionToken } = await import('@/lib/auth/session');
    const { resolveClientIp } = await import('@/lib/auth/rate-limit');
    const refreshed = await refreshSignedSessionToken(cookieValue, Date.now(), {
      syncPersistedSession: true,
      ipAddress: resolveClientIp(request),
      userAgent: request.headers.get('user-agent')
    });
    if (!refreshed) {
      return;
    }

    response.cookies.set({
      name: SESSION_COOKIE,
      value: refreshed.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: refreshed.expiresAt
    });
  } catch {
    // Ignore refresh errors — the existing session is still valid.
  }
}

async function lookupUser(userId: number) {
  const { db } = await import('@/lib/db/drizzle');
  const { users } = await import('@/lib/db/schema');
  const { and, eq, isNull } = await import('drizzle-orm');

  return db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(
      and(
        eq(users.id, userId),
        isNull(users.deletedAt),
        eq(users.accountStatus, 'active')
      )
    )
    .limit(1);
}

/**
 * Verifies the session has not been revoked in auth_sessions.
 * All sessions created by setSession() have a tokenJti.
 * A null/missing jti is treated as invalid.
 */
async function lookupSession(tokenJti: string) {
  const { getActivePersistedAuthSessionByTokenJti } = await import(
    '@/lib/auth/session-store'
  );
  return getActivePersistedAuthSessionByTokenJti(tokenJti);
}

async function auditProxySessionFailure({
  channel = 'proxy',
  request,
  action,
  status,
  message,
  actorUserId,
  metadata
}: {
  channel?: 'proxy' | 'api';
  request: Request;
  action: string;
  status: 'warning' | 'failed';
  message: string;
  actorUserId?: number | null;
  metadata?: Record<string, unknown>;
}) {
  await createAuthAuditLog({
    eventType: `auth.${channel}.${action}`,
    action,
    status,
    request,
    actorUserId: actorUserId ?? null,
    message,
    metadata
  });
}

// ---------------------------------------------------------------------------
// Proxy implementations
// ---------------------------------------------------------------------------

/**
 * Requires an active session with an admin-area role.
 * Default admin area role is `admin`; `owner` stays a dashboard/team role unless
 * the host explicitly configures otherwise.
 * Also verifies the session has not been revoked in auth_sessions (JTI check).
 * Redirects to /admin/login on failure.
 */
export const proxyAdmin: RouteProxyFn = async (request: NextRequest) => {
  const cookieValue = request.cookies.get(SESSION_COOKIE)?.value;

  if (!cookieValue) {
    return NextResponse.redirect(new URL(ADMIN_LOGIN, request.url));
  }

  const session = await verifySessionCookie(cookieValue);
  if (!session || !session.jti) {
    await auditProxySessionFailure({
      request,
      action: 'invalid_cookie',
      status: 'warning',
      message: 'Admin proxy rejected an invalid or unverifiable session cookie.'
    });
    const res = NextResponse.redirect(new URL(ADMIN_LOGIN, request.url));
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  try {
    const [account, sessionRow] = await Promise.all([
      lookupUser(session.userId),
      lookupSession(session.jti)
    ]);

    if (account.length === 0 || !enrichUser({ id: 0, role: account[0]!.role }).isAdmin()) {
      await auditProxySessionFailure({
        request,
        action: 'admin_denied',
        status: 'warning',
        actorUserId: session.userId,
        message: 'Admin proxy rejected a session without admin access.'
      });
      const res = NextResponse.redirect(new URL(ADMIN_LOGIN, request.url));
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }

    if (!sessionRow) {
      // Session was revoked (logout or admin invalidation)
      await auditProxySessionFailure({
        request,
        action: 'session_revoked',
        status: 'warning',
        actorUserId: session.userId,
        message: 'Admin proxy rejected a revoked or expired persisted session.'
      });
      const res = NextResponse.redirect(new URL(ADMIN_LOGIN, request.url));
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }
  } catch (error) {
    console.error('[proxyAdmin] DB lookup failed:', error);
    const res = NextResponse.redirect(new URL(ADMIN_LOGIN, request.url));
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  // Return next() so executeProxyChain can merge the refreshed cookie.
  if (request.method === 'GET') {
    const res = NextResponse.next();
    await refreshSessionCookie(cookieValue, request, res);
    return res;
  }

  return null; // continue chain — no cookie to merge
};

/**
 * Requires an active session (any role).
 * Also verifies the session has not been revoked in auth_sessions (JTI check).
 * Redirects to /sign-in on failure.
 */
export const proxyAuth: RouteProxyFn = async (request: NextRequest) => {
  const cookieValue = request.cookies.get(SESSION_COOKIE)?.value;

  if (!cookieValue) {
    return NextResponse.redirect(new URL(SIGN_IN, request.url));
  }

  const session = await verifySessionCookie(cookieValue);
  if (!session || !session.jti) {
    await auditProxySessionFailure({
      request,
      action: 'invalid_cookie',
      status: 'warning',
      message: 'Dashboard proxy rejected an invalid or unverifiable session cookie.'
    });
    const res = NextResponse.redirect(new URL(SIGN_IN, request.url));
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  try {
    const [account, sessionRow] = await Promise.all([
      lookupUser(session.userId),
      lookupSession(session.jti)
    ]);

    if (account.length === 0) {
      await auditProxySessionFailure({
        request,
        action: 'unknown_subject',
        status: 'warning',
        actorUserId: session.userId,
        message: 'Dashboard proxy rejected a session whose user account is unavailable.'
      });
      const res = NextResponse.redirect(new URL(SIGN_IN, request.url));
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }

    if (!sessionRow) {
      // Session was revoked (logout or admin invalidation)
      await auditProxySessionFailure({
        request,
        action: 'session_revoked',
        status: 'warning',
        actorUserId: session.userId,
        message: 'Dashboard proxy rejected a revoked or expired persisted session.'
      });
      const res = NextResponse.redirect(new URL(SIGN_IN, request.url));
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }
  } catch (error) {
    console.error('[proxyAuth] DB lookup failed:', error);
    const res = NextResponse.redirect(new URL(SIGN_IN, request.url));
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  // Return next() so executeProxyChain can merge the refreshed cookie.
  if (request.method === 'GET') {
    const res = NextResponse.next();
    await refreshSessionCookie(cookieValue, request, res);
    return res;
  }

  return null; // continue chain — no cookie to merge
};

/**
 * Requires an active session with an admin-area role.
 * Default admin area role is `admin`; `owner` stays a dashboard/team role unless
 * the host explicitly configures otherwise.
 * Returns 401/403 JSON — appropriate for API routes (no redirect).
 */
export const proxyApiAdmin: RouteProxyFn = async (request: NextRequest) => {
  const cookieValue = request.cookies.get(SESSION_COOKIE)?.value;

  if (!cookieValue) {
    await auditProxySessionFailure({
      channel: 'api',
      request,
      action: 'missing_cookie',
      status: 'warning',
      message: 'Admin API proxy rejected a request without a session cookie.'
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await verifySessionCookie(cookieValue);
  if (!session || !session.jti) {
    await auditProxySessionFailure({
      channel: 'api',
      request,
      action: 'invalid_cookie',
      status: 'warning',
      message: 'Admin API proxy rejected an invalid or unverifiable session cookie.'
    });
    const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  try {
    const [account, sessionRow] = await Promise.all([
      lookupUser(session.userId),
      lookupSession(session.jti)
    ]);

    if (account.length === 0 || !enrichUser({ id: 0, role: account[0]!.role }).isAdmin()) {
      await auditProxySessionFailure({
        channel: 'api',
        request,
        action: 'admin_denied',
        status: 'warning',
        actorUserId: session.userId,
        message: 'Admin API proxy rejected a session without admin access.'
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!sessionRow) {
      await auditProxySessionFailure({
        channel: 'api',
        request,
        action: 'session_revoked',
        status: 'warning',
        actorUserId: session.userId,
        message: 'Admin API proxy rejected a revoked or expired persisted session.'
      });
      const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }
  } catch (error) {
    console.error('[proxyApiAdmin] DB lookup failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

  return null; // continue chain
};

/**
 * Requires an active session (any role).
 * Returns 401 JSON — appropriate for API routes (no redirect).
 */
export const proxyApiAuth: RouteProxyFn = async (request: NextRequest) => {
  const cookieValue = request.cookies.get(SESSION_COOKIE)?.value;

  if (!cookieValue) {
    await auditProxySessionFailure({
      channel: 'api',
      request,
      action: 'missing_cookie',
      status: 'warning',
      message: 'Dashboard API proxy rejected a request without a session cookie.'
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await verifySessionCookie(cookieValue);
  if (!session || !session.jti) {
    await auditProxySessionFailure({
      channel: 'api',
      request,
      action: 'invalid_cookie',
      status: 'warning',
      message: 'Dashboard API proxy rejected an invalid or unverifiable session cookie.'
    });
    const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  try {
    const [account, sessionRow] = await Promise.all([
      lookupUser(session.userId),
      lookupSession(session.jti)
    ]);

    if (account.length === 0) {
      await auditProxySessionFailure({
        channel: 'api',
        request,
        action: 'unknown_subject',
        status: 'warning',
        actorUserId: session.userId,
        message: 'Dashboard API proxy rejected a session whose user account is unavailable.'
      });
      const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }

    if (!sessionRow) {
      await auditProxySessionFailure({
        channel: 'api',
        request,
        action: 'session_revoked',
        status: 'warning',
        actorUserId: session.userId,
        message: 'Dashboard API proxy rejected a revoked or expired persisted session.'
      });
      const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }
  } catch (error) {
    console.error('[proxyApiAuth] DB lookup failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

  return null; // continue chain
};

/**
 * Requires the team system to be enabled.
 * Returns 404 JSON so callers do not leak disabled capability details.
 */
export const proxyApiTeamsEnabled: ApiRouteProxyFn = async () => {
  const { areTeamsEnabled } = await import('@/lib/organizations/config');
  if (areTeamsEnabled()) {
    return null;
  }

  return NextResponse.json({ error: 'Team system is disabled.' }, { status: 404 });
};

/**
 * Guards /api/forms/validate based on the target form's access scope.
 *
 * - Public forms pass through (return null).
 * - User-scoped forms require a valid session.
 * - Admin-scoped forms additionally require an admin-area role.
 *
 * The request body is cloned to avoid consuming the stream before the handler reads it.
 */
export const proxyBuildFormValidateAccess: ApiRouteProxyFn = async (request: Request) => {
  let formId: string | undefined;
  try {
    const body = (await request.clone().json()) as { formId?: unknown };
    if (typeof body.formId === 'string') formId = body.formId;
  } catch {
    // Non-JSON body — let the handler validate the request
  }

  if (!formId) return null;

  const { resolveBuildFormControllerCatalogEntry } = await import('@/lib/forms/registry-catalog');
  const entry = resolveBuildFormControllerCatalogEntry(formId);

  // Unknown form or public scope — pass through; the handler will reject unknown forms
  if (!entry || entry.access === 'public') return null;

  const cookieValue = request.headers.get('cookie')?.match(/(?:^|;\s*)session=([^;]+)/)?.[1];
  if (!cookieValue) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await verifySessionCookie(cookieValue);
  if (!session || !session.jti) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (entry.access === 'admin') {
    const [accounts, sessionRow] = await Promise.all([
      lookupUser(session.userId),
      lookupSession(session.jti)
    ]);

    if (!sessionRow) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (accounts.length === 0 || !enrichUser({ id: 0, role: accounts[0]!.role }).isAdmin()) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else {
    // user scope — verify the session has not been revoked
    const sessionRow = await lookupSession(session.jti);
    if (!sessionRow) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return null;
};

// ---------------------------------------------------------------------------
// Rate limit proxy factory
// ---------------------------------------------------------------------------

/**
 * Creates an API proxy that enforces a rate limit using the configured backend.
 *
 * Usage in area-setup.ts or individual route files:
 *
 *   import { proxyRateLimit } from '@/lib/routing/proxies';
 *
 *   // Default: 60 req / 60 s per userId (or IP for unauthenticated)
 *   configureApiAuthProxies({
 *     user: async (req) => (await proxyApiAuth(req)) ?? proxyRateLimit({ ... })(req),
 *   });
 *
 * Configure a production-grade backend (e.g. Upstash Redis) via
 * configureRateLimitBackend() in lib/modules/sdk-server-bootstrap.ts.
 * Without a backend, in-memory counters are used (single-process only).
 */
export function proxyRateLimit(config: RateLimitConfig): ApiRouteProxyFn {
  return async (request: Request) => {
    const { checkRateLimit } = await import('@/lib/routing/rate-limit');
    const result = await checkRateLimit(config, request);
    if (result.limited) {
      const headers = new Headers();
      if (typeof result.retryAfterSeconds === 'number') {
        headers.set('Retry-After', String(Math.ceil(result.retryAfterSeconds)));
      }
      return Response.json({ error: 'Too many requests.' }, { status: 429, headers });
    }
    return null;
  };
}

/**
 * Restricts page access to users whose role is in the allowlist.
 * The role is read from the DB to prevent stale-JWT role spoofing.
 * Unauthenticated requests are redirected to /sign-in.
 * Authenticated users with the wrong role are redirected to /dashboard.
 *
 * Typically used with proxyAuth in a portal proxy chain:
 * @example
 * // routes.ts (portal module)
 * const SchoolRoute = RoutePortal('school').proxy([proxyAuth, proxyRoles(['teacher'])]);
 * // or as a standalone shorthand (handles both auth + role check):
 * const SchoolRoute = RoutePortal('school').proxy([proxyRoles(['teacher'])]);
 */
export function proxyRoles(allowedRoles: string[]): RouteProxyFn {
  const allowedSet = new Set(allowedRoles);
  return async (request: NextRequest) => {
    const cookieValue = request.cookies.get(SESSION_COOKIE)?.value;
    if (!cookieValue) {
      return NextResponse.redirect(new URL(SIGN_IN, request.url));
    }

    const session = await verifySessionCookie(cookieValue);
    if (!session || !session.jti) {
      const res = NextResponse.redirect(new URL(SIGN_IN, request.url));
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }

    try {
      const account = await lookupUser(session.userId);
      if (account.length === 0) {
        const res = NextResponse.redirect(new URL(SIGN_IN, request.url));
        res.cookies.delete(SESSION_COOKIE);
        return res;
      }

      if (!allowedSet.has(account[0]!.role)) {
        // Authenticated but wrong role — send to dashboard, not login
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch (error) {
      console.error('[proxyRoles] DB lookup failed:', error);
      return NextResponse.redirect(new URL(SIGN_IN, request.url));
    }

    return null; // role allowed — continue chain
  };
}

/**
 * Creates an API proxy that restricts access to users whose role is in the allowlist.
 * Runs after the auth proxy in the chain (session is already verified at this point).
 *
 * Inject via configureApiAuthProxies({ roleCheck: (roles) => proxyApiRoles(roles) }).
 * The role is read from the DB to prevent stale-JWT role spoofing.
 *
 * @example
 * // area-setup.ts
 * configureApiAuthProxies({ roleCheck: (roles) => proxyApiRoles(roles) })
 *
 * // routes.ts (module)
 * RouteApi('/api/modules/mod.school/reports').GET().auth('user').roles('owner', 'teacher')
 */
export function proxyApiRoles(allowedRoles: string[]): ApiRouteProxyFn {
  const allowedSet = new Set(allowedRoles);
  return async (request: Request) => {
    const cookieValue = request.headers.get('cookie')?.match(/(?:^|;\s*)session=([^;]+)/)?.[1];
    if (!cookieValue) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await verifySessionCookie(cookieValue);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const account = await lookupUser(session.userId);
    if (account.length === 0) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!allowedSet.has(account[0]!.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    return null; // role allowed — continue chain
  };
}

// ---------------------------------------------------------------------------
// Chain executor
// ---------------------------------------------------------------------------

/**
 * Execute proxy functions in order.
 *
 * - null          → no-op, continue to next proxy
 * - NextResponse.next() (x-middleware-next: 1) → pass-through with cookie
 *   mutations (e.g. refreshed session cookie). Cookies are collected and
 *   merged into the final response so they reach the browser.
 * - Any other response (redirect, 4xx) → short-circuit immediately.
 */
export async function executeProxyChain(
  fns: RouteProxyFn[],
  request: NextRequest
): Promise<NextResponse> {
  type ResponseCookie = ReturnType<NextResponse['cookies']['getAll']>[number];
  const mergedCookies: ResponseCookie[] = [];
  const requestId = getOrCreateRequestId(request);

  for (const fn of fns) {
    const result = await fn(request);
    if (result === null) continue;

    // Pass-through response with potential cookie mutations — collect and continue.
    if (result.headers.get('x-middleware-next') === '1') {
      result.cookies.getAll().forEach(c => mergedCookies.push(c));
      continue;
    }

    // Blocking response (redirect, 401, 403, etc.) — short-circuit.
    return setResponseRequestIdHeader(result, requestId);
  }

  const finalResponse = NextResponse.next();
  mergedCookies.forEach(c => finalResponse.cookies.set(c));
  return setResponseRequestIdHeader(finalResponse, requestId);
}
