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

// 'settings' is never in NAV_GROUP_ORDER — it's pinned below the scroll area
type NavGroupKey = 'dashboards' | 'apps' | 'settings';

const NAV_GROUP_ORDER: NavGroupKey[] = ['dashboards', 'apps'];
const NAV_GROUP_LABEL: Record<NavGroupKey, string> = {
  dashboards: 'Dashboards',
  apps: 'Apps',
  settings: 'Settings'
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
  if (!value || typeof value !== 'object') return false;
  const c = value as TemplateNavChildItem;
  return typeof c.href === 'string' && typeof c.label === 'string';
}

function isTemplateNavItem(value: unknown): value is TemplateNavItem {
  if (!value || typeof value !== 'object') return false;
  const c = value as TemplateNavItem;
  return typeof c.href === 'string' && typeof c.label === 'string';
}

function matchesPath(
  pathname: string,
  href: string,
  exact: boolean,
  matchPrefixes: string[] = []
) {
  if (exact) {
    return pathname === href || matchPrefixes.some((p) => pathname === p);
  }
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;
  return matchPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isChildItemActive(pathname: string, item: TemplateNavChildItem) {
  return matchesPath(pathname, item.href, item.exact ?? false, item.matchPrefixes);
}

function isNavItemActive(pathname: string, item: TemplateNavItem) {
  if (matchesPath(pathname, item.href, item.exact ?? false, item.matchPrefixes)) return true;
  return item.children?.some((child) => isChildItemActive(pathname, child)) ?? false;
}

function resolveNavGroup(item: TemplateNavItem): NavGroupKey {
  if (item.href === '/admin') return 'dashboards';
  if (item.href.startsWith('/admin/app-config')) return 'settings';
  // modules (icon: 'package') and all other apps both go under 'apps'
  return 'apps';
}

export default function SectionAdminNavTemplate({
  data,
  className,
  children
}: TemplateProps<AdminNavTemplateData>) {
  const pathname = usePathname();

  // Filter out Logs — it lives in App Config instead
  const navItems = (
    Array.isArray(data?.navItems) ? data.navItems.filter(isTemplateNavItem) : []
  ).filter((item) => item.href !== '/admin/logs');

  const activeParentItemKeys = useMemo(
    () =>
      new Set(
        navItems
          .filter((item) => {
            const childrenItems = Array.isArray(item.children)
              ? item.children.filter(isTemplateNavChildItem)
              : [];
            if (!childrenItems.length) return false;
            return isNavItemActive(pathname, item);
          })
          .map((item) => item.href)
      ),
    [navItems, pathname]
  );

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!activeParentItemKeys.size) return;
    setExpandedItems((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const href of activeParentItemKeys) {
        if (!(href in next)) {
          next[href] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [activeParentItemKeys]);

  if (navItems.length === 0) {
    return <>{children ?? null}</>;
  }

  const groupedItems: Record<NavGroupKey, TemplateNavItem[]> = {
    dashboards: [],
    apps: [],
    settings: []
  };

  for (const item of navItems) {
    groupedItems[resolveNavGroup(item)].push(item);
  }

  function renderItem(item: TemplateNavItem) {
    const Icon = iconMap[item.icon ?? ''] ?? Package;
    const isActive = isNavItemActive(pathname, item);
    const childrenItems = Array.isArray(item.children)
      ? item.children.filter(isTemplateNavChildItem)
      : [];
    const hasChildren = childrenItems.length > 0;
    const isExpanded =
      hasChildren && (expandedItems[item.href] ?? activeParentItemKeys.has(item.href));

    return (
      <div key={item.href} className="space-y-0.5">
        <div
          className={mergeClassNames(
            'group flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-sm transition-colors',
            isActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground/85 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground'
          )}
        >
          <Link
            href={item.href}
            prefetch={false}
            aria-current={isActive ? 'page' : undefined}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-0.5 py-1.5"
          >
            <span
              className={mergeClassNames(
                'flex size-7 items-center justify-center rounded-md border',
                isActive
                  ? 'border-sidebar-primary/30 bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'border-sidebar-border bg-sidebar text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[15px] font-medium leading-tight">
              {item.label}
            </span>
          </Link>

          {hasChildren ? (
            <button
              type="button"
              className={mergeClassNames(
                'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-sidebar/80',
                isExpanded ? 'text-sidebar-accent-foreground' : 'text-muted-foreground'
              )}
              onClick={() => {
                setExpandedItems((prev) => ({
                  ...prev,
                  [item.href]: !isExpanded
                }));
              }}
              aria-label={isExpanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
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
          <div className="ml-9 space-y-0.5 border-l border-sidebar-border/80 pl-2">
            {childrenItems.map((child) => {
              const isChildActive = isChildItemActive(pathname, child);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  prefetch={false}
                  aria-current={isChildActive ? 'page' : undefined}
                  className={mergeClassNames(
                    'flex items-center gap-2 rounded-md px-1.5 py-1 text-[13px] transition-colors',
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
      data-nexus-admin-nav="true"
    >
      {/* Scrollable main nav */}
      <div className="nexus-admin-nav-scroll min-h-0 flex-1 space-y-2 overflow-y-auto p-2 pr-1.5">
        {NAV_GROUP_ORDER.map((groupKey) => {
          const items = groupedItems[groupKey];
          if (!items.length) return null;
          return (
            <section key={groupKey} className="space-y-0.5">
              <p className="px-2 pt-1 pb-1 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                {NAV_GROUP_LABEL[groupKey]}
              </p>
              <div className="space-y-0.5">{items.map(renderItem)}</div>
            </section>
          );
        })}
      </div>

      {/* App Config — always pinned at bottom */}
      {groupedItems['settings'].length > 0 && (
        <div className="shrink-0 border-t border-sidebar-border/70 p-2 space-y-0.5">
          {groupedItems['settings'].map(renderItem)}
        </div>
      )}

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
