import { enrichUser } from '@skitsaas/sdk';

export type BuildFormAccessScope = 'public' | 'user' | 'admin';
export type BuildFormArea = 'admin' | 'dashboard' | 'frontend';

export function normalizeBuildFormArea(value: unknown): BuildFormArea | null {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  if (normalized === 'admin' || normalized === 'dashboard' || normalized === 'frontend') {
    return normalized;
  }

  if (normalized === 'public') {
    return 'frontend';
  }

  return null;
}

export function normalizeBuildFormAccessScope(
  value: unknown
): BuildFormAccessScope | null {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  if (normalized === 'public' || normalized === 'user' || normalized === 'admin') {
    return normalized;
  }

  return null;
}

export function isTrustedBuildFormPreflightRequest(request: Request) {
  const originHeader = request.headers.get('origin')?.trim();
  // Require the Origin header. Browser fetch/XHR always includes it for POST
  // requests. Rejecting absent-Origin blocks non-browser clients that haven't
  // explicitly set it, preventing CSRF from server-side forged requests.
  if (!originHeader) {
    return false;
  }

  let origin: URL;
  let requestUrl: URL;

  try {
    origin = new URL(originHeader);
    requestUrl = new URL(request.url);
  } catch {
    return false;
  }

  const forwardedHost = request.headers.get('x-forwarded-host')?.trim();
  const hostHeader = request.headers.get('host')?.trim();
  const requestHost = forwardedHost || hostHeader || requestUrl.host;

  if (!requestHost) {
    return false;
  }

  return origin.host === requestHost;
}

export function isBuildFormAdminRole(value: unknown) {
  return enrichUser({ id: 0, role: String(value ?? '').trim().toLowerCase() }).isAdmin();
}
