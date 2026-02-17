import type { ModuleManifest } from './manifest';

export type ModuleRouteArea = 'admin' | 'dashboard' | 'frontend';

export type ModuleRouteAliasEntry = {
  area: ModuleRouteArea;
  moduleId: string;
  path: string;
};

export type ModuleRouteAliasMatch = {
  moduleId: string;
  aliasPath: string;
  slug: string[];
};

export type ModuleRouteAliasValidationError = {
  area: ModuleRouteArea;
  moduleId: string;
  path: string;
  code:
    | 'alias_invalid'
    | 'alias_duplicate'
    | 'alias_overlapping'
    | 'alias_reserved_conflict';
  message: string;
  conflictModuleId?: string;
  conflictPath?: string;
};

type ReservedRouteRule = {
  path: string;
  mode: 'exact' | 'prefix';
};

const RESERVED_ROUTE_RULES: Record<ModuleRouteArea, ReservedRouteRule[]> = {
  admin: [
    { path: '/admin', mode: 'exact' },
    { path: '/admin/login', mode: 'prefix' },
    { path: '/admin/billing', mode: 'prefix' },
    { path: '/admin/app-config', mode: 'prefix' },
    { path: '/admin/users', mode: 'prefix' },
    { path: '/admin/subscriptions', mode: 'prefix' },
    { path: '/admin/suscriptions', mode: 'prefix' },
    { path: '/admin/payments', mode: 'prefix' },
    { path: '/admin/orders', mode: 'prefix' },
    { path: '/admin/logs', mode: 'prefix' },
    { path: '/admin/modules', mode: 'prefix' }
  ],
  dashboard: [
    { path: '/dashboard', mode: 'exact' },
    { path: '/dashboard/general', mode: 'prefix' },
    { path: '/dashboard/activity', mode: 'prefix' },
    { path: '/dashboard/security', mode: 'prefix' },
    { path: '/dashboard/subscriptions', mode: 'prefix' },
    { path: '/dashboard/modules', mode: 'prefix' }
  ],
  frontend: [
    { path: '/', mode: 'exact' },
    { path: '/pricing', mode: 'prefix' },
    { path: '/checkout', mode: 'prefix' },
    { path: '/contact-us', mode: 'prefix' },
    { path: '/login', mode: 'prefix' },
    { path: '/sign-in', mode: 'prefix' },
    { path: '/sign-up', mode: 'prefix' },
    { path: '/admin', mode: 'prefix' },
    { path: '/dashboard', mode: 'prefix' },
    { path: '/api', mode: 'prefix' },
    { path: '/modules', mode: 'prefix' }
  ]
};

const ROUTE_AREAS = ['admin', 'dashboard', 'frontend'] as const;

function isSegmentPrefix(prefixPath: string, path: string) {
  return path === prefixPath || path.startsWith(`${prefixPath}/`);
}

function normalizeRoutePath(path: string) {
  const value = path.trim();
  if (!value.startsWith('/')) {
    return null;
  }
  if (value.includes('?') || value.includes('#')) {
    return null;
  }
  if (value.includes('//') || value.includes('\\')) {
    return null;
  }
  if (value.includes('[') || value.includes(']')) {
    return null;
  }

  if (value.length > 1 && value.endsWith('/')) {
    return value.replace(/\/+$/, '');
  }

  return value;
}

function getManifestAliases(
  manifest: ModuleManifest,
  area: ModuleRouteArea
): string[] {
  if (area === 'admin') {
    return manifest.adminRouteAliases ?? [];
  }

  if (area === 'dashboard') {
    return manifest.dashboardRouteAliases ?? [];
  }

  return manifest.frontendRouteAliases ?? [];
}

function isValidAliasForArea(path: string, area: ModuleRouteArea) {
  if (area === 'admin') {
    return path.startsWith('/admin/') && path !== '/admin';
  }

  if (area === 'dashboard') {
    return path.startsWith('/dashboard/') && path !== '/dashboard';
  }

  if (path === '/') {
    return false;
  }

  return path.startsWith('/');
}

function collidesWithReservedRoute(path: string, area: ModuleRouteArea) {
  return RESERVED_ROUTE_RULES[area].find((rule) => {
    if (rule.mode === 'exact') {
      return path === rule.path;
    }

    return isSegmentPrefix(rule.path, path);
  });
}

function sortAliasesForMatching(entries: ModuleRouteAliasEntry[]) {
  return entries.sort((a, b) => {
    if (a.path.length !== b.path.length) {
      return b.path.length - a.path.length;
    }

    return a.path.localeCompare(b.path);
  });
}

