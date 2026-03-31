import 'server-only';

import {
  enrichUser,
  getAllPortalNames,
  getPortalMeta,
  getPortalPages,
  type SearchAudience,
  type SearchContext,
  type SearchProvider,
  type SearchResultItem,
  type SearchResultSourceType,
  type SearchStaticEntry,
  type ThemeConfig
} from '@skitsaas/sdk';
import { getUserContext } from '@/lib/auth/contexts';
import { getUser } from '@/lib/db/queries';
import {
  getEnabledModuleManifests,
  getEnabledStandaloneNavItems
} from '@/lib/modules/runtime';
import { THEME_CODE_REGISTRY } from '@/lib/themes/code-registry.generated';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import {
  buildSearchContextTags,
  matchesSearchContextTags,
  normalizeSearchPath,
  resolveSearchSurfaceFromPath
} from './context';

const DEFAULT_SEARCH_LIMIT = 12;
const MAX_SEARCH_LIMIT = 24;
const MIN_DYNAMIC_QUERY_LENGTH = 2;

type SearchQueryOptions = {
  query?: string | null | undefined;
  path?: string | null | undefined;
  limit?: number | null | undefined;
};

type SearchProviderRegistration = SearchProvider & {
  sourceId: string;
};

export type SearchQueryPayload = {
  query: string;
  context: Pick<
    SearchContext,
    | 'area'
    | 'pathname'
    | 'portalName'
    | 'portalRouteArea'
    | 'themeId'
    | 'audience'
    | 'dashboardContextType'
    | 'contextTags'
  >;
  results: SearchResultItem[];
};

const THEME_SEARCH_CONFIG_CACHE = new Map<string, Promise<ThemeConfig | null>>();

