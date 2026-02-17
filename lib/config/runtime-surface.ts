export type AppSurfaceMode = 'full' | 'dashboard-only' | 'admin-only';
export type AppSurfaceArea = 'admin' | 'dashboard' | 'frontend';

const DEFAULT_SURFACE_MODE: AppSurfaceMode = 'full';

function normalizeMode(value: string | null | undefined): AppSurfaceMode {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (
    normalized === 'full' ||
    normalized === 'dashboard-only' ||
    normalized === 'admin-only'
  ) {
    return normalized;
  }

  return DEFAULT_SURFACE_MODE;
}

export function resolveAppSurfaceMode(
  value: string | null | undefined
): AppSurfaceMode {
  return normalizeMode(value);
}

export function getAppSurfaceMode(): AppSurfaceMode {
  return resolveAppSurfaceMode(process.env.APP_SURFACE_MODE);
}

export function isAdminEnabled(mode = getAppSurfaceMode()) {
  return mode === 'full' || mode === 'admin-only';
}

export function isDashboardEnabled(mode = getAppSurfaceMode()) {
  return mode === 'full' || mode === 'dashboard-only';
}

export function isFrontendEnabled(mode = getAppSurfaceMode()) {
  return mode !== 'admin-only';
}

export function isAreaEnabled(area: AppSurfaceArea, mode = getAppSurfaceMode()) {
  if (area === 'admin') {
    return isAdminEnabled(mode);
  }

  if (area === 'dashboard') {
    return isDashboardEnabled(mode);
  }

  return isFrontendEnabled(mode);
}

export function resolveModuleApiSurfaceArea(
  slug: string[] | string | undefined
): AppSurfaceArea | null {
  const segments = Array.isArray(slug)
    ? slug
    : typeof slug === 'string' && slug
      ? [slug]
      : [];
  const firstSegment = segments[0]?.trim().toLowerCase();
  if (firstSegment === 'admin' || firstSegment === 'dashboard') {
    return firstSegment;
  }

  if (firstSegment === 'frontend' || firstSegment === 'public') {
    return 'frontend';
  }

  return null;
}
