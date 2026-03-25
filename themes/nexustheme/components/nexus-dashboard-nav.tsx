'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { mergeClassNames, useI18n } from '@skitsaas/sdk';
import {
  Activity,
  ChevronRight,
  CreditCard,
  Package,
  Settings,
  Shield,
  Users,
  type LucideIcon
} from 'lucide-react';

export type DashboardNavChildItem = {
  href: string;
  label: string;
  exact?: boolean;
  matchPrefixes?: string[];
};

export type DashboardNavItem = {
  href: string;
  icon?: string;
  label: string;
  exact?: boolean;
  matchPrefixes?: string[];
  children?: DashboardNavChildItem[];
};

type NexusDashboardNavProps = {
  items?: DashboardNavItem[];
  className?: string;
  themeId?: string;
};

type NavGroupKey = 'workspace' | 'apps' | 'settings';

const iconMap: Record<string, LucideIcon> = {
  users: Users,
  settings: Settings,
  activity: Activity,
  shield: Shield,
  'credit-card': CreditCard,
  package: Package
};

function isTemplateNavChildItem(value: unknown): value is DashboardNavChildItem {
  if (!value || typeof value !== 'object') return false;
  const c = value as DashboardNavChildItem;
  return typeof c.href === 'string' && typeof c.label === 'string';
}

function isTemplateNavItem(value: unknown): value is DashboardNavItem {
  if (!value || typeof value !== 'object') return false;
  const c = value as DashboardNavItem;
  return typeof c.href === 'string' && typeof c.label === 'string';
}

function getPathMatchSpecificity(
  pathname: string,
  href: string,
  exact: boolean,
  matchPrefixes: string[] = []
) {
  const candidates = [href, ...matchPrefixes];
  let bestScore = -1;

  for (const candidate of candidates) {
    if (exact) {
      if (pathname === candidate) {
        bestScore = Math.max(bestScore, candidate.length);
      }
      continue;
    }

    if (pathname === candidate || pathname.startsWith(`${candidate}/`)) {
      bestScore = Math.max(bestScore, candidate.length);
    }
  }

  return bestScore;
}

function matchesPath(
  pathname: string,
  href: string,
  exact: boolean,
  matchPrefixes: string[] = []
) {
  return getPathMatchSpecificity(pathname, href, exact, matchPrefixes) >= 0;
}

function getActiveChildHref(pathname: string, children: DashboardNavChildItem[]) {
  let bestHref: string | null = null;
  let bestScore = -1;

  for (const child of children) {
    const score = getPathMatchSpecificity(
      pathname,
      child.href,
      child.exact ?? false,
      child.matchPrefixes
    );

    if (score > bestScore) {
      bestScore = score;
      bestHref = child.href;
    }
  }

  return bestHref;
}

function isChildItemActive(
  pathname: string,
  item: DashboardNavChildItem,
  activeChildHref?: string | null
) {
  if (activeChildHref !== undefined) {
    return activeChildHref === item.href;
  }

  return matchesPath(pathname, item.href, item.exact ?? false, item.matchPrefixes);
}

function isNavItemActive(pathname: string, item: DashboardNavItem) {
  if (matchesPath(pathname, item.href, item.exact ?? false, item.matchPrefixes)) {
    return true;
  }

  const childrenItems = Array.isArray(item.children)
    ? item.children.filter(isTemplateNavChildItem)
    : [];

  return getActiveChildHref(pathname, childrenItems) !== null;
}

function resolveNavGroup(item: DashboardNavItem): NavGroupKey {
  if (
    item.href === '/dashboard/general' ||
    item.href.startsWith('/dashboard/general') ||
    item.icon === 'settings'
  ) {
    return 'settings';
  }

  return item.icon === 'package' ? 'apps' : 'workspace';
}

const NAV_GROUP_ORDER: NavGroupKey[] = ['workspace', 'apps'];