const CORE_SEARCH_ENTRIES: SearchStaticEntry[] = [
  {
    id: 'core.admin.home',
    title: 'Admin',
    href: '/admin',
    description: 'System overview and quick actions.',
    group: 'Admin',
    icon: 'layout-dashboard',
    areas: ['admin'],
    audience: 'admin',
    order: 10,
    keywords: ['overview', 'dashboard']
  },
  {
    id: 'core.admin.users',
    title: 'Users',
    href: '/admin/users',
    description: 'Manage platform accounts, roles, and access.',
    group: 'Admin',
    icon: 'users',
    areas: ['admin'],
    audience: 'admin',
    order: 20
  },
  {
    id: 'core.admin.subscriptions',
    title: 'Subscriptions',
    href: '/admin/subscriptions',
    description: 'Manage plans, assignments, and subscription health.',
    group: 'Admin',
    icon: 'credit-card',
    areas: ['admin'],
    audience: 'admin',
    order: 30
  },
  {
    id: 'core.admin.subscription-templates',
    title: 'Subscription templates',
    href: '/admin/subscriptions/templates',
    description: 'Manage reusable plan templates and quotas.',
    group: 'Admin',
    icon: 'files',
    areas: ['admin'],
    audience: 'admin',
    order: 31
  },
  {
    id: 'core.admin.payments',
    title: 'Payments',
    href: '/admin/payments',
    description: 'Inspect payment events and provider status.',
    group: 'Admin',
    icon: 'wallet',
    areas: ['admin'],
    audience: 'admin',
    order: 40
  },
  {
    id: 'core.admin.orders',
    title: 'Orders',
    href: '/admin/orders',
    description: 'Review and create manual payment orders.',
    group: 'Admin',
    icon: 'receipt',
    areas: ['admin'],
    audience: 'admin',
    order: 50
  },
  {
    id: 'core.admin.app-config',
    title: 'App config',
    href: '/admin/app-config',
    description: 'Global application settings.',
    group: 'Configuration',
    icon: 'settings',
    areas: ['admin'],
    audience: 'admin',
    order: 60
  },
  {
    id: 'core.admin.app-config.general',
    title: 'General settings',
    href: '/admin/app-config/general',
    description: 'Project name and general application options.',
    group: 'Configuration',
    icon: 'sliders-horizontal',
    areas: ['admin'],
    audience: 'admin',
    order: 61
  },
  {
    id: 'core.admin.app-config.email',
    title: 'Email settings',
    href: '/admin/app-config/email',
    description: 'Mail transport, sender defaults, and delivery setup.',
    group: 'Configuration',
    icon: 'mail',
    areas: ['admin'],
    audience: 'admin',
    order: 62
  },
  {
    id: 'core.admin.app-config.theme',
    title: 'Theme settings',
    href: '/admin/app-config/theme',
    description: 'Theme policies and area defaults.',
    group: 'Configuration',
    icon: 'palette',
    areas: ['admin'],
    audience: 'admin',
    order: 63
  },
  {
    id: 'core.admin.app-config.modules',
    title: 'Module settings',
    href: '/admin/app-config/modules',
    description: 'Runtime module controls and configuration.',
    group: 'Configuration',
    icon: 'package',
    areas: ['admin'],
    audience: 'admin',
    order: 64
  },
  {
    id: 'core.dashboard.home',
    title: 'Dashboard',
    href: '/dashboard',
    description: 'Workspace overview.',
    group: 'Workspace',
    icon: 'layout-dashboard',
    areas: ['dashboard'],
    audience: 'user',
    contextTags: ['dashboard.team', 'dashboard.standalone'],
    order: 10
  },
  {
    id: 'core.dashboard.general',
    title: 'General settings',
    href: '/dashboard/general',
    description: 'Team or personal workspace settings.',
    group: 'Settings',
    icon: 'settings',
    areas: ['dashboard'],
    audience: 'user',
    contextTags: ['dashboard.team', 'dashboard.standalone'],
    order: 20
  },
  {
    id: 'core.dashboard.activity',
    title: 'Activity',
    href: '/dashboard/activity',
    description: 'Recent workspace activity and timeline.',
    group: 'Settings',
    icon: 'activity',
    areas: ['dashboard'],
    audience: 'user',
    contextTags: ['dashboard.team', 'dashboard.standalone'],
    order: 21
  },
  {
    id: 'core.dashboard.security',
    title: 'Security',
    href: '/dashboard/security',
    description: 'Password, access, and security controls.',
    group: 'Settings',
    icon: 'shield',
    areas: ['dashboard'],
    audience: 'user',
    contextTags: ['dashboard.team', 'dashboard.standalone'],
    order: 22
  },
  {
    id: 'core.dashboard.subscriptions',
    title: 'Subscriptions',
    href: '/dashboard/subscriptions',
    description: 'Billing and active subscription status.',
    group: 'Settings',
    icon: 'credit-card',
    areas: ['dashboard'],
    audience: 'user',
    contextTags: ['dashboard.team', 'dashboard.standalone'],
    order: 23
  },
  {
    id: 'core.frontend.home',
    title: 'Home',
    href: '/',
    description: 'Marketing home page.',
    group: 'Frontend',
    icon: 'house',
    areas: ['frontend'],
    audience: 'public',
    order: 10
  },
  {
    id: 'core.frontend.pricing',
    title: 'Pricing',
    href: '/pricing',
    description: 'Plans, quotas, and checkout entry points.',
    group: 'Frontend',
    icon: 'badge-dollar-sign',
    areas: ['frontend'],
    audience: 'public',
    order: 20
  },
  {
    id: 'core.frontend.packs',
    title: 'Packs',
    href: '/packs',
    description: 'Commercial package comparison.',
    group: 'Frontend',
    icon: 'package',
    areas: ['frontend'],
    audience: 'public',
    order: 21
  },
  {
    id: 'core.frontend.contact-us',
    title: 'Contact us',
    href: '/contact-us',
    description: 'Contact and support page.',
    group: 'Frontend',
    icon: 'mail',
    areas: ['frontend'],
    audience: 'public',
    order: 30
  },
  {
    id: 'core.frontend.login',
    title: 'Login',
    href: '/login',
    description: 'Dashboard sign in.',
    group: 'Frontend',
    icon: 'log-in',
    areas: ['frontend'],
    audience: 'public',
    order: 40
  },
  {
    id: 'core.frontend.sign-up',
    title: 'Sign up',
    href: '/sign-up',
    description: 'Create a new account.',
    group: 'Frontend',
    icon: 'user-plus',
    areas: ['frontend'],
    audience: 'public',
    order: 41
  }
];

