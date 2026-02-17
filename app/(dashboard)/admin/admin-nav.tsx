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

export function AdminNav({
  className,
  variant = 'basic',
  mode = 'compact',
  moduleItems = []
}: AdminNavProps) {
  const messages = useAreaMessages('admin');
  const pathname = usePathname();
  const coreItems = [
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
      href: '/admin/suscriptions',
      icon: LayoutTemplate,
      label: messages.nav.subscriptions
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
    },
    {
      href: '/admin/app-config',
      icon: Settings2,
      label: messages.nav.appConfig
    }
  ];
  const navItems = [
    ...coreItems,
    ...moduleItems.map((item) => ({
      ...item,
      icon: Package
    }))
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
          const isLegacySubscriptionPath =
            item.href === '/admin/suscriptions' &&
            (pathname === '/admin/subscriptions' ||
              pathname.startsWith('/admin/subscriptions/'));
          const isExact = item.exact ?? false;
          const isActive = isExact
            ? pathname === item.href
            : pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              isLegacySubscriptionPath;

          return (
            <Link
              key={item.href}
              href={item.href}
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
                  isPro
                    ? 'text-slate-500'
                    : 'text-muted-foreground/70',
                  isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                )}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
