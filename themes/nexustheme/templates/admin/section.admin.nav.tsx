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
  'settings-2': Settings2
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
  const variant = data?.variant === 'pro' ? 'pro' : 'basic';
  const isPro = variant === 'pro';
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
        'flex h-full min-h-0 flex-col rounded-xl border p-2.5',
        isPro
          ? 'border-zinc-800 bg-zinc-950/70 text-zinc-100'
          : 'border-border/70 bg-card/70 text-foreground',
        className
      )}
    >
      <Link
        href="/admin"
        className={mergeClassNames(
          'mb-3 flex items-center gap-3 rounded-lg border px-2.5 py-2',
          isPro
            ? 'border-zinc-700 bg-zinc-900/80'
            : 'border-border/70 bg-background/80'
        )}
      >
        <span
          className={mergeClassNames(
            'flex size-8 items-center justify-center rounded-md border',
            isPro
              ? 'border-zinc-600 bg-zinc-800 text-zinc-100'
              : 'border-border bg-background text-foreground'
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">SkitSaaS</p>
          <p
            className={mergeClassNames(
              'truncate text-xs',
              isPro ? 'text-zinc-400' : 'text-muted-foreground'
            )}
          >
            Admin Dashboard
          </p>
        </div>
      </Link>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {NAV_GROUP_ORDER.map((groupKey) => {
          const items = groupedItems[groupKey];
          if (!items.length) {
            return null;
          }

          return (
            <section key={groupKey} className="space-y-1.5">
              <p
                className={mergeClassNames(
                  'px-2 text-[11px] font-semibold tracking-[0.14em] uppercase',
                  isPro ? 'text-zinc-500' : 'text-muted-foreground'
                )}
              >
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
                        aria-current={isActive ? 'page' : undefined}
                        className={mergeClassNames(
                          'group flex items-center gap-2.5 rounded-lg border px-2.5 py-2.5 text-sm transition-colors',
                          isActive
                            ? isPro
                              ? 'border-zinc-600 bg-zinc-800 text-zinc-50'
                              : 'border-border bg-accent/80 text-foreground'
                            : isPro
                              ? 'border-transparent text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/70 hover:text-zinc-50'
                              : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent/60 hover:text-foreground'
                        )}
                      >
                        <span
                          className={mergeClassNames(
                            'flex size-8 items-center justify-center rounded-md border',
                            isActive
                              ? isPro
                                ? 'border-zinc-500 bg-zinc-700 text-zinc-50'
                                : 'border-border bg-background text-foreground'
                              : isPro
                                ? 'border-zinc-700 bg-zinc-900/80 text-zinc-400 group-hover:text-zinc-100'
                                : 'border-border/70 bg-background text-muted-foreground group-hover:text-foreground'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                        <ChevronRight
                          className={mergeClassNames(
                            'h-4 w-4 transition-opacity',
                            isPro ? 'text-zinc-500' : 'text-muted-foreground',
                            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          )}
                        />
                      </Link>

                      {childrenItems.length ? (
                        <div className="ml-11 space-y-1">
                          {childrenItems.map((child) => {
                            const isChildActive = isChildItemActive(pathname, child);
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                aria-current={isChildActive ? 'page' : undefined}
                                className={mergeClassNames(
                                  'group/sub flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors',
                                  isChildActive
                                    ? isPro
                                      ? 'border-zinc-600 bg-zinc-800 text-zinc-100'
                                      : 'border-border bg-accent/70 text-foreground'
                                    : isPro
                                      ? 'border-transparent text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/70 hover:text-zinc-100'
                                      : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent/50 hover:text-foreground'
                                )}
                              >
                                <span
                                  className={mergeClassNames(
                                    'h-1.5 w-1.5 rounded-full',
                                    isChildActive
                                      ? isPro
                                        ? 'bg-zinc-200'
                                        : 'bg-foreground'
                                      : isPro
                                        ? 'bg-zinc-500 group-hover/sub:bg-zinc-300'
                                        : 'bg-muted-foreground group-hover/sub:bg-foreground/80'
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
