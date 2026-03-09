import { NextResponse } from 'next/server';
const SESSION_COOKIE = 'session';
const ADMIN_LOGIN = '/admin/login';
const SIGN_IN = '/sign-in';
const ADMIN_ROLES = new Set(['admin', 'owner']);
// ---------------------------------------------------------------------------
// Session helpers (inline to avoid Edge-incompatible imports)
// ---------------------------------------------------------------------------
async function verifySessionCookie(cookieValue) {
    try {
        const authSecret = process.env.AUTH_SECRET?.trim();
        if (!authSecret)
            return null;
        const { jwtVerify } = await import('jose');
        const key = new TextEncoder().encode(authSecret);
        const { payload } = await jwtVerify(cookieValue, key, {
            algorithms: ['HS256']
        });
        const userId = payload.user?.id;
        if (typeof userId !== 'number')
            return null;
        const expires = payload.expires;
        if (typeof expires === 'string' && new Date(expires) <= new Date()) {
            return null;
        }
        return { userId, jti: payload.jti ?? null };
    }
    catch {
        return null;
    }
}
async function refreshSessionCookie(cookieValue, response) {
    try {
        const session = await verifySessionCookie(cookieValue);
        if (!session)
            return;
        const authSecret = process.env.AUTH_SECRET?.trim();
        if (!authSecret)
            return;
        const { SignJWT } = await import('jose');
        const key = new TextEncoder().encode(authSecret);
        const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const { payload } = await (await import('jose')).jwtVerify(cookieValue, key, {
            algorithms: ['HS256']
        });
        const refreshed = await new SignJWT(payload)
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
    }
    catch {
        // Ignore refresh errors — the existing session is still valid.
    }
}
// ---------------------------------------------------------------------------
// Built-in proxy functions
// ---------------------------------------------------------------------------
/**
 * Verifies session JWT + DB lookup that user is active and has an admin role.
 * Redirects to /admin/login on failure.
 */
export const proxyAdmin = async (request) => {
    const cookieValue = request.cookies.get(SESSION_COOKIE)?.value;
    if (!cookieValue) {
        return NextResponse.redirect(new URL(ADMIN_LOGIN, request.url));
    }
    const session = await verifySessionCookie(cookieValue);
    if (!session) {
        const res = NextResponse.redirect(new URL(ADMIN_LOGIN, request.url));
        res.cookies.delete(SESSION_COOKIE);
        return res;
    }
    try {
        const { db } = await import('@/lib/db/drizzle');
        const { users } = await import('@/lib/db/schema');
        const { and, eq, isNull } = await import('drizzle-orm');
        const account = await db
            .select({ id: users.id, role: users.role })
            .from(users)
            .where(and(eq(users.id, session.userId), isNull(users.deletedAt), eq(users.accountStatus, 'active')))
            .limit(1);
        if (account.length === 0 || !ADMIN_ROLES.has(account[0].role)) {
            const res = NextResponse.redirect(new URL(ADMIN_LOGIN, request.url));
            res.cookies.delete(SESSION_COOKIE);
            return res;
        }
    }
    catch (error) {
        console.error('[proxyAdmin] DB lookup failed:', error);
        const res = NextResponse.redirect(new URL(ADMIN_LOGIN, request.url));
        res.cookies.delete(SESSION_COOKIE);
        return res;
    }
    // Session valid + admin role confirmed → continue, refresh cookie on GET.
    const res = NextResponse.next();
    if (request.method === 'GET') {
        await refreshSessionCookie(cookieValue, res);
    }
    return null; // continue chain
};
/**
 * Verifies session JWT + DB lookup that user is active (any role).
 * Redirects to /sign-in on failure.
 */
export const proxyAuth = async (request) => {
    const cookieValue = request.cookies.get(SESSION_COOKIE)?.value;
    if (!cookieValue) {
        return NextResponse.redirect(new URL(SIGN_IN, request.url));
    }
    const session = await verifySessionCookie(cookieValue);
    if (!session) {
        const res = NextResponse.redirect(new URL(SIGN_IN, request.url));
        res.cookies.delete(SESSION_COOKIE);
        return res;
    }
    try {
        const { db } = await import('@/lib/db/drizzle');
        const { users } = await import('@/lib/db/schema');
        const { and, eq, isNull } = await import('drizzle-orm');
        const account = await db
            .select({ id: users.id })
            .from(users)
            .where(and(eq(users.id, session.userId), isNull(users.deletedAt), eq(users.accountStatus, 'active')))
            .limit(1);
        if (account.length === 0) {
            const res = NextResponse.redirect(new URL(SIGN_IN, request.url));
            res.cookies.delete(SESSION_COOKIE);
            return res;
        }
    }
    catch (error) {
        console.error('[proxyAuth] DB lookup failed:', error);
        const res = NextResponse.redirect(new URL(SIGN_IN, request.url));
        res.cookies.delete(SESSION_COOKIE);
        return res;
    }
    // Session valid → continue, refresh cookie on GET.
    const res = NextResponse.next();
    if (request.method === 'GET') {
        await refreshSessionCookie(cookieValue, res);
    }
    return null; // continue chain
};
/**
 * Blocks access if the area is disabled by the app surface mode config.
 */
export function proxySurfaceArea(area) {
    return async (_request) => {
        const { isAreaEnabled } = await import('@/lib/config/runtime-surface');
        if (!isAreaEnabled(area)) {
            return new NextResponse('Not Found', { status: 404 });
        }
        return null; // continue chain
    };
}
// ---------------------------------------------------------------------------
// Chain executor
// ---------------------------------------------------------------------------
/**
 * Execute proxy functions in order.
 * Returns the first non-null response (short-circuit), or NextResponse.next().
 */
export async function executeProxyChain(fns, request) {
    for (const fn of fns) {
        const result = await fn(request);
        if (result !== null) {
            return result;
        }
    }
    return NextResponse.next();
}
