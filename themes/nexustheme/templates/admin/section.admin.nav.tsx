'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { mergeClassNames } from '@skitsaas/sdk';
import type { TemplateData as BaseTemplateData, TemplateProps } from '../template-types';
import {
  ChevronRight,
  FileText,
  LayoutDashboard,
  LayoutTemplate,
  Package,
  ReceiptText,
  Settings2,
  ShoppingCart,
  Users,
  type LucideIcon
} from 'lucide-react';

type TemplateNavChildItem = {
  href: string;
  label: string;
  exact?: boolean;
  matchPrefixes?: string[];
};

type TemplateNavItem = {
  href: string;
  icon?: string;
  label: string;
  exact?: boolean;
  matchPrefixes?: string[];
  children?: TemplateNavChildItem[];
};

type AdminNavTemplateData = BaseTemplateData & {
  variant?: 'basic' | 'pro';
  navItems?: TemplateNavItem[];
};

type NavGroupKey = 'dashboards' | 'apps' | 'settings' | 'modules';

const NAV_GROUP_ORDER: NavGroupKey[] = ['dashboards', 'apps', 'settings', 'modules'];
const NAV_GROUP_LABEL: Record<NavGroupKey, string> = {
  dashboards: 'Dashboards',
  apps: 'Apps',
  settings: 'Settings',
  modules: 'Modules'
};

const iconMap: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  users: Users,
  'layout-template': LayoutTemplate,
  'receipt-text': ReceiptText,
  'shopping-cart': ShoppingCart,
  'file-text': FileText,
  'settings-2': Settings2,
  package: Package
};

function isTemplateNavChildItem(value: unknown): value is TemplateNavChildItem {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as TemplateNavChildItem;
  return typeof candidate.href === 'string' && typeof candidate.label === 'string';
}

function isTemplateNavItem(value: unknown): value is TemplateNavItem {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as TemplateNavItem;
  return typeof candidate.href === 'string' && typeof candidate.label === 'string';
}

