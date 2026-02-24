export type ThemeCssArea = 'admin' | 'dashboard' | 'frontend';

function matchesPathPrefix(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function resolveThemeCssAreaFromPath(pathname: string | null | undefined): ThemeCssArea {
  const path = String(pathname ?? '').trim().toLowerCase();

  if (matchesPathPrefix(path, '/admin/login')) {
    return 'admin';
  }

  if (
    matchesPathPrefix(path, '/login') ||
    matchesPathPrefix(path, '/sign-up') ||
    matchesPathPrefix(path, '/sign-in')
  ) {
    return 'dashboard';
  }

  if (matchesPathPrefix(path, '/admin')) {
    return 'admin';
  }

  if (matchesPathPrefix(path, '/dashboard')) {
    return 'dashboard';
  }

  return 'frontend';
}

export function resolveThemeCssAreaFromHref(href: string | null | undefined): ThemeCssArea | null {
  const value = String(href ?? '').trim().toLowerCase();
  if (!value) {
    return null;
  }

  if (value.includes('/.generated/core-assets/admin/')) {
    return 'admin';
  }

  if (value.includes('/.generated/core-assets/dashboard/')) {
    return 'dashboard';
  }

  if (value.includes('/.generated/core-assets/frontend/')) {
    return 'frontend';
  }

  const themeAssetsMatch = value.match(
    /\/\.generated\/theme-assets\/[^/]+\/(admin|dashboard|frontend)\//
  );
  if (!themeAssetsMatch) {
    return null;
  }

  const area = themeAssetsMatch[1];
  if (area === 'admin' || area === 'dashboard' || area === 'frontend') {
    return area;
  }

  return null;
}