function normalizeSearchLimit(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_SEARCH_LIMIT;
  }

  return Math.min(MAX_SEARCH_LIMIT, Math.max(1, Math.trunc(value)));
}

function normalizeSearchQuery(value: string | null | undefined) {
  return String(value ?? '').trim();
}

function normalizeSearchAudienceForUser({
  isAuthenticated,
  isAdmin
}: {
  isAuthenticated: boolean;
  isAdmin: boolean;
}): SearchAudience {
  if (isAdmin) {
    return 'admin';
  }

  if (isAuthenticated) {
    return 'user';
  }

  return 'public';
}

function matchesSearchAudience(
  requiredAudience: SearchAudience | undefined,
  actualAudience: SearchAudience
) {
  if (!requiredAudience || requiredAudience === 'public') {
    return true;
  }

  if (requiredAudience === 'user') {
    return actualAudience === 'user' || actualAudience === 'admin';
  }

  return actualAudience === 'admin';
}

function matchesAreas(
  entryAreas: SearchStaticEntry['areas'] | SearchProvider['areas'],
  area: SearchContext['area']
) {
  if (!entryAreas || entryAreas.length === 0) {
    return true;
  }

  return entryAreas.includes(area);
}

function matchesPortalNames(
  entryPortalNames: string[] | undefined,
  portalName: string | null | undefined
) {
  if (!entryPortalNames || entryPortalNames.length === 0) {
    return true;
  }

  if (!portalName) {
    return false;
  }

  const normalizedPortalName = portalName.trim().toLowerCase();
  return entryPortalNames.some(
    (candidate) => candidate.trim().toLowerCase() === normalizedPortalName
  );
}

function normalizeTextList(values: string[] | undefined) {
  return (values ?? [])
    .map((value) => String(value ?? '').trim().toLowerCase())
    .filter(Boolean);
}

function escapeSearchRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasWholeWordMatch(text: string, query: string) {
  if (!text || !query) {
    return false;
  }

  const pattern = new RegExp(`(^|[^a-z0-9])${escapeSearchRegExp(query)}([^a-z0-9]|$)`);
  return pattern.test(text);
}

function normalizePathSegments(path: string) {
  return path
    .split('/')
    .map((segment) => segment.trim().toLowerCase())
    .filter(Boolean);
}

function scoreSearchResult({
  result,
  context
}: {
  result: SearchResultItem;
  context: SearchContext;
}) {
  const query = context.query.trim().toLowerCase();
  const title = result.title.trim().toLowerCase();
  const description = String(result.description ?? '').trim().toLowerCase();
  const href = result.href.trim().toLowerCase();
  const keywords = normalizeTextList(result.keywords);
  const hrefSegments = normalizePathSegments(href);
  let score = 0;

  if (!query) {
    score = 1000 - Math.max(0, result.order ?? 0);
  } else {
    if (title === query) {
      score += 3200;
    } else if (title.startsWith(query)) {
      score += 2200;
    } else if (hasWholeWordMatch(title, query)) {
      score += 1700;
    } else if (title.includes(query)) {
      score += 1200;
    }

    if (keywords.some((keyword) => keyword === query)) {
      score += 320;
    } else if (keywords.some((keyword) => hasWholeWordMatch(keyword, query))) {
      score += 220;
    } else if (keywords.some((keyword) => keyword.startsWith(query))) {
      score += 180;
    } else if (keywords.some((keyword) => keyword.includes(query))) {
      score += 120;
    }

    if (hasWholeWordMatch(description, query)) {
      score += 120;
    } else if (description.includes(query)) {
      score += 70;
    }

    if (hrefSegments.includes(query)) {
      score += 120;
    } else if (href.includes(query)) {
      score += 35;
    }

    if (result.sourceType === 'provider') {
      score += 250;
    }
  }

  if (result.sourceType === 'core') {
    score += 260;
  } else if (result.sourceType === 'theme') {
    score += 80;
  } else if (result.sourceType === 'module') {
    score -= 40;
  }

  if (query === context.area && result.sourceType === 'core') {
    score += 220;
  }

  if (href === context.pathname) {
    score += 80;
  } else if (href.startsWith(context.pathname) || context.pathname.startsWith(href)) {
    score += 40;
  }

  if (result.audience === 'admin' && context.audience === 'admin') {
    score += 30;
  }

  if (result.order) {
    score -= Math.max(0, result.order) / 1000;
  }

  return score;
}