function matchesPath(
  pathname: string,
  href: string,
  exact: boolean,
  matchPrefixes: string[] = []
) {
  if (exact) {
    return pathname === href || matchPrefixes.some((prefix) => pathname === prefix);
  }

  if (pathname === href || pathname.startsWith(`${href}/`)) {
    return true;
  }

  return matchPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isChildItemActive(pathname: string, item: TemplateNavChildItem) {
  return matchesPath(pathname, item.href, item.exact ?? false, item.matchPrefixes);
}

function isNavItemActive(pathname: string, item: TemplateNavItem) {
  if (matchesPath(pathname, item.href, item.exact ?? false, item.matchPrefixes)) {
    return true;
  }

  return item.children?.some((child) => isChildItemActive(pathname, child)) ?? false;
}

function resolveNavGroup(item: TemplateNavItem): NavGroupKey {
  if (item.href === '/admin') {
    return 'dashboards';
  }

  if (item.href.startsWith('/admin/app-config')) {
    return 'settings';
  }

  if (item.icon === 'package' || item.href.startsWith('/admin/modules')) {
    return 'modules';
  }

  return 'apps';
}

export default function SectionAdminNavTemplate({
  data,
  className,
  children
}: TemplateProps<AdminNavTemplateData>) {
  const pathname = usePathname();
  const navItems = Array.isArray(data?.navItems)
    ? data.navItems.filter(isTemplateNavItem)
    : [];
  const activeParentItemKeys = useMemo(
    () =>
      new Set(
        navItems
          .filter((item) => {
            const childrenItems = Array.isArray(item.children)
              ? item.children.filter(isTemplateNavChildItem)
              : [];
            if (!childrenItems.length) {
              return false;
            }

            return isNavItemActive(pathname, item);
          })
          .map((item) => item.href)
      ),
    [navItems, pathname]
  );
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!activeParentItemKeys.size) {
      return;
    }

    setExpandedItems((previous) => {
      let changed = false;
      const next = { ...previous };

      for (const href of activeParentItemKeys) {
        if (!next[href]) {
          next[href] = true;
          changed = true;
        }
      }

      return changed ? next : previous;
    });
  }, [activeParentItemKeys]);

  if (navItems.length === 0) {
    return <>{children ?? null}</>;
  }

  const groupedItems: Record<NavGroupKey, TemplateNavItem[]> = {
    dashboards: [],
    apps: [],
    settings: [],
    modules: []
  };

  for (const item of navItems) {
    groupedItems[resolveNavGroup(item)].push(item);
  }

  return (
    <nav
      className={mergeClassNames(
        'flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm',
        className
      )}
      data-nexus-admin-nav="true"
    >
      <div className="nexus-admin-nav-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-2 pr-1.5">
        {NAV_GROUP_ORDER.map((groupKey) => {
          const items = groupedItems[groupKey];
          if (!items.length) {
            return null;
          }

          return (
            <section key={groupKey} className="space-y-1">
              <p className="px-2 pt-1 pb-1 text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                {NAV_GROUP_LABEL[groupKey]}
              </p>
              <div className="space-y-1">
                {items.map((item) => {
                  const Icon = iconMap[item.icon ?? ''] ?? Package;
                  const isActive = isNavItemActive(pathname, item);
                  const childrenItems = Array.isArray(item.children)
                    ? item.children.filter(isTemplateNavChildItem)
                    : [];
                  const hasChildren = childrenItems.length > 0;
                  const isExpanded =
                    hasChildren &&
                    (expandedItems[item.href] ?? activeParentItemKeys.has(item.href));

                  return (
                    <div key={item.href} className="space-y-1">
                      <div
                        className={mergeClassNames(
                          'group flex items-center gap-2 rounded-lg px-2 py-1 text-sm transition-colors',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground/85 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground'
                        )}
                      >
                        <Link
                          href={item.href}
                          prefetch={false}
                          aria-current={isActive ? 'page' : undefined}
                          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-0.5 py-1"
                        >
                          <span
                            className={mergeClassNames(
                              'flex size-8 items-center justify-center rounded-md border',
                              isActive
                                ? 'border-sidebar-primary/30 bg-sidebar-primary text-sidebar-primary-foreground'
                                : 'border-sidebar-border bg-sidebar text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground'
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                        </Link>

                        {hasChildren ? (
                          <button
                            type="button"
                            className={mergeClassNames(
                              'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-sidebar/80',
                              isExpanded ? 'text-sidebar-accent-foreground' : 'text-muted-foreground'
                            )}
                            onClick={() => {
                              setExpandedItems((previous) => ({
                                ...previous,
                                [item.href]: !isExpanded
                              }));
                            }}
                            aria-label={isExpanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
                            aria-expanded={isExpanded}
                          >
                            <ChevronRight
                              className={mergeClassNames(
                                'h-4 w-4 transition-transform',
                                isExpanded ? 'rotate-90' : 'rotate-0'
                              )}
                            />
                          </button>
                        ) : (
                          <ChevronRight
                            className={mergeClassNames(
                              'h-4 w-4 shrink-0 transition-opacity',
                              isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            )}
                          />
                        )}
                      </div>

                      {hasChildren && isExpanded ? (
                        <div className="ml-11 space-y-1 border-l border-sidebar-border pl-2">
                          {childrenItems.map((child) => {
                            const isChildActive = isChildItemActive(pathname, child);
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                prefetch={false}
                                aria-current={isChildActive ? 'page' : undefined}
                                className={mergeClassNames(
                                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
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
                })}
              </div>
            </section>
          );
        })}
      </div>

      <style jsx global>{`
        [data-nexus-admin-nav='true'] .nexus-admin-nav-scroll {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }

        [data-nexus-admin-nav='true'] .nexus-admin-nav-scroll:hover,
        [data-nexus-admin-nav='true'] .nexus-admin-nav-scroll:focus-within {
          scrollbar-color: hsl(var(--muted-foreground) / 0.45) transparent;
        }

        [data-nexus-admin-nav='true'] .nexus-admin-nav-scroll::-webkit-scrollbar {
          width: 5px;
        }

        [data-nexus-admin-nav='true'] .nexus-admin-nav-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        [data-nexus-admin-nav='true'] .nexus-admin-nav-scroll::-webkit-scrollbar-thumb {
          background-color: transparent;
          border-radius: 9999px;
        }

        [data-nexus-admin-nav='true'] .nexus-admin-nav-scroll:hover::-webkit-scrollbar-thumb,
        [data-nexus-admin-nav='true'] .nexus-admin-nav-scroll:focus-within::-webkit-scrollbar-thumb {
          background-color: hsl(var(--muted-foreground) / 0.45);
        }
      `}</style>
    </nav>
  );
}
