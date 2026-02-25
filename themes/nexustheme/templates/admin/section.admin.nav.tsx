'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
    >
      <div className="border-b border-sidebar-border p-2.5">
        <Link
          href="/admin"
          prefetch={false}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-sidebar-accent/70"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <LayoutDashboard className="h-4 w-4" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold">SkitSaaS</p>
            <p className="truncate text-[11px] text-muted-foreground">Admin Dashboard</p>
          </div>
        </Link>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-2">
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

                  return (
                    <div key={item.href} className="space-y-1">
                      <Link
                        href={item.href}
                        prefetch={false}
                        aria-current={isActive ? 'page' : undefined}
                        className={mergeClassNames(
                          'group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground/85 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground'
                        )}
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
                        <ChevronRight
                          className={mergeClassNames(
                            'h-4 w-4 transition-opacity',
                            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          )}
                        />
                      </Link>

                      {childrenItems.length ? (
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
    </nav>
  );
}