function matchesStaticEntry(entry: SearchStaticEntry, context: SearchContext) {
  return (
    matchesAreas(entry.areas, context.area) &&
    matchesSearchAudience(entry.audience, context.audience) &&
    matchesPortalNames(entry.portalNames, context.portalName) &&
    matchesSearchContextTags(entry.contextTags, context.contextTags)
  );
}

function matchesProviderContext(
  provider: SearchProvider,
  context: SearchContext
) {
  return (
    matchesAreas(provider.areas, context.area) &&
    matchesSearchAudience(provider.audience, context.audience) &&
    matchesPortalNames(provider.portalNames, context.portalName) &&
    matchesSearchContextTags(provider.contextTags, context.contextTags)
  );
}

function withResultSource(
  result: SearchResultItem,
  {
    sourceType,
    sourceId
  }: {
    sourceType: SearchResultSourceType;
    sourceId: string;
  }
): SearchResultItem {
  return {
    ...result,
    keywords: result.keywords ? [...result.keywords] : undefined,
    sourceType: result.sourceType ?? sourceType,
    sourceId: result.sourceId ?? sourceId
  };
}

function buildModuleAutoSearchEntries({
  context,
  enabledManifests,
  standaloneNavItems
}: {
  context: SearchContext;
  enabledManifests: Awaited<ReturnType<typeof getEnabledModuleManifests>>;
  standaloneNavItems: Awaited<ReturnType<typeof getEnabledStandaloneNavItems>>;
}) {
  const entries: SearchStaticEntry[] = [];

  if (context.area === 'admin') {
    for (const manifest of enabledManifests) {
      for (const item of manifest.adminNavItems ?? []) {
        entries.push({
          id: `${manifest.moduleId}.admin-nav.${item.id}`,
          title: item.label,
          href: item.href,
          description: item.description ?? manifest.description,
          group: 'Modules',
          icon: 'package',
          areas: ['admin'],
          audience: 'admin',
          keywords: [manifest.moduleId],
          order: item.order,
          sourceId: manifest.moduleId,
          sourceType: 'module'
        });
      }
    }
  }

  if (context.area === 'dashboard' && context.dashboardContextType === 'team_member') {
    for (const manifest of enabledManifests) {
      for (const item of manifest.dashboardNavItems ?? []) {
        entries.push({
          id: `${manifest.moduleId}.dashboard-nav.${item.id}`,
          title: item.label,
          href: item.href,
          description: item.description ?? manifest.description,
          group: 'Modules',
          icon: 'package',
          areas: ['dashboard'],
          audience: 'user',
          contextTags: ['dashboard.team'],
          keywords: [manifest.moduleId],
          order: item.order,
          sourceId: manifest.moduleId,
          sourceType: 'module'
        });
      }
    }
  }

  if (context.area === 'dashboard' && context.dashboardContextType === 'standalone') {
    for (const item of standaloneNavItems) {
      entries.push({
        id: `standalone-nav.${item.href}`,
        title: item.label,
        href: item.href,
        group: 'Modules',
        icon: 'package',
        areas: ['dashboard'],
        audience: 'user',
        contextTags: ['dashboard.standalone'],
        order: item.order,
        sourceId: 'standalone',
        sourceType: 'module'
      });
    }
  }

  if (context.area === 'frontend') {
    for (const manifest of enabledManifests) {
      for (const item of manifest.frontendNavItems ?? []) {
        entries.push({
          id: `${manifest.moduleId}.frontend-nav.${item.id}`,
          title: item.label,
          href: item.href,
          description: item.description ?? manifest.description,
          group: 'Modules',
          icon: 'package',
          areas: ['frontend'],
          audience:
            manifest.frontendRouteAccess === 'admin'
              ? 'admin'
              : manifest.frontendRouteAccess === 'user'
                ? 'user'
                : 'public',
          keywords: [manifest.moduleId],
          order: item.order,
          sourceId: manifest.moduleId,
          sourceType: 'module'
        });
      }
    }
  }

  return entries;
}

