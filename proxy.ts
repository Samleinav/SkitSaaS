import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { signToken, verifyToken } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import {
  getAppSurfaceMode,
  type AppSurfaceMode
} from '@/lib/config/runtime-surface';

const DASHBOARD_ROOT = '/dashboard';
const ADMIN_ROOT = '/admin';
const LEGACY_SIGN_IN = '/sign-in';
const ADMIN_LOGIN = '/admin/login';
const PUBLIC_AUTH_ROUTES = new Set(['/login', '/sign-in', '/sign-up', ADMIN_LOGIN]);

function matchesAreaRoute(pathname: string, basePath: string) {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

function isDashboardRoute(pathname: string) {
  return matchesAreaRoute(pathname, DASHBOARD_ROOT);
}

function isAdminRoute(pathname: string) {
  return matchesAreaRoute(pathname, ADMIN_ROOT);
}

export function isPathDisabledBySurfaceMode(
  pathname: string,
  mode: AppSurfaceMode = getAppSurfaceMode()
) {
  if (mode === 'dashboard-only') {
    return isAdminRoute(pathname);
  }

  if (mode === 'admin-only') {
    return !isAdminRoute(pathname);
  }

  return false;
}

export function isPublicAuthRoute(pathname: string) {
  return PUBLIC_AUTH_ROUTES.has(pathname);
}

export function resolveUnauthenticatedRedirect(pathname: string) {
  if (isAdminRoute(pathname) && !isPublicAuthRoute(pathname)) {
    return ADMIN_LOGIN;
  }

  if (isDashboardRoute(pathname)) {
    return LEGACY_SIGN_IN;
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPathDisabledBySurfaceMode(pathname)) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const sessionCookie = request.cookies.get('session');
  const unauthenticatedRedirect = resolveUnauthenticatedRedirect(pathname);
  const isProtectedRoute = unauthenticatedRedirect !== null;

  if (isProtectedRoute && !sessionCookie) {
    return NextResponse.redirect(new URL(unauthenticatedRedirect, request.url));
  }

  let res = NextResponse.next();

  if (sessionCookie && request.method === 'GET') {
    try {
      const parsed = await verifyToken(sessionCookie.value);

      if (
        isProtectedRoute &&
        (!parsed?.user || typeof parsed.user.id !== 'number')
      ) {
        res.cookies.delete('session');
        return NextResponse.redirect(new URL(unauthenticatedRedirect, request.url));
      }

      if (isProtectedRoute && typeof parsed?.user?.id === 'number') {
        const account = await db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.id, parsed.user.id),
              isNull(users.deletedAt),
              eq(users.accountStatus, 'active')
            )
          )
          .limit(1);

        if (account.length === 0) {
          res.cookies.delete('session');
          return NextResponse.redirect(new URL(unauthenticatedRedirect, request.url));
        }
      }

      const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);

      res.cookies.set({
        name: 'session',
        value: await signToken({
          ...parsed,
          expires: expiresInOneDay.toISOString()
        }),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresInOneDay
      });
    } catch (error) {
      console.error('Error updating session:', error);
      res.cookies.delete('session');
      if (isProtectedRoute) {
        return NextResponse.redirect(new URL(unauthenticatedRedirect, request.url));
      }
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
