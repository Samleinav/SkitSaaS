import {
  dashboardPortalSet,
  portalPrefixSet,
  type SearchArea,
  type SearchContextTag,
  type SearchDashboardContextType,
  type SearchPortalRouteArea
} from '@skitsaas/sdk';

export type ResolvedSearchSurface = {
  area: SearchArea;
  pathname: string;
  portalName: string | null;
  portalRouteArea: SearchPortalRouteArea | null;
};

function normalizePathSegment(value: string | undefined) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeSearchPath(path: string | null | undefined) {
  const raw = String(path ?? '').trim();

  if (!raw) {
    return '/';
  }

  const withoutOrigin = raw.startsWith('http://') || raw.startsWith('https://')
    ? new URL(raw).pathname
    : raw;

  const normalized = withoutOrigin
    .split(/[?#]/, 1)[0]
    ?.trim()
    .replace(/\/{2,}/g, '/') ?? '/';

  if (!normalized || normalized === '/') {
    return '/';
  }

  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

export function resolveSearchSurfaceFromPath(
  path: string | null | undefined
): ResolvedSearchSurface {
  const pathname = normalizeSearchPath(path);
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = normalizePathSegment(segments[0]);
  const secondSegment = normalizePathSegment(segments[1]);

  if (firstSegment === 'admin') {
    return {
      area: 'admin',
      pathname,
      portalName: null,
      portalRouteArea: null
    };
  }

  if (firstSegment === 'dashboard') {
    if (secondSegment && dashboardPortalSet.has(secondSegment)) {
      return {
        area: 'portal',
        pathname,
        portalName: secondSegment,
        portalRouteArea: 'dashboard'
      };
    }

    return {
      area: 'dashboard',
      pathname,
      portalName: null,
      portalRouteArea: null
    };
  }

  if (firstSegment && portalPrefixSet.has(firstSegment)) {
    return {
      area: 'portal',
      pathname,
      portalName: firstSegment,
      portalRouteArea: 'standalone'
    };
  }

  return {
    area: 'frontend',
    pathname,
    portalName: null,
    portalRouteArea: null
  };
}

export function buildSearchContextTags({
  area,
  portalName,
  portalRouteArea,
  dashboardContextType
}: {
  area: SearchArea;
  portalName?: string | null;
  portalRouteArea?: SearchPortalRouteArea | null;
  dashboardContextType?: SearchDashboardContextType | null;
}) {
  const tags = new Set<SearchContextTag>([`area.${area}`]);

  if (area === 'frontend') {
    tags.add('frontend.public');
  }

  if (area === 'dashboard' && dashboardContextType) {
    tags.add(`dashboard.${dashboardContextType}`);
    if (dashboardContextType === 'team_member') {
      tags.add('dashboard.team');
    }
    if (dashboardContextType === 'standalone') {
      tags.add('dashboard.standalone');
    }
  }

  if (area === 'portal' && portalRouteArea === 'dashboard' && dashboardContextType) {
    tags.add(`dashboard.${dashboardContextType}`);
    if (dashboardContextType === 'team_member') {
      tags.add('dashboard.team');
    }
    if (dashboardContextType === 'standalone') {
      tags.add('dashboard.standalone');
    }
  }

  if (area === 'portal' && portalName) {
    tags.add(`portal.${portalName}`);
    if (portalRouteArea) {
      tags.add(`portal.${portalRouteArea}`);
      tags.add(`portal.${portalRouteArea}.${portalName}`);
      if (portalRouteArea === 'dashboard') {
        tags.add('dashboard.portal');
        tags.add(`dashboard.portal.${portalName}`);
      }
    }
  }

  return Array.from(tags.values());
}

export function matchesSearchContextTags(
  requiredTags: SearchContextTag[] | undefined,
  contextTags: SearchContextTag[]
) {
  if (!requiredTags || requiredTags.length === 0) {
    return true;
  }

  const contextTagSet = new Set(contextTags);
  return requiredTags.some((tag) => contextTagSet.has(tag));
}