export function buildModuleRouteAliasEntries(
  manifests: ModuleManifest[],
  area: ModuleRouteArea
) {
  const entries: ModuleRouteAliasEntry[] = [];

  for (const manifest of manifests) {
    const aliases = getManifestAliases(manifest, area);
    for (const alias of aliases) {
      const normalized = normalizeRoutePath(alias);
      if (!normalized || !isValidAliasForArea(normalized, area)) {
        continue;
      }

      entries.push({
        area,
        moduleId: manifest.moduleId,
        path: normalized
      });
    }
  }

  return entries;
}

export function validateModuleRouteAliases(
  manifests: ModuleManifest[]
): ModuleRouteAliasValidationError[] {
  const errors: ModuleRouteAliasValidationError[] = [];
  const aliasEntries: ModuleRouteAliasEntry[] = [];
  const seenByAreaPath = new Map<string, ModuleRouteAliasEntry>();

  for (const manifest of manifests) {
    for (const area of ROUTE_AREAS) {
      const aliases = getManifestAliases(manifest, area);
      const seenForModule = new Set<string>();

      for (const alias of aliases) {
        const normalized = normalizeRoutePath(alias);
        if (!normalized || !isValidAliasForArea(normalized, area)) {
          errors.push({
            area,
            moduleId: manifest.moduleId,
            path: alias,
            code: 'alias_invalid',
            message: `Alias "${alias}" is invalid for area ${area}.`
          });
          continue;
        }

        if (seenForModule.has(normalized)) {
          errors.push({
            area,
            moduleId: manifest.moduleId,
            path: normalized,
            code: 'alias_duplicate',
            message: `Alias "${normalized}" is duplicated in module "${manifest.moduleId}".`
          });
          continue;
        }
        seenForModule.add(normalized);

        const reservedConflict = collidesWithReservedRoute(normalized, area);
        if (reservedConflict) {
          errors.push({
            area,
            moduleId: manifest.moduleId,
            path: normalized,
            code: 'alias_reserved_conflict',
            message: `Alias "${normalized}" conflicts with reserved route "${reservedConflict.path}".`
          });
          continue;
        }

        const areaPathKey = `${area}::${normalized}`;
        const seenEntry = seenByAreaPath.get(areaPathKey);
        if (seenEntry) {
          errors.push({
            area,
            moduleId: manifest.moduleId,
            path: normalized,
            code: 'alias_duplicate',
            message: `Alias "${normalized}" is already used by module "${seenEntry.moduleId}".`,
            conflictModuleId: seenEntry.moduleId,
            conflictPath: seenEntry.path
          });
          continue;
        }

        const entry: ModuleRouteAliasEntry = {
          area,
          moduleId: manifest.moduleId,
          path: normalized
        };
        seenByAreaPath.set(areaPathKey, entry);
        aliasEntries.push(entry);
      }
    }
  }

  for (const area of ROUTE_AREAS) {
    const entries = aliasEntries.filter((entry) => entry.area === area);
    for (let index = 0; index < entries.length; index += 1) {
      const current = entries[index];
      if (!current) {
        continue;
      }

      for (
        let compareIndex = index + 1;
        compareIndex < entries.length;
        compareIndex += 1
      ) {
        const other = entries[compareIndex];
        if (!other) {
          continue;
        }
        // Allow nested aliases inside the same module; resolver picks longest prefix.
        if (current.moduleId === other.moduleId) {
          continue;
        }
        if (
          !isSegmentPrefix(current.path, other.path) &&
          !isSegmentPrefix(other.path, current.path)
        ) {
          continue;
        }

        errors.push({
          area,
          moduleId: current.moduleId,
          path: current.path,
          code: 'alias_overlapping',
          message: `Alias "${current.path}" overlaps with alias "${other.path}" from module "${other.moduleId}".`,
          conflictModuleId: other.moduleId,
          conflictPath: other.path
        });
      }
    }
  }

  return errors;
}

export function resolveModuleRouteAlias({
  area,
  path,
  manifests
}: {
  area: ModuleRouteArea;
  path: string;
  manifests: ModuleManifest[];
}): ModuleRouteAliasMatch | null {
  const normalizedPath = normalizeRoutePath(path);
  if (!normalizedPath || !isValidAliasForArea(normalizedPath, area)) {
    return null;
  }

  const entries = sortAliasesForMatching(
    buildModuleRouteAliasEntries(manifests, area)
  );

  for (const entry of entries) {
    if (!isSegmentPrefix(entry.path, normalizedPath)) {
      continue;
    }

    const suffix = normalizedPath.slice(entry.path.length);
    const slug = suffix
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);

    return {
      moduleId: entry.moduleId,
      aliasPath: entry.path,
      slug
    };
  }

  return null;
}