function buildModuleAliasSearchEntries({
  context,
  enabledManifests
}: {
  context: SearchContext;
  enabledManifests: Awaited<ReturnType<typeof getEnabledModuleManifests>>;
}) {
  const entries: SearchStaticEntry[] = [];

  for (const manifest of enabledManifests) {
    const aliases =
      context.area === 'admin'
        ? manifest.adminRouteAliases ?? []
        : context.area === 'dashboard'
          ? manifest.dashboardRouteAliases ?? []
          : context.area === 'frontend'
            ? manifest.frontendRouteAliases ?? []
            : [];

    if (aliases.length === 0) {
      continue;
    }

    for (const alias of aliases) {
      entries.push({
        id: `${manifest.moduleId}.alias.${alias}`,
        title: manifest.displayName,
        href: alias,
        description: manifest.description,
        group: 'Modules',
        icon: 'package',
        areas: [context.area],
        audience:
          context.area === 'admin'
            ? 'admin'
            : context.area === 'frontend'
              ? manifest.frontendRouteAccess === 'admin'
                ? 'admin'
                : manifest.frontendRouteAccess === 'user'
                  ? 'user'
                  : 'public'
              : 'user',
        keywords: [manifest.moduleId, alias],
        sourceId: manifest.moduleId,
        sourceType: 'module'
      });
    }
  }

  return entries;
}

