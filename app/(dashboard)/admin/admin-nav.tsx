'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronRight,
  FileText,
  LayoutDashboard,
  LayoutTemplate,
  Package,
  ShoppingCart,
  ReceiptText,
  Settings2,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAreaMessages } from '@/lib/i18n/client';
import type { PrivateLayoutMode } from '@/lib/layout/private-area';

type AdminNavProps = {
  className?: string;
  variant?: 'basic' | 'pro';
  mode?: PrivateLayoutMode;
  moduleItems?: Array<{
    href: string;
    label: string;
    exact?: boolean;
  }>;
};

type AdminNavChildItem = {
  href: string;
  label: string;
  exact?: boolean;
  matchPrefixes?: string[];
};

type AdminNavItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  exact?: boolean;
  matchPrefixes?: string[];
  children?: AdminNavChildItem[];
};

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

function isChildItemActive(pathname: string, item: AdminNavChildItem) {
  return matchesPath(pathname, item.href, item.exact ?? false, item.matchPrefixes);
}

function isNavItemActive(pathname: string, item: AdminNavItem) {
  if (matchesPath(pathname, item.href, item.exact ?? false, item.matchPrefixes)) {
    return true;
  }

  return item.children?.some((child) => isChildItemActive(pathname, child)) ?? false;
}

export function AdminNav({
  className,
  variant = 'basic',
  mode = 'compact',
  moduleItems = []
}: AdminNavProps) {
  const messages = useAreaMessages('admin');
  const pathname = usePathname();
  const coreItems: AdminNavItem[] = [
    {
      href: '/admin',
      icon: LayoutDashboard,
      label: messages.layout.title,
      exact: true
    },
    {
      href: '/admin/users',
      icon: Users,
      label: messages.nav.users
    },
    {
      href: '/admin/subscriptions',
      icon: LayoutTemplate,
      label: messages.nav.subscriptions,
      matchPrefixes: ['/admin/subscriptions', '/admin/suscriptions'],
      children: [
        {
          href: '/admin/subscriptions',
          label: messages.subscriptionsPage.subscriptionsTitle
        },
        {
          href: '/admin/subscriptions/templates',
          label: messages.subscriptionsPage.templatesTitle
        }
      ]
    },
    {
      href: '/admin/payments',
      icon: ReceiptText,
      label: messages.nav.payments
    },
    {
      href: '/admin/orders',
      icon: ShoppingCart,
      label: messages.nav.orders
    },
    {
      href: '/admin/logs',
      icon: FileText,
      label: messages.nav.logs
    }
  ];
  const appConfigItem: AdminNavItem = {
    href: '/admin/app-config',
    icon: Settings2,
    label: messages.nav.appConfig
  };
  const navItems: AdminNavItem[] = [
    ...coreItems,
    ...moduleItems.map((item) => ({
      ...item,
      icon: Package
    })),
    appConfigItem
  ];
  const isPro = variant === 'pro';
  const itemPadding = mode === 'adjusted' ? 'px-3.5 py-3.5' : 'px-3 py-3';
  const iconSize = mode === 'adjusted' ? 'h-8 w-8' : 'h-7 w-7';

  return (
    <nav
      className={cn(
        isPro
          ? 'rounded-2xl border border-slate-800/80 bg-slate-950/75 p-2 shadow-xl backdrop-blur-sm'
          : 'rounded-2xl border border-border/70 bg-card/85 p-2 shadow-sm backdrop-blur-sm',
        className
      )}
    >
      <div className="space-y-1">
        {navItems.map((item) => {
          const isActive = isNavItemActive(pathname, item);

          return (
            <div key={item.href} className="space-y-1">
              <Link
                href={item.href}
                prefetch={false}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group flex items-center gap-3 rounded-xl border text-sm transition-colors',
                  itemPadding,
                  isActive
                    ? isPro
                      ? 'border-blue-400/30 bg-blue-500/15 text-slate-50 shadow-sm'
                      : 'border-primary/25 bg-primary/10 text-foreground shadow-sm'
                    : isPro
                      ? 'border-transparent text-slate-300/90 hover:border-slate-700 hover:bg-slate-800/70 hover:text-white'
                      : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent/70 hover:text-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex items-center justify-center rounded-md border',
                    iconSize,
                    isActive
                      ? isPro
                        ? 'border-blue-300/35 bg-blue-500/20 text-blue-100'
                        : 'border-primary/25 bg-background text-primary'
                      : isPro
                        ? 'border-slate-700 bg-slate-900/80 text-slate-400 group-hover:border-slate-500 group-hover:text-slate-100'
                        : 'border-border/60 bg-background/80 text-muted-foreground group-hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="flex-1 font-medium">{item.label}</span>
                <ChevronRight
                  className={cn(
                    'h-4 w-4 transition-opacity',
                    isPro ? 'text-slate-500' : 'text-muted-foreground/70',
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  )}
                />
              </Link>

              {item.children?.length ? (
                <div className="space-y-1 pl-11">
                  {item.children.map((child) => {
                    const isChildActive = isChildItemActive(pathname, child);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        prefetch={false}
                        aria-current={isChildActive ? 'page' : undefined}
                        className={cn(
                          'group/sub flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors',
                          isChildActive
                            ? isPro
                              ? 'border-blue-400/25 bg-blue-500/12 text-slate-100'
                              : 'border-primary/20 bg-primary/10 text-foreground'
                            : isPro
                              ? 'border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-800/60 hover:text-slate-100'
                              : 'border-transparent text-muted-foreground hover:border-border/80 hover:bg-accent/50 hover:text-foreground'
                        )}
                      >
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            isChildActive
                              ? isPro
                                ? 'bg-blue-200'
                                : 'bg-primary'
                              : isPro
                                ? 'bg-slate-500 group-hover/sub:bg-slate-300'
                                : 'bg-muted-foreground/60 group-hover/sub:bg-foreground/80'
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
    </nav>
  );
}