export function NexusDashboardNav({
  items = [],
  className,
  themeId
}: NexusDashboardNavProps) {
  const t = useI18n({ themeId, area: 'dashboard' });
  const pathname = usePathname();
  const navItems = items.filter(isTemplateNavItem);

  const activeParentItemHref = useMemo(
    () =>
      navItems.find((item) => {
        const childrenItems = Array.isArray(item.children)
          ? item.children.filter(isTemplateNavChildItem)
          : [];
        if (!childrenItems.length) return false;
        return isNavItemActive(pathname, item);
      })?.href ?? null,
    [navItems, pathname]
  );

  const [expandedItemHref, setExpandedItemHref] = useState<string | null>(null);

  useEffect(() => {
    setExpandedItemHref(activeParentItemHref);
  }, [activeParentItemHref]);

  if (navItems.length === 0) {
    return null;
  }

  const groupedItems: Record<NavGroupKey, DashboardNavItem[]> = {
    workspace: [],
    apps: [],
    settings: []
  };

  for (const item of navItems) {
    groupedItems[resolveNavGroup(item)].push(item);
  }

  function renderItem(item: DashboardNavItem) {
    const Icon = iconMap[item.icon ?? ''] ?? Package;
    const childrenItems = Array.isArray(item.children)
      ? item.children.filter(isTemplateNavChildItem)
      : [];
    const hasChildren = childrenItems.length > 0;
    const activeChildHref = hasChildren ? getActiveChildHref(pathname, childrenItems) : null;
    const isActive =
      matchesPath(pathname, item.href, item.exact ?? false, item.matchPrefixes) ||
      activeChildHref !== null;
    const isExpanded = hasChildren && expandedItemHref === item.href;

    return (
      <div key={item.href} className="space-y-px">
        <div
          className={mergeClassNames(
            'group flex items-center gap-1 rounded-lg px-1 py-0.5 text-sm transition-colors',
            isActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground/85 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground'
          )}
        >
          <Link
            href={item.href}
            prefetch={false}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => {
              setExpandedItemHref(hasChildren ? item.href : null);
            }}
            className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-0.5 py-1"
          >
            <span
              className={mergeClassNames(
                'flex size-6 items-center justify-center rounded-md border',
                isActive
                  ? 'border-sidebar-primary/30 bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'border-sidebar-border bg-sidebar text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium leading-tight">
              {item.label}
            </span>
          </Link>

          {hasChildren ? (
            <button
              type="button"
              className={mergeClassNames(
                'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-sidebar/80',
                isExpanded ? 'text-sidebar-accent-foreground' : 'text-muted-foreground'
              )}
              onClick={() => {
                setExpandedItemHref((prev) => (prev === item.href ? null : item.href));
              }}
              aria-label={`${isExpanded ? t('Collapse') : t('Expand')} ${item.label}`}
              aria-expanded={isExpanded}
            >
              <ChevronRight
                className={mergeClassNames(
                  'h-3.5 w-3.5 transition-transform',
                  isExpanded ? 'rotate-90' : 'rotate-0'
                )}
              />
            </button>
          ) : (
            <ChevronRight
              className={mergeClassNames(
                'h-3.5 w-3.5 shrink-0 transition-opacity',
                isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}
            />
          )}
        </div>

        {hasChildren && isExpanded ? (
          <div className="ml-7 space-y-px border-l border-sidebar-border/80 pl-2">
            {childrenItems.map((child) => {
              const isChildActive = isChildItemActive(pathname, child, activeChildHref);

              return (
                <Link
                  key={child.href}
                  href={child.href}
                  prefetch={false}
                  aria-current={isChildActive ? 'page' : undefined}
                  onClick={() => {
                    setExpandedItemHref(item.href);
                  }}
                  className={mergeClassNames(
                    'flex items-center gap-2 rounded-md px-1.5 py-1 text-[12px] transition-colors',
                    isChildActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground'
                  )}
                >
                  <span
                    className={mergeClassNames(
                      'h-1.5 w-1.5 rounded-full',
                      isChildActive ? 'bg-sidebar-primary' : 'bg-muted-foreground'
                    )}
                  />
                  <span className="truncate">{child.label}</span>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <nav
      className={mergeClassNames(
        'flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm',
        className
      )}
      data-nexus-dashboard-nav="true"
    >
      <div className="nexus-dashboard-nav-scroll min-h-0 flex-1 space-y-1.5 overflow-y-auto p-1.5 pr-1">
        {NAV_GROUP_ORDER.map((groupKey) => {
          const groupItems = groupedItems[groupKey];
          if (!groupItems.length) return null;

          return (
            <section key={groupKey} className="space-y-0.5">
              <p className="px-1.5 pt-1 pb-0.5 text-[9px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                {t(groupKey === 'workspace' ? 'Workspace' : 'Apps')}
              </p>
              <div className="space-y-px">{groupItems.map(renderItem)}</div>
            </section>
          );
        })}
      </div>

      {groupedItems.settings.length > 0 ? (
        <div className="shrink-0 space-y-px border-t border-sidebar-border/70 p-1.5">
          {groupedItems.settings.map(renderItem)}
        </div>
      ) : null}

      <style jsx global>{`
        [data-nexus-dashboard-nav='true'] .nexus-dashboard-nav-scroll {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }

        [data-nexus-dashboard-nav='true'] .nexus-dashboard-nav-scroll:hover,
        [data-nexus-dashboard-nav='true'] .nexus-dashboard-nav-scroll:focus-within {
          scrollbar-color: hsl(var(--muted-foreground) / 0.45) transparent;
        }

        [data-nexus-dashboard-nav='true'] .nexus-dashboard-nav-scroll::-webkit-scrollbar {
          width: 5px;
        }

        [data-nexus-dashboard-nav='true'] .nexus-dashboard-nav-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        [data-nexus-dashboard-nav='true'] .nexus-dashboard-nav-scroll::-webkit-scrollbar-thumb {
          background-color: transparent;
          border-radius: 9999px;
        }

        [data-nexus-dashboard-nav='true']
          .nexus-dashboard-nav-scroll:hover::-webkit-scrollbar-thumb,
        [data-nexus-dashboard-nav='true']
          .nexus-dashboard-nav-scroll:focus-within::-webkit-scrollbar-thumb {
          background-color: hsl(var(--muted-foreground) / 0.45);
        }
      `}</style>
    </nav>
  );
}