function buildPortalStaticEntries(context: SearchContext) {
  if (context.area !== 'portal' || !context.portalName) {
    return [] as SearchStaticEntry[];
  }

  const portalName = context.portalName;
  const portalPages = getPortalPages(portalName);
  const portalLabel =
    portalName
      .split(/[._-]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || portalName;

  return portalPages
    .filter((entry) => !entry.pathPattern.includes('{'))
    .map((entry, index) => ({
      id: `portal.${portalName}.${entry.pathPattern}`,
      title: entry.pathPattern === `/${portalName}` ? portalLabel : entry.pathPattern,
      href:
        context.portalRouteArea === 'dashboard'
          ? `/dashboard${entry.pathPattern}`
          : entry.pathPattern,
      description: `${portalLabel} portal page.`,
      group: 'Portal',
      icon: 'panel-top-open',
      areas: ['portal'] as SearchStaticEntry['areas'],
      portalNames: [portalName],
      order: 100 + index,
      sourceId: portalName,
      sourceType: 'core' as const
    }));
}

async function loadThemeConfig(themeId: string) {
  const normalizedThemeId = themeId.trim().toLowerCase();
  if (!normalizedThemeId) {
    return null;
  }

  if (!THEME_SEARCH_CONFIG_CACHE.has(normalizedThemeId)) {
    THEME_SEARCH_CONFIG_CACHE.set(
      normalizedThemeId,
      (async () => {
        const registryEntry = THEME_CODE_REGISTRY[normalizedThemeId];
        if (!registryEntry?.configImport) {
          return null;
        }

        try {
          const module = await registryEntry.configImport();
          return module.default ?? null;
        } catch {
          return null;
        }
      })()
    );
  }

  return THEME_SEARCH_CONFIG_CACHE.get(normalizedThemeId) ?? null;
}

async function resolveActiveThemeId(context: {
  area: SearchContext['area'];
  portalName: string | null;
}) {
  if (context.area === 'portal') {
    if (!context.portalName) {
      return null;
    }

    const portalMeta = getPortalMeta(context.portalName);
    return typeof portalMeta?.userTheme === 'string' ? portalMeta.userTheme : null;
  }

  const themeSelection = await getThemeSelectionForArea(context.area);
  return themeSelection.themeKey;
}

async function buildThemeSearchEntries(context: SearchContext) {
  if (!context.themeId) {
    return [] as SearchStaticEntry[];
  }

  const config = await loadThemeConfig(context.themeId);
  const themeEntries = config?.searchEntries ?? [];

  return themeEntries.map((entry) =>
    withResultSource(entry, {
      sourceType: 'theme',
      sourceId: context.themeId ?? 'theme'
    })
  );
}

async function resolveModuleSearchSources(context: SearchContext) {
  const enabledManifests = await getEnabledModuleManifests();
  const standaloneNavItems =
    context.area === 'dashboard' &&
    context.dashboardContextType === 'standalone' &&
    context.userId
      ? await getEnabledStandaloneNavItems(context.userId)
      : [];

  const autoEntries = buildModuleAutoSearchEntries({
    context,
    enabledManifests,
    standaloneNavItems
  });
  const aliasEntries = buildModuleAliasSearchEntries({
    context,
    enabledManifests
  });
  const customEntries = enabledManifests.flatMap((manifest) =>
    (manifest.searchEntries ?? []).map((entry) =>
      withResultSource(entry, {
        sourceType: 'module',
        sourceId: manifest.moduleId
      })
    )
  );
  const providers = enabledManifests.flatMap((manifest) =>
    (manifest.searchProviders ?? []).map((provider) => ({
      ...provider,
      sourceId: manifest.moduleId
    }))
  );

  return {
    entries: [...autoEntries, ...aliasEntries, ...customEntries],
    providers
  };
}

async function executeDynamicProviders({
  context,
  providers
}: {
  context: SearchContext;
  providers: SearchProviderRegistration[];
}) {
  if (context.query.length < MIN_DYNAMIC_QUERY_LENGTH) {
    return [] as SearchResultItem[];
  }

  const candidates: SearchProviderRegistration[] = [];
  for (const provider of providers) {
    if (!matchesProviderContext(provider, context)) {
      continue;
    }

    if (provider.enabled) {
      try {
        const enabled = await provider.enabled(context);
        if (!enabled) {
          continue;
        }
      } catch {
        continue;
      }
    }

    candidates.push(provider);
  }

  const settled = await Promise.allSettled(
    candidates.map(async (provider) => {
      const response = await provider.search(context);
      const results = Array.isArray(response) ? response : [response];
      return results.map((result) =>
        withResultSource(result, {
          sourceType: 'provider',
          sourceId: provider.sourceId || provider.providerId
        })
      );
    })
  );

  const results: SearchResultItem[] = [];
  for (const entry of settled) {
    if (entry.status !== 'fulfilled') {
      continue;
    }

    results.push(...entry.value);
  }

  return results;
}

function finalizeSearchResults({
  results,
  context
}: {
  results: SearchResultItem[];
  context: SearchContext;
}) {
  const deduped = new Map<string, { result: SearchResultItem; score: number }>();

  for (const result of results) {
    const score = scoreSearchResult({ result, context });
    if (context.query && score <= 0 && result.sourceType !== 'provider') {
      continue;
    }

    const key = result.href.trim().toLowerCase() || result.id.trim().toLowerCase();
    const existing = deduped.get(key);
    if (!existing || score > existing.score) {
      deduped.set(key, { result, score });
    }
  }

  return Array.from(deduped.values())
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      const leftOrder = left.result.order ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.result.order ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.result.title.localeCompare(right.result.title);
    })
    .slice(0, context.limit ?? DEFAULT_SEARCH_LIMIT)
    .map((entry) => entry.result);
}

