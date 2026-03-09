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
import type { RouteProxyFn } from '@skitsaas/sdk';

const SESSION_COOKIE = 'session';
const ADMIN_LOGIN = '/admin/login';
const SIGN_IN = '/sign-in';
const ADMIN_ROLES = new Set(['admin', 'owner']);

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
  response: NextResponse
): Promise<void> {
  try {
    const authSecret = process.env.AUTH_SECRET?.trim();
    if (!authSecret) return;

    const { jwtVerify, SignJWT } = await import('jose');
    const key = new TextEncoder().encode(authSecret);
    const { payload } = await jwtVerify(cookieValue, key, { algorithms: ['HS256'] });
    const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const refreshed = await new SignJWT(payload as Record<string, unknown>)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresInOneDay)
      .sign(key);

    response.cookies.set({
      name: SESSION_COOKIE,
      value: refreshed,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresInOneDay
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
  const { db } = await import('@/lib/db/drizzle');
  const { authSessions } = await import('@/lib/db/schema');
  const { and, eq } = await import('drizzle-orm');

  return db
    .select({ status: authSessions.status, revokedAt: authSessions.revokedAt })
    .from(authSessions)
    .where(
      and(
        eq(authSessions.tokenJti, tokenJti),
        eq(authSessions.status, 'active')
      )
    )
    .limit(1);
}

// ---------------------------------------------------------------------------
// Proxy implementations
// ---------------------------------------------------------------------------

/**
 * Requires an active session with an admin or owner role.
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
    const res = NextResponse.redirect(new URL(ADMIN_LOGIN, request.url));
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  try {
    const [account, sessionRow] = await Promise.all([
      lookupUser(session.userId),
      lookupSession(session.jti)
    ]);

    if (account.length === 0 || !ADMIN_ROLES.has(account[0]!.role)) {
      const res = NextResponse.redirect(new URL(ADMIN_LOGIN, request.url));
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }

    if (sessionRow.length === 0) {
      // Session was revoked (logout or admin invalidation)
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
    await refreshSessionCookie(cookieValue, res);
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
      const res = NextResponse.redirect(new URL(SIGN_IN, request.url));
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }

    if (sessionRow.length === 0) {
      // Session was revoked (logout or admin invalidation)
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
    await refreshSessionCookie(cookieValue, res);
    return res;
  }

  return null; // continue chain — no cookie to merge
};

/**
 * Requires an active session with admin/owner role.
 * Returns 401/403 JSON — appropriate for API routes (no redirect).
 */
export const proxyApiAdmin: RouteProxyFn = async (request: NextRequest) => {
  const cookieValue = request.cookies.get(SESSION_COOKIE)?.value;

  if (!cookieValue) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await verifySessionCookie(cookieValue);
  if (!session) {
    const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  try {
    const account = await lookupUser(session.userId);
    if (account.length === 0 || !ADMIN_ROLES.has(account[0]!.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await verifySessionCookie(cookieValue);
  if (!session) {
    const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  try {
    const account = await lookupUser(session.userId);
    if (account.length === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } catch (error) {
    console.error('[proxyApiAuth] DB lookup failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

  return null; // continue chain
};

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

  for (const fn of fns) {
    const result = await fn(request);
    if (result === null) continue;

    // Pass-through response with potential cookie mutations — collect and continue.
    if (result.headers.get('x-middleware-next') === '1') {
      result.cookies.getAll().forEach(c => mergedCookies.push(c));
      continue;
    }

    // Blocking response (redirect, 401, 403, etc.) — short-circuit.
    return result;
  }

  const finalResponse = NextResponse.next();
  mergedCookies.forEach(c => finalResponse.cookies.set(c));
  return finalResponse;
}