export async function resolveSearchContext({
  query,
  path,
  limit
}: SearchQueryOptions): Promise<SearchContext> {
  const resolvedSurface = resolveSearchSurfaceFromPath(path);
  const user = await getUser();
  const isAuthenticated = Boolean(user);
  const isAdmin = user ? enrichUser(user).isAdmin() : false;
  const userContext = await getUserContext(user);
  const dashboardContextType =
    resolvedSurface.area === 'dashboard' ||
    (resolvedSurface.area === 'portal' &&
      resolvedSurface.portalRouteArea === 'dashboard')
      ? userContext.type
      : null;
  const themeId = await resolveActiveThemeId({
    area: resolvedSurface.area,
    portalName: resolvedSurface.portalName
  });

  return {
    query: normalizeSearchQuery(query),
    area: resolvedSurface.area,
    pathname: normalizeSearchPath(resolvedSurface.pathname),
    portalName: resolvedSurface.portalName,
    portalRouteArea: resolvedSurface.portalRouteArea,
    themeId,
    audience: normalizeSearchAudienceForUser({
      isAuthenticated,
      isAdmin
    }),
    isAuthenticated,
    isAdmin,
    userId: user?.id ?? null,
    userRole: user?.role ?? null,
    teamId: userContext.type === 'team_member' ? userContext.teamId : null,
    dashboardContextType,
    contextTags: buildSearchContextTags({
      area: resolvedSurface.area,
      portalName: resolvedSurface.portalName,
      portalRouteArea: resolvedSurface.portalRouteArea,
      dashboardContextType
    }),
    limit: normalizeSearchLimit(limit)
  };
}

export async function querySearch(
  options: SearchQueryOptions
): Promise<SearchQueryPayload> {
  const context = await resolveSearchContext(options);
  if (!context.query) {
    return {
      query: context.query,
      context: {
        area: context.area,
        pathname: context.pathname,
        portalName: context.portalName,
        portalRouteArea: context.portalRouteArea,
        themeId: context.themeId,
        audience: context.audience,
        dashboardContextType: context.dashboardContextType,
        contextTags: context.contextTags
      },
      results: []
    };
  }

  const { entries: moduleEntries, providers } = await resolveModuleSearchSources(
    context
  );

  const staticEntries = [
    ...CORE_SEARCH_ENTRIES,
    ...buildPortalStaticEntries(context),
    ...moduleEntries,
    ...(await buildThemeSearchEntries(context))
  ]
    .filter((entry) => matchesStaticEntry(entry, context))
    .map((entry) =>
      withResultSource(entry, {
        sourceType: entry.sourceType ?? 'core',
        sourceId: entry.sourceId ?? 'core'
      })
    );
  const dynamicResults = await executeDynamicProviders({
    context,
    providers
  });
  const results = finalizeSearchResults({
    results: [...staticEntries, ...dynamicResults],
    context
  });

  return {
    query: context.query,
    context: {
      area: context.area,
      pathname: context.pathname,
      portalName: context.portalName,
      portalRouteArea: context.portalRouteArea,
      themeId: context.themeId,
      audience: context.audience,
      dashboardContextType: context.dashboardContextType,
      contextTags: context.contextTags
    },
    results
  };
}

export function getSearchRuntimeMetadata() {
  return {
    maxLimit: MAX_SEARCH_LIMIT,
    defaultLimit: DEFAULT_SEARCH_LIMIT,
    minDynamicQueryLength: MIN_DYNAMIC_QUERY_LENGTH,
    portalNames: getAllPortalNames()
  };
}
